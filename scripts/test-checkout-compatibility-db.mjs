import assert from "node:assert/strict";
import { before, beforeEach, after, test, mock } from "node:test";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { prisma, PrismaClient } from "@dg/database";
import { admitPlatformCheckout, CheckoutTemporarilyUnavailable } from "../packages/platform-core/src/billing/checkout-creation-gate.ts";
import { createPlatformCheckoutSession, createCustomCommercialCheckoutSession, createNegotiatedCommercialCheckoutSession } from "../packages/platform-core/src/billing/platform-checkout.ts";
import { provisionFromPlatformCheckout } from "../packages/platform-core/src/billing/platform-stripe.ts";
import { checkoutPost } from "./checkout-test-http.mjs";

const control = new PrismaClient();
let org, requests, createWait, loseResponse, beforeAcceptance, remainingAtAcceptance, acceptedSessions;
const waitFor = async predicate => {
  const deadline = Date.now() + 2000;
  while (!predicate()) { if (Date.now() > deadline) throw new Error("Provider fixture did not reach expected state"); await new Promise(r => setTimeout(r, 5)); }
};
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const standard = () => createPlatformCheckoutSession({ organisationId: org.id, email: "fixture@example.test", platformTier: "professional" });
const offer = { version: 1, id: "fixture", label: "Fixture", status: "agreed", currency: "aud", amountCents: 24900, cadence: "monthly", platformTier: "professional", industryApps: [], industryTemplates: [], premiumApps: [], trialDays: 14 };
const custom = () => createCustomCommercialCheckoutSession({ organisationId: org.id, email: "fixture@example.test", offer });
const close = () => control.$executeRaw`UPDATE platform_checkout_creation_gate SET blocked = true, revision = revision + 1, changed_at = clock_timestamp() WHERE id = 1`;
before(async () => {
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname, "127.0.0.1"); assert.notEqual(url.port, "5432"); assert.equal(url.pathname, "/dg_checkout_test");
  const [row] = await prisma.$queryRaw`SELECT current_setting('dg.checkout_test_cluster') AS nonce`;
  assert.ok(process.env.DG_CHECKOUT_DB_MARKER); assert.equal(row.nonce, process.env.DG_CHECKOUT_DB_MARKER);
  const [gate] = await prisma.$queryRaw`SELECT blocked FROM platform_checkout_creation_gate WHERE id = 1`;
  assert.equal(gate.blocked, true, "migration must seed closed");
  org = await prisma.organisation.create({ data: { name: "Compatibility fixture", slug: `compat-${randomUUID()}` } });
  process.env.STRIPE_SECRET_KEY = "sk_test_no_network_allowed";
  const sdk = new Stripe(process.env.STRIPE_SECRET_KEY);
  mock.method(Object.getPrototypeOf(sdk.accounts), "retrieve", async () => ({ id: "acct_fixture" }));
  mock.method(Object.getPrototypeOf(sdk.balance), "retrieve", async () => ({ livemode: false }));
  mock.method(Object.getPrototypeOf(sdk.subscriptions), "list", () => ({ async *[Symbol.asyncIterator]() {} }));
  mock.method(Object.getPrototypeOf(sdk.checkout.sessions), "retrieve", async id => {
    const session = acceptedSessions.find(s => s.id === id);
    if (!session) throw new Error("Unexpected session lookup");
    return structuredClone(session);
  });
  mock.method(Object.getPrototypeOf(sdk.checkout.sessions), "create", async (parameters, options) => {
    requests.push(structuredClone(parameters));
    assert.equal(options.maxNetworkRetries, 0);
    assert.match(options.idempotencyKey, /^platform-checkout-/);
    if (beforeAcceptance) await beforeAcceptance(parameters);
    // Provider acceptance time is independent of local time / response delivery.
    const providerNow = parameters.expires_at - remainingAtAcceptance;
    if (parameters.expires_at < providerNow + 1800) throw new Stripe.errors.StripeInvalidRequestError({
      message: "RAW_STRIPE_EXPIRY_ERROR", statusCode: 400, param: "expires_at",
    });
    const accepted = { id: `cs_fixture_${randomUUID()}`, mode: "subscription", status: "open", metadata: parameters.metadata, url: "https://checkout.example.test", expires_at: parameters.expires_at };
    acceptedSessions.push(accepted);
    if (createWait) await createWait.promise;
    if (loseResponse) throw new Error("Simulated response lost after provider accepted request");
    return accepted;
  });
  // Any unexpected provider read fails locally rather than touching the network.
  mock.method(Object.getPrototypeOf(sdk.customers), "retrieve", async () => { throw new Error("Unexpected customer read"); });
  mock.method(Object.getPrototypeOf(sdk.subscriptions), "retrieve", async () => { throw new Error("Unexpected subscription read"); });
});
beforeEach(async () => {
  await prisma.platformCheckoutAttempt.deleteMany();
  await prisma.platformSubscription.deleteMany();
  await prisma.organisation.update({ where: { id: org.id }, data: { billingCustomerId: null, settings: {} } });
  requests = []; createWait = null; loseResponse = false; beforeAcceptance = null;
  remainingAtAcceptance = 2100; acceptedSessions = [];
  await control.$executeRaw`UPDATE platform_checkout_creation_gate SET blocked = false, revision = revision + 1, changed_at = clock_timestamp(), last_admission_expires_at = NULL WHERE id = 1`;
});
after(async () => { mock.restoreAll(); await prisma.$disconnect(); await control.$disconnect(); });

