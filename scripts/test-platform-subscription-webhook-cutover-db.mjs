import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { prisma } from "@dg/database";
import { prismaReceiptStore, STALE_CLAIM_MS, withWebhookReceiptState } from "../packages/platform-core/src/billing/webhook-receipt-state.ts";
import { readPlatformSubscriptionWebhookDrain } from "./report-platform-subscription-webhook-drain.mjs";

const control = prisma;
const eventPrefix = "evt_guard_only_";
const guardedReceiptTypes = [
  "subscription.created",
  "subscription.updated",
  "subscription.cancelled",
  "checkout.completed",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.paid",
];

before(async () => {
  await control.stripeWebhookReceipt.deleteMany({ where: { eventId: { startsWith: eventPrefix } } });
  await control.platformCheckoutCreationGate.upsert({
    where: { id: 1 }, create: { id: 1, blocked: true, subscriptionWebhooksHeld: false },
    update: { subscriptionWebhooksHeld: false },
  });
});

after(async () => {
  await control.$executeRaw`DROP TRIGGER IF EXISTS dg_guard_pause_receipt_insert ON stripe_webhook_receipts`;
  await control.$executeRaw`DROP FUNCTION IF EXISTS dg_guard_pause_receipt_insert()`;
  await control.stripeWebhookReceipt.deleteMany({ where: { eventId: { startsWith: eventPrefix } } });
  await control.platformCheckoutCreationGate.update({ where: { id: 1 }, data: { subscriptionWebhooksHeld: false } });
  await control.$disconnect();
});

test("a committed hold prevents receipt insertion", async () => {
  await control.platformCheckoutCreationGate.update({ where: { id: 1 }, data: { subscriptionWebhooksHeld: true } });
  const outcome = await withWebhookReceiptState({
    store: prismaReceiptStore(), eventId: `${eventPrefix}already_held`, eventType: "subscription.updated",
    requireSubscriptionWebhookOpen: true, handle: async () => assert.fail("held handler must not run"),
  });
  assert.deepEqual(outcome, { status: "held" });
  assert.equal(await control.stripeWebhookReceipt.count({ where: { eventId: `${eventPrefix}already_held` } }), 0);
  await control.platformCheckoutCreationGate.update({ where: { id: 1 }, data: { subscriptionWebhooksHeld: false } });
});

test("every guarded receipt class stays unclaimed while held and is idempotent after release", async () => {
  for (const [index, eventType] of guardedReceiptTypes.entries()) {
    const eventId = `${eventPrefix}class_${index}`;
    let handlerCalls = 0;
    await control.platformCheckoutCreationGate.update({ where: { id: 1 }, data: { subscriptionWebhooksHeld: true } });
    const held = await withWebhookReceiptState({
      store: prismaReceiptStore(), eventId, eventType, requireSubscriptionWebhookOpen: true,
      handle: async () => { handlerCalls++; return "must-not-run"; },
    });
    assert.deepEqual(held, { status: "held" }, eventType);
    assert.equal(await control.stripeWebhookReceipt.count({ where: { eventId } }), 0, eventType);
    assert.equal(handlerCalls, 0, eventType);

    await control.platformCheckoutCreationGate.update({ where: { id: 1 }, data: { subscriptionWebhooksHeld: false } });
    const released = await withWebhookReceiptState({
      store: prismaReceiptStore(), eventId, eventType, requireSubscriptionWebhookOpen: true,
      handle: async () => { handlerCalls++; return "processed"; },
    });
    const duplicate = await withWebhookReceiptState({
      store: prismaReceiptStore(), eventId, eventType, requireSubscriptionWebhookOpen: true,
      handle: async () => { handlerCalls++; return "duplicate-must-not-run"; },
    });
    assert.deepEqual(released, { status: "processed", result: "processed" }, eventType);
    assert.deepEqual(duplicate, { status: "duplicate", reason: "already_processed" }, eventType);
    assert.equal(handlerCalls, 1, eventType);
  }
});

