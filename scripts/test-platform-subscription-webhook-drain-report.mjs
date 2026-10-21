import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GUARDED_PLATFORM_BILLING_EVENT_TYPES,
  readPlatformSubscriptionWebhookDrain,
} from "./report-platform-subscription-webhook-drain.mjs";

const now = Date.parse("2026-10-19T12:00:00.000Z");
const active = (eventId = "evt_active") => ({
  eventId,
  eventType: "subscription.updated",
  status: "processing",
  attempts: 1,
  claimedAt: new Date(now - 30_000),
});
const legacy = (eventId = "evt_legacy") => ({
  eventId,
  eventType: "subscription.created",
  status: "processing",
  attempts: 1,
  claimedAt: null,
});
const failed = (eventId = "evt_failed") => ({
  eventId,
  eventType: "subscription.cancelled",
  status: "failed",
  attempts: 2,
  claimedAt: new Date(now - 60_000),
});

function fakeDatabase(receipts, gate = { subscriptionWebhooksHeld: true, revision: 8 }) {
  const calls = [];
  const db = {
    platformCheckoutCreationGate: {
      async findUnique(args) { calls.push(["gate.read", args]); return gate; },
      async update() { throw new Error("drain report must not update the gate"); },
    },
    stripeWebhookReceipt: {
      async findMany(args) { calls.push(["receipts.read", args]); return receipts; },
      async update() { throw new Error("drain report must not update receipts"); },
      async deleteMany() { throw new Error("drain report must not delete receipts"); },
    },
  };
  return { db, calls };
}

test("old active processing receipts remain unresolved until an operator confirms termination", async () => {
  const oldClaim = active();
  oldClaim.claimedAt = new Date(now - 30 * 60 * 1000);
  const { db } = fakeDatabase([oldClaim]);
  const report = await readPlatformSubscriptionWebhookDrain(db, now);
  assert.equal(report.activeProcessingCount, 1);
  assert.equal(report.activeProcessing[0].state, "stale_candidate_requires_operator_resolution");
  assert.equal(report.drained, false);
});

test("legacy null-claimedAt receipts remain visible but are not counted as active handlers", async () => {
  const { db } = fakeDatabase([legacy()]);
  const report = await readPlatformSubscriptionWebhookDrain(db, now);
  assert.equal(report.legacyCompletedCount, 1);
  assert.equal(report.legacyCompleted[0].eventId, "evt_legacy");
  assert.equal(report.legacyCompleted[0].classification, "legacy_post_handler_receipt");
  assert.equal(report.activeProcessingCount, 0);
  assert.equal(report.drained, true);
});

test("mixed active and legacy receipts keep only the claimed handler in the drain count", async () => {
  const { db } = fakeDatabase([active(), legacy()]);
  const report = await readPlatformSubscriptionWebhookDrain(db, now);
  assert.equal(report.activeProcessingCount, 1);
  assert.equal(report.legacyCompletedCount, 1);
  assert.equal(report.drained, false);
});

test("failed receipts remain visible and require recovery tracking", async () => {
  const { db } = fakeDatabase([failed()]);
  const report = await readPlatformSubscriptionWebhookDrain(db, now);
  assert.equal(report.failedCount, 1);
  assert.equal(report.failed[0].eventId, "evt_failed");
  assert.equal(report.recoveryRequired, true);
  assert.equal(report.drained, true);
});

test("missing or inactive hold refuses the report before reading receipts", async () => {
  for (const gate of [null, { subscriptionWebhooksHeld: false, revision: 9 }]) {
    const { db, calls } = fakeDatabase([], gate);
    await assert.rejects(readPlatformSubscriptionWebhookDrain(db, now), /hold is not active/);
    assert.deepEqual(calls.map(([name]) => name), ["gate.read"]);
  }
});

test("report execution only reads database state and never mutates records", async () => {
  const { db, calls } = fakeDatabase([active(), legacy(), failed()]);
  await readPlatformSubscriptionWebhookDrain(db, now);
  assert.deepEqual(calls.map(([name]) => name), ["gate.read", "receipts.read"]);
});

test("drain query includes every held platform billing event receipt type", async () => {
  const { db, calls } = fakeDatabase([]);
  await readPlatformSubscriptionWebhookDrain(db, now);
  const receiptQuery = calls[1][1];
  assert.deepEqual(receiptQuery.where.eventType.in, GUARDED_PLATFORM_BILLING_EVENT_TYPES);
  assert.deepEqual(GUARDED_PLATFORM_BILLING_EVENT_TYPES, [
    "subscription.created",
    "subscription.updated",
    "subscription.cancelled",
    "checkout.completed",
    "invoice.payment_failed",
    "invoice.payment_action_required",
    "invoice.paid",
  ]);
});