test("open gate persists absolute expiry before returning admission", async () => {
  const admission = await admitPlatformCheckout();
  const [row] = await control.$queryRaw`SELECT EXTRACT(EPOCH FROM last_admission_expires_at)::bigint AS expires, EXTRACT(EPOCH FROM clock_timestamp())::bigint AS now FROM platform_checkout_creation_gate`;
  assert.equal(admission.expiresAt, Number(row.expires)); assert.ok(Number(row.expires - row.now) >= 2090); assert.ok(Number(row.expires - row.now) <= 2100);
});
for (const [label, entry] of [["standard billing / onboarding", standard], ["custom offer", custom], ["legacy custom alias", () => createNegotiatedCommercialCheckoutSession({ organisationId: org.id, email: "fixture@example.test", offer })]]) {
  test(`${label}: closed gate denies direct invocation before create`, async () => {
    await close(); await assert.rejects(entry(), CheckoutTemporarilyUnavailable); assert.equal(requests.length, 0);
  });
  test(`${label}: open gate sends the durable expiry and original commercial terms`, async () => {
    await entry(); assert.equal(requests.length, 1);
    const [row] = await control.$queryRaw`SELECT EXTRACT(EPOCH FROM last_admission_expires_at)::bigint AS expires FROM platform_checkout_creation_gate`;
    assert.equal(requests[0].expires_at, Number(row.expires)); assert.equal(requests[0].mode, "subscription");
    assert.equal(requests[0].subscription_data.trial_period_days, 14);
    assert.equal(requests[0].line_items[0].price_data.unit_amount, 24900);
  });
}
test("missing singleton denies admission", async () => {
  await control.$executeRaw`DELETE FROM platform_checkout_creation_gate WHERE id = 1`;
  try { await assert.rejects(standard(), CheckoutTemporarilyUnavailable); assert.equal(requests.length, 0); }
  finally { await control.$executeRaw`INSERT INTO platform_checkout_creation_gate (id, blocked) VALUES (1, true)`; }
});
test("missing migration/database query failure denies provider create", async () => {
  await control.$executeRaw`ALTER TABLE platform_checkout_creation_gate RENAME TO owned_test_hidden_gate`;
  try { await assert.rejects(custom(), CheckoutTemporarilyUnavailable); assert.equal(requests.length, 0); }
  finally { await control.$executeRaw`ALTER TABLE owned_test_hidden_gate RENAME TO platform_checkout_creation_gate`; }
});
test("concurrent admission and closure serialize across connections", async () => {
  const results = await Promise.allSettled([...Array.from({ length: 12 }, () => admitPlatformCheckout()), close(), ...Array.from({ length: 12 }, () => admitPlatformCheckout())]);
  assert.ok(results.some(r => r.status === "fulfilled"));
  for (const r of results) if (r.status === "rejected") assert.ok(r.reason instanceof CheckoutTemporarilyUnavailable);
  await assert.rejects(admitPlatformCheckout(), CheckoutTemporarilyUnavailable);
  const [row] = await control.$queryRaw`SELECT EXTRACT(EPOCH FROM last_admission_expires_at)::bigint AS expires FROM platform_checkout_creation_gate`;
  for (const r of results) if (r.status === "fulfilled" && r.value?.expiresAt) assert.ok(r.value.expiresAt <= Number(row.expires));
});
test("overlapping compatible instances observe closure; old admitted worker keeps bounded expiry", async () => {
  createWait = deferred(); const started = standard();
  await waitFor(() => requests.length > 0);
  const original = requests[0].expires_at;
  await close(); await assert.rejects(custom(), error => error.code === "checkout_in_progress");
  createWait.resolve(); await started;
  assert.equal(requests.length, 1); assert.equal(requests[0].expires_at, original);
  const [row] = await control.$queryRaw`SELECT EXTRACT(EPOCH FROM last_admission_expires_at)::bigint AS expires FROM platform_checkout_creation_gate`;
  assert.equal(Number(row.expires), original);
});
test("rollback to compatible creator retains closed barrier", async () => {
  await close(); for (const entry of [standard, custom]) await assert.rejects(entry(), CheckoutTemporarilyUnavailable); assert.equal(requests.length, 0);
});
test("singleton check rejects extra state rows", async () => {
  await assert.rejects(control.$executeRaw`INSERT INTO platform_checkout_creation_gate (id) VALUES (2)`);
});
test("read-only report transaction cannot mutate even with privileged test role", async () => {
  await assert.rejects(control.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    await tx.$executeRaw`UPDATE platform_checkout_creation_gate SET blocked = true WHERE id = 1`;
  }));
});
test("existing completed checkout provisions through webhook authority while gate closed", async () => {
  await close();
  const result = await provisionFromPlatformCheckout({ id: "cs_completed_fixture", customer: "cus_completed_fixture", subscription: "sub_completed_fixture",
    customer_email: "fixture@example.test", metadata: { dg_platform_checkout: "true", organisation_id: org.id, dg_platform_tier: "professional" } });
  assert.equal(result.ok, true);
  const canonical = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(canonical.stripeSubscriptionId, "sub_completed_fixture"); assert.equal(canonical.entitlement, "FULL");
  assert.equal(requests.length, 0);
});