test("missing hold state and a failed row lock both fail closed before receipt claim", async () => {
  await control.platformCheckoutCreationGate.deleteMany({ where: { id: 1 } });
  const missing = await withWebhookReceiptState({
    store: prismaReceiptStore(), eventId: `${eventPrefix}missing_gate`, eventType: "subscription.updated",
    requireSubscriptionWebhookOpen: true, handle: async () => assert.fail("missing gate must not run handler"),
  }).catch((error) => error);
  assert.equal(missing.code, "PLATFORM_SUBSCRIPTION_WEBHOOK_HOLD_UNAVAILABLE");
  assert.equal(await control.stripeWebhookReceipt.count({ where: { eventId: `${eventPrefix}missing_gate` } }), 0);
  await control.platformCheckoutCreationGate.create({ data: { id: 1, blocked: true, subscriptionWebhooksHeld: false } });

  let releaseGate;
  let gateUpdated;
  const updated = new Promise((resolve) => { gateUpdated = resolve; });
  const release = new Promise((resolve) => { releaseGate = resolve; });
  const blocker = control.$transaction(async (tx) => {
    await tx.platformCheckoutCreationGate.update({ where: { id: 1 }, data: { revision: { increment: 1 } } });
    gateUpdated();
    await release;
  });
  await updated;
  try {
    const claim = withWebhookReceiptState({
      store: prismaReceiptStore(), eventId: `${eventPrefix}cancelled_lock`, eventType: "subscription.updated",
      requireSubscriptionWebhookOpen: true, handle: async () => assert.fail("cancelled lock wait must not run handler"),
    }).catch((error) => error);
    const pid = await waitForBlockedPid("platform_checkout_creation_gate");
    const cancelled = await control.$queryRaw`SELECT pg_cancel_backend(${pid}::int) AS cancelled`;
    assert.equal(cancelled[0].cancelled, true);
    const failure = await claim;
    assert.equal(failure.code, "PLATFORM_SUBSCRIPTION_WEBHOOK_HOLD_UNAVAILABLE");
    assert.equal(await control.stripeWebhookReceipt.count({ where: { eventId: `${eventPrefix}cancelled_lock` } }), 0);
  } finally {
    releaseGate();
    await blocker;
    await control.platformCheckoutCreationGate.update({ where: { id: 1 }, data: { subscriptionWebhooksHeld: false } });
  }
});