test("lost provider response retains committed expiry through closure", async () => {
  loseResponse = true;
  await assert.rejects(custom(), error => error instanceof CheckoutTemporarilyUnavailable && error.outcome === "unknown");
  const sentExpiry = requests[0].expires_at;
  await close();
  const [row] = await control.$queryRaw`SELECT EXTRACT(EPOCH FROM last_admission_expires_at)::bigint AS expires FROM platform_checkout_creation_gate`;
  assert.equal(Number(row.expires), sentExpiry);
  await assert.rejects(custom(), CheckoutTemporarilyUnavailable); assert.equal(requests.length, 1);
});

const horizon = async () => {
  const [row] = await control.$queryRaw`SELECT EXTRACT(EPOCH FROM last_admission_expires_at)::bigint AS expires FROM platform_checkout_creation_gate WHERE id = 1`;
  return Number(row.expires);
};
for (const [label, entry, route] of [["standard billing", standard, "billing"], ["custom-offer onboarding", custom, "custom"]]) {
  for (const [boundary, remaining, valid] of [
    ["valid window", 2100, true], ["immediately before minimum", 1801, true],
    ["at minimum", 1800, true], ["after minimum", 1799, false],
  ]) {
    test(`${label}: ${boundary} uses original committed expiry without duplicate creation`, async () => {
      remainingAtAcceptance = remaining;
      let committed;
      beforeAcceptance = async parameters => {
        committed = await horizon(); assert.equal(parameters.expires_at, committed);
      };
      const response = await checkoutPost(route, entry)();
      assert.equal(response.status, valid ? 200 : 503);
      const body = await response.json();
      if (!valid) {
        assert.equal(body.error.code, "checkout_temporarily_unavailable");
        assert.equal(response.headers.get("Retry-After"), "60");
        assert.ok(!JSON.stringify(body).includes("RAW_STRIPE"));
      }
      assert.equal(requests.length, 1); assert.equal(acceptedSessions.length, valid ? 1 : 0);
      assert.equal(await horizon(), committed); assert.equal(requests[0].expires_at, committed);
    });
  }
  test(`${label}: closure before delayed acceptance rejects safely without extending drain`, async () => {
    remainingAtAcceptance = 1799;
    let committed;
    beforeAcceptance = async () => { committed = await horizon(); await close(); };
    const response = await checkoutPost(route, entry)();
    assert.equal(response.status, 503); assert.equal(response.headers.get("Retry-After"), "60");
    assert.equal((await response.json()).error.code, "checkout_temporarily_unavailable");
    await assert.rejects(entry(), error => error.outcome === "gate_denied");
    assert.equal(requests.length, 1); assert.equal(acceptedSessions.length, 0);
    assert.equal(await horizon(), committed);
  });
  test(`${label}: accepted session survives closure and delayed response beyond minimum`, async () => {
    createWait = deferred();
    const started = entry();
    await waitFor(() => acceptedSessions.length > 0);
    const accepted = structuredClone(acceptedSessions[0]);
    await close(); remainingAtAcceptance = 0; createWait.resolve();
    assert.equal((await started).sessionId, accepted.id);
    assert.equal((await entry()).sessionId, accepted.id);
    assert.deepEqual(acceptedSessions, [accepted]); assert.equal(requests.length, 1);
    assert.equal(await horizon(), accepted.expires_at);
  });
  test(`${label}: lost response is uncertain, never resubmitted, accepted expiry retained`, async () => {
    loseResponse = true;
    const response = await checkoutPost(route, entry)();
    assert.equal(response.status, 503); assert.equal(response.headers.get("Retry-After"), null);
    const body = await response.json();
    assert.equal(body.error.code, "checkout_outcome_unknown"); assert.ok(!JSON.stringify(body).includes("Simulated"));
    assert.equal(acceptedSessions.length, 1);
    const accepted = structuredClone(acceptedSessions[0]);
    await close(); await assert.rejects(entry(), error => error.outcome === "gate_denied");
    assert.equal(requests.length, 1); assert.deepEqual(acceptedSessions, [accepted]);
    assert.equal(await horizon(), accepted.expires_at);
  });
}