test("claim lock and hold activation serialize, while handler runs outside the transaction", async () => {
  const eventId = `${eventPrefix}claim_then_activation`;
  const advisoryKey = 91001919;
  let releaseAdvisory;
  let advisoryAcquired;
  const acquired = new Promise((resolve) => { advisoryAcquired = resolve; });
  const release = new Promise((resolve) => { releaseAdvisory = resolve; });
  let handlerStarted;
  const started = new Promise((resolve) => { handlerStarted = resolve; });
  let finishHandler;
  const handlerWait = new Promise((resolve) => { finishHandler = resolve; });
  let blocker;
  let activation;
  let claim;

  await control.$executeRaw`CREATE OR REPLACE FUNCTION dg_guard_pause_receipt_insert() RETURNS trigger
    LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.event_id = 'evt_guard_only_claim_then_activation' THEN PERFORM pg_advisory_xact_lock(91001919); END IF;
      RETURN NEW;
    END $$`;
  await control.$executeRaw`CREATE TRIGGER dg_guard_pause_receipt_insert BEFORE INSERT ON stripe_webhook_receipts
    FOR EACH ROW EXECUTE FUNCTION dg_guard_pause_receipt_insert()`;

  try {
    blocker = control.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_lock(${advisoryKey}::bigint) IS NULL AS acquired`;
      advisoryAcquired();
      await release;
      await tx.$queryRaw`SELECT pg_advisory_unlock(${advisoryKey}::bigint) IS NULL AS released`;
    });
    await acquired;
    claim = withWebhookReceiptState({
      store: prismaReceiptStore(), eventId, eventType: "subscription.updated", requireSubscriptionWebhookOpen: true,
      handle: async () => { handlerStarted(); await handlerWait; return "done"; },
    });

    await waitForLockWait("INSERT INTO \"stripe_webhook_receipts\"");
    activation = control.platformCheckoutCreationGate.update({
      where: { id: 1 }, data: { subscriptionWebhooksHeld: true },
    }).then((row) => row);
    await waitForLockWait("platform_checkout_creation_gate", true);

    releaseAdvisory();
    await blocker;
    await started;
    await activation;
    assert.equal(await control.stripeWebhookReceipt.count({ where: { eventId, status: "processing" } }), 1);
    const drain = await readPlatformSubscriptionWebhookDrain(control);
    assert.equal(drain.activeProcessingCount, 1);
    assert.equal(drain.drained, false);

    const late = await withWebhookReceiptState({
      store: prismaReceiptStore(), eventId: `${eventPrefix}after_activation`, eventType: "subscription.updated",
      requireSubscriptionWebhookOpen: true, handle: async () => assert.fail("post-activation handler must not run"),
    });
    assert.deepEqual(late, { status: "held" });
    assert.equal(await control.stripeWebhookReceipt.count({ where: { eventId: `${eventPrefix}after_activation` } }), 0);

    finishHandler();
    assert.deepEqual(await claim, { status: "processed", result: "done" });
    const drained = await readPlatformSubscriptionWebhookDrain(control);
    assert.equal(drained.activeProcessingCount, 0);
    assert.equal(drained.drained, true);
  } finally {
    releaseAdvisory?.();
    finishHandler?.();
    await Promise.allSettled([blocker, activation, claim].filter(Boolean));
    await control.$executeRaw`DROP TRIGGER IF EXISTS dg_guard_pause_receipt_insert ON stripe_webhook_receipts`;
    await control.$executeRaw`DROP FUNCTION IF EXISTS dg_guard_pause_receipt_insert()`;
    await control.platformCheckoutCreationGate.update({ where: { id: 1 }, data: { subscriptionWebhooksHeld: false } });
  }
});

test("hold is shared across separate claim calls and duplicate delivery stays idempotent", async () => {
  const storeA = prismaReceiptStore();
  const storeB = prismaReceiptStore();
  const eventId = `${eventPrefix}duplicate`;
  let calls = 0;
  const first = await withWebhookReceiptState({
    store: storeA, eventId, eventType: "subscription.updated", requireSubscriptionWebhookOpen: true,
    handle: async () => { calls++; return "processed"; },
  });
  const duplicate = await withWebhookReceiptState({
    store: storeB, eventId, eventType: "subscription.updated", requireSubscriptionWebhookOpen: true,
    handle: async () => { calls++; return "must-not-run"; },
  });
  assert.deepEqual(first, { status: "processed", result: "processed" });
  assert.deepEqual(duplicate, { status: "duplicate", reason: "already_processed" });
  assert.equal(calls, 1);
});

test("stale claims are not reclaimed while held and recover once after release", async () => {
  const eventId = `${eventPrefix}stale`;
  await control.stripeWebhookReceipt.create({ data: {
    eventId, eventType: "subscription.updated", status: "processing", attempts: 1,
    claimedAt: new Date(Date.now() - STALE_CLAIM_MS - 60_000),
  } });
  await control.platformCheckoutCreationGate.update({ where: { id: 1 }, data: { subscriptionWebhooksHeld: true } });
  const held = await withWebhookReceiptState({
    store: prismaReceiptStore(), eventId, eventType: "subscription.updated", requireSubscriptionWebhookOpen: true,
    handle: async () => assert.fail("held stale claim must not recover"),
  });
  assert.deepEqual(held, { status: "held" });
  assert.equal((await control.stripeWebhookReceipt.findUnique({ where: { eventId } })).attempts, 1);
  await control.platformCheckoutCreationGate.update({ where: { id: 1 }, data: { subscriptionWebhooksHeld: false } });

  let calls = 0;
  const recovered = await withWebhookReceiptState({
    store: prismaReceiptStore(), eventId, eventType: "subscription.updated", requireSubscriptionWebhookOpen: true,
    handle: async () => { calls++; return "recovered"; },
  });
  assert.deepEqual(recovered, { status: "processed", result: "recovered" });
  assert.equal(calls, 1);
  assert.equal((await control.stripeWebhookReceipt.findUnique({ where: { eventId } })).attempts, 2);
});

async function waitForLockWait(sqlFragment, matchInsert = false) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const rows = await control.$queryRaw`SELECT query FROM pg_stat_activity
      WHERE datname = current_database() AND wait_event_type = 'Lock'
        AND query ILIKE ${`%${sqlFragment}%`}
        AND (${matchInsert} = false OR query ILIKE '%UPDATE%')
      LIMIT 1`;
    if (rows.length) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const waiting = await control.$queryRaw`SELECT wait_event_type, wait_event, query
    FROM pg_stat_activity WHERE datname = current_database() ORDER BY pid`;
  assert.fail(`database did not report the expected lock wait: ${sqlFragment}; activity=${JSON.stringify(waiting)}`);
}

async function waitForBlockedPid(sqlFragment) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const rows = await control.$queryRaw`SELECT pid FROM pg_stat_activity
      WHERE datname = current_database() AND wait_event_type = 'Lock'
        AND query ILIKE ${`%${sqlFragment}%`} AND pid <> pg_backend_pid()
      LIMIT 1`;
    if (rows.length) return rows[0].pid;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail(`database did not report a blocked operation: ${sqlFragment}`);
}
