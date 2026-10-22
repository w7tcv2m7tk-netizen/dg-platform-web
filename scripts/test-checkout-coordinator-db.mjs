import assert from "node:assert/strict";
import { before, beforeEach, after, test } from "node:test";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { prisma, PrismaClient } from "@dg/database";
import { coordinatePlatformCheckout, checkoutPurchaseFingerprint } from "../packages/platform-core/src/billing/checkout-coordinator.ts";

const control = new PrismaClient();
let org, other, remote, clock, calls, keys, requests, subscriptions, failCreate, failRetrieve, failExpire, createGate;
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const parameters = (organisationId = org.id, extra = {}) => ({
  mode: "subscription", customer_email: "necessary-for-checkout@example.test",
  success_url: "https://example.test/onboarding?checkout=success", cancel_url: "https://example.test/onboarding?checkout=cancelled",
  payment_method_collection: "always",
  metadata: { dg_platform_checkout: "true", organisation_id: organisationId, dg_platform_tier: "professional", dg_industry_apps: "services", contact_email: "private-metadata@example.test", business_name: "Private Business" },
  line_items: [{ quantity: 1, price: "price_growth" }], subscription_data: { trial_period_days: 14 }, ...extra,
});
const stripe = {
  accounts: { retrieve: async () => ({ id: "acct_test" }) }, balance: { retrieve: async () => ({ livemode: false }) },
  subscriptions: {
    retrieve: async id => { if (!subscriptions.has(id)) throw new Error("Unknown subscription"); return subscriptions.get(id); },
    list: ({ customer }) => ({ async *[Symbol.asyncIterator]() { for (const s of subscriptions.values()) if (s.customer === customer) yield s; } }),
  },
  checkout: { sessions: {
    create: async (params, options) => {
      calls++; requests.push(structuredClone(params)); keys.push(options.idempotencyKey);
      if (createGate) await createGate.promise;
      let session = [...remote.values()].find(s => s.key === options.idempotencyKey);
      if (!session) {
        session = { id: `cs_test_${randomUUID()}`, key: options.idempotencyKey, mode: "subscription", metadata: params.metadata,
          status: "open", expires_at: params.expires_at, url: "https://checkout.stripe.test/session" };
        remote.set(session.id, session);
      }
      if (failCreate) throw new Error("Stripe response lost after creation");
      return structuredClone(session);
    },
    retrieve: async id => {
      if (failRetrieve) throw new Error("Stripe retrieval unavailable");
      if (!remote.has(id)) throw new Error("Stripe session missing");
      return structuredClone(remote.get(id));
    },
    expire: async id => {
      if (failExpire) throw new Error("Expiry outcome unknown");
      const session = remote.get(id);
      if (session.status === "open") session.status = "expired";
      return structuredClone(session);
    },
  } },
};
const checkout = (extra = {}) => coordinatePlatformCheckout({ organisationId: org.id, stripe, parameters: parameters(), database: prisma, now: () => new Date(clock), ...extra });
const current = () => prisma.platformCheckoutAttempt.findUnique({ where: { currentOrganisationId: org.id } });

before(async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1"); assert.notEqual(url.port, "5432"); assert.ok(url.port);
  assert.equal(url.username, "checkout_test"); assert.equal(url.pathname, "/dg_checkout_test");
  assert.match(process.env.DG_CHECKOUT_DB_MARKER ?? "", /^[0-9a-f-]{36}$/);
  const [identity] = await prisma.$queryRaw`SELECT current_database() AS db, current_setting('dg.checkout_test_cluster', true) AS marker, host(inet_server_addr()) AS host`;
  assert.equal(identity.db, "dg_checkout_test"); assert.equal(identity.marker, process.env.DG_CHECKOUT_DB_MARKER); assert.equal(identity.host, "127.0.0.1");
});
beforeEach(async () => {
  await prisma.$executeRaw`UPDATE platform_checkout_creation_gate SET blocked = false, last_admission_expires_at = NULL WHERE id = 1`;
  await prisma.platformCheckoutAttempt.deleteMany();
  await prisma.platformSubscription.deleteMany();
  await prisma.organisation.deleteMany();
  org = await prisma.organisation.create({ data: { name: "Checkout A", slug: "checkout-a" } });
  other = await prisma.organisation.create({ data: { name: "Checkout B", slug: "checkout-b" } });
  remote = new Map(); subscriptions = new Map(); calls = 0; keys = []; requests = []; clock = Date.now();
  failCreate = false; failRetrieve = false; failExpire = false; createGate = null;
});
after(async () => { await Promise.all([prisma.$disconnect(), control.$disconnect()]); });

test("concurrent callers across independent DB clients create one current attempt/session", async () => {
  createGate = deferred();
  const started = checkout();
  while (!calls) await new Promise(r => setTimeout(r, 5));
  await assert.rejects(checkout({ database: control }), { code: "checkout_in_progress" });
  createGate.resolve();
  const first = await started;
  assert.equal((await checkout()).sessionId, first.sessionId);
  assert.equal(calls, 1); assert.equal(await prisma.platformCheckoutAttempt.count(), 1);
});

test("database uniqueness and owner/release checks cannot be bypassed", async () => {
  await checkout(); const row = await current();
  const clone = { ...row, id: randomUUID(), idempotencyKey: randomUUID(), sessionId: null };
  await assert.rejects(prisma.platformCheckoutAttempt.create({ data: clone }), { code: "P2002" });
  await assert.rejects(prisma.platformCheckoutAttempt.update({ where: { id: row.id }, data: { currentOrganisationId: other.id } }));
  await assert.rejects(prisma.platformCheckoutAttempt.update({ where: { id: row.id }, data: { currentOrganisationId: null } }));
});

test("unknown Stripe outcome replays exactly the persisted body/key after caller changes", async () => {
  failCreate = true; await assert.rejects(checkout(), error => error.outcome === "unknown");
  const pending = await current(); assert.equal(pending.state, "UNCERTAIN"); assert.ok(pending.firstRequestedAt);
  failCreate = false;
  const params = parameters(); params.customer_email = "different-user@example.test"; params.success_url = "https://example.test/apps";
  const result = await checkout({ parameters: params });
  assert.equal(remote.size, 1); assert.equal(result.sessionId, [...remote.values()][0].id);
  assert.deepEqual(requests[0], requests[1]); assert.equal(keys[0], keys[1]);
  assert.equal(pending.requestParameters.metadata.contact_email, undefined);
  assert.equal(pending.requestParameters.metadata.business_name, undefined);
  assert.equal(pending.requestParameters.customer_email, "necessary-for-checkout@example.test");
});

test("crash after Stripe success but before DB session persistence is recovered with same key", async () => {
  await checkout(); const row = await current();
  await prisma.platformCheckoutAttempt.update({ where: { id: row.id }, data: { sessionId: null, state: "UNCERTAIN", leaseToken: "crashed", leaseUntil: new Date(clock + 60_000) } });
  await assert.rejects(checkout(), { code: "checkout_in_progress" });
  clock += 61_000; await checkout();
  assert.equal(calls, 2); assert.equal(remote.size, 1); assert.equal(keys[0], keys[1]);
});

test("lease takeover fences the old worker while replaying its request", async () => {
  createGate = deferred(); const stalled = checkout();
  while (!calls) await new Promise(r => setTimeout(r, 5));
  clock += 61_000;
  const recovery = checkout({ database: control });
  while (calls < 2) await new Promise(r => setTimeout(r, 5));
  const staleResult = assert.rejects(stalled, { code: "checkout_lease_lost" });
  createGate.resolve(); await Promise.all([staleResult, recovery]);
  assert.equal(remote.size, 1); assert.equal(keys[0], keys[1]);
});

test("completed checkout blocks replacement during delayed webhooks and changed purchases", async () => {
  const result = await checkout(); remote.get(result.sessionId).status = "complete";
  await assert.rejects(checkout({ parameters: parameters(org.id, { line_items: [{ price: "price_scale", quantity: 1 }] }) }), { code: "checkout_awaiting_webhook" });
  clock += 48 * 60 * 60_000;
  await assert.rejects(checkout(), { code: "checkout_awaiting_webhook" });
  assert.equal((await current()).state, "AWAITING_WEBHOOK"); assert.equal(calls, 1);
  assert.equal(await prisma.platformSubscription.count(), 0, "coordinator never grants entitlements");
});

test("Stripe-confirmed expired session releases current uniqueness and keeps history", async () => {
  const first = await checkout(); remote.get(first.sessionId).status = "expired";
  const next = await checkout(); assert.notEqual(first.sessionId, next.sessionId);
  assert.equal(await prisma.platformCheckoutAttempt.count(), 2);
  assert.equal(await prisma.platformCheckoutAttempt.count({ where: { currentOrganisationId: org.id } }), 1);
});

async function confirmedCompletedPurchase(session) {
  Object.assign(session, { status: "complete", customer: "cus_confirmed", subscription: "sub_confirmed", livemode: false });
  subscriptions.set("sub_confirmed", { id: "sub_confirmed", customer: "cus_confirmed", status: "canceled", livemode: false,
    metadata: { organisation_id: org.id, dg_platform_subscription: "true" } });
  await prisma.organisation.update({ where: { id: org.id }, data: { billingCustomerId: "cus_confirmed" } });
  const sub = await prisma.platformSubscription.create({ data: { organisationId: org.id, status: "CANCELLED", entitlement: "NONE",
    stripeSubscriptionId: "sub_confirmed", stripeCustomerId: "cus_confirmed", stripeStatus: "canceled" } });
  await prisma.platformSubscriptionEvent.create({ data: { organisationId: org.id, subscriptionId: sub.id,
    type: "checkout.provisioned", source: "stripe", stripeEventId: `${session.id}:checkout` } });
}

test("confirmed completed attempt can retire after provider cancellation and customer can resubscribe", async () => {
  const first = await checkout();
  await confirmedCompletedPurchase(remote.get(first.sessionId));
  const row = await current();
  await prisma.platformCheckoutAttempt.update({ where: { id: row.id }, data: { state: "AWAITING_WEBHOOK" } });
  const next = await checkout();
  assert.notEqual(next.sessionId, first.sessionId); assert.equal(calls, 2);
  const retired = await prisma.platformCheckoutAttempt.findUnique({ where: { id: row.id } });
  assert.equal(retired.currentOrganisationId, null); assert.equal(retired.sessionId, first.sessionId);
  assert.equal(retired.recoveryReason, "completed_subscription_terminal");
});

test("confirmed completed legacy purchase does not permanently block returning customer", async () => {
  const legacy = { id: "cs_legacy_confirmed", mode: "subscription", metadata: parameters().metadata, expires_at: Math.floor(clock / 1000) + 3600 };
  remote.set(legacy.id, legacy); await confirmedCompletedPurchase(legacy);
  await prisma.organisation.update({ where: { id: org.id }, data: { settings: { billing: { lastCheckoutSessionId: legacy.id } } } });
  const next = await checkout(); assert.notEqual(next.sessionId, legacy.id); assert.equal(calls, 1);
});

test("changed purchase expires an open session, but unknown expiry blocks replacement", async () => {
  await checkout(); const params = parameters(org.id, { line_items: [{ price: "price_scale", quantity: 1 }] });
  failExpire = true; await assert.rejects(checkout({ parameters: params }), /Expiry outcome/); assert.equal(calls, 1);
  failExpire = false; await checkout({ parameters: params }); assert.equal(calls, 2);
  assert.equal([...remote.values()].filter(s => s.status === "open").length, 1);
});

test("cancellation return and elapsed local expiry never invalidate a Stripe-open session", async () => {
  const first = await checkout(); clock += 2 * 60 * 60_000;
  const params = parameters(org.id, { cancel_url: "https://example.test/checkout=cancelled" });
  assert.equal((await checkout({ parameters: params })).sessionId, first.sessionId); assert.equal(calls, 1);
});

test("unknown attempt beyond replay cutoff blocks even with changed terms", async () => {
  failCreate = true; await assert.rejects(checkout()); clock += 23 * 60 * 60_000;
  failCreate = false;
  await assert.rejects(checkout({ parameters: parameters(org.id, { line_items: [] }) }), { code: "checkout_recovery_required" });
  assert.equal(calls, 1); assert.equal((await current()).state, "RECOVERY_REQUIRED");
});

test("failed/missing session retrieval never permits replacement", async () => {
  await checkout(); failRetrieve = true;
  await assert.rejects(checkout(), /retrieval unavailable/); assert.equal(calls, 1);
  failRetrieve = false; remote.clear(); await assert.rejects(checkout(), /session missing/); assert.equal(calls, 1);
});

test("legacy onboarding open sessions are reconciled; completed legacy sessions wait", async () => {
  const legacy = { id: "cs_legacy", mode: "subscription", metadata: parameters().metadata, status: "open", expires_at: Math.floor(clock / 1000) + 3600 };
  remote.set(legacy.id, legacy);
  await prisma.organisation.update({ where: { id: org.id }, data: { settings: { gen2Onboarding: { stripeCheckoutSessionId: legacy.id } } } });
  await checkout(); assert.equal(legacy.status, "expired"); assert.equal(calls, 1);
  const complete = { ...legacy, id: "cs_complete", status: "complete" }; remote.set(complete.id, complete);
  await prisma.platformCheckoutAttempt.deleteMany();
  await prisma.organisation.update({ where: { id: org.id }, data: { settings: { billing: { lastCheckoutSessionId: complete.id } } } });
  await assert.rejects(checkout(), { code: "checkout_awaiting_webhook" }); assert.equal(calls, 1);
});

test("tenant-owned legacy session cannot expire or resume another tenant session", async () => {
  const b = await checkout({ organisationId: other.id, parameters: parameters(other.id) });
  await prisma.organisation.update({ where: { id: org.id }, data: { settings: { gen2Onboarding: { stripeCheckoutSessionId: b.sessionId } } } });
  await assert.rejects(checkout(), { code: "checkout_ownership_unverified" });
  assert.equal(remote.get(b.sessionId).status, "open"); assert.equal(calls, 1);
});

test("separate tenants have independent current attempts", async () => {
  const [a, b] = await Promise.all([checkout(), checkout({ organisationId: other.id, parameters: parameters(other.id), database: control })]);
  assert.notEqual(a.sessionId, b.sessionId); assert.equal(calls, 2);
});

test("authoritative live subscription blocks despite local cancelled flags", async () => {
  await prisma.platformSubscription.create({ data: { organisationId: org.id, status: "CANCELLED", stripeSubscriptionId: "sub_existing" } });
  subscriptions.set("sub_existing", { id: "sub_existing", status: "past_due", customer: "cus_existing" });
  await assert.rejects(checkout(), { code: "subscription_exists" }); assert.equal(calls, 0);
});

test("customer live subscription blocks before webhook creates canonical subscription", async () => {
  await prisma.organisation.update({ where: { id: org.id }, data: { billingCustomerId: "cus_existing" } });
  subscriptions.set("sub_pending", { id: "sub_pending", status: "trialing", customer: "cus_existing" });
  await assert.rejects(checkout(), { code: "subscription_exists" }); assert.equal(calls, 0);
});

test("Stripe account/mode changes block replay instead of creating in another namespace", async () => {
  await checkout(); const alternate = { ...stripe, accounts: { retrieve: async () => ({ id: "acct_other" }) } };
  await assert.rejects(checkout({ stripe: alternate }), { code: "checkout_provider_changed" }); assert.equal(calls, 1);
});

test("fingerprint ignores actor/return URL changes and normalises unordered commercial selections", () => {
  const a = parameters(); a.metadata.dg_premium_apps = "growth_suite,reputation";
  const b = structuredClone(a); b.metadata.dg_premium_apps = "reputation,growth_suite"; b.customer_email = "new@example.test"; b.success_url = "https://example.test/apps";
  assert.equal(checkoutPurchaseFingerprint(a), checkoutPurchaseFingerprint(b));
  b.subscription_data.trial_period_days = 0;
  assert.notEqual(checkoutPurchaseFingerprint(a), checkoutPurchaseFingerprint(b));
});

test("a database write failure after Stripe creates a session recovers the persisted send", async () => {
  let failWrite = true;
  const broken = prisma.$extends({ query: { platformCheckoutAttempt: { async updateMany({ args, query }) {
    if (failWrite && args.data.sessionId) { failWrite = false; throw new Error("DB write interrupted after Stripe success"); }
    return query(args);
  } } } });
  await assert.rejects(checkout({ database: broken }), /DB write interrupted/);
  const row = await current(); assert.equal(row.sessionId, null); assert.equal(row.state, "UNCERTAIN");
  await checkout(); assert.equal(calls, 2); assert.equal(remote.size, 1); assert.equal(keys[0], keys[1]);
});

test("unknown attempt with different purchase replays old terms before expiring/replacing", async () => {
  failCreate = true; await assert.rejects(checkout());
  failCreate = false; await checkout({ parameters: parameters(org.id, { line_items: [{ price: "price_scale", quantity: 1 }] }) });
  assert.equal(calls, 3); assert.equal(keys[0], keys[1]); assert.notEqual(keys[1], keys[2]);
  assert.deepEqual(requests[0], requests[1]);
  assert.equal([...remote.values()].filter(s => s.status === "open").length, 1);
});

test("completion racing with expiry blocks a replacement", async () => {
  await checkout();
  const completingStripe = { ...stripe, checkout: { sessions: { ...stripe.checkout.sessions, expire: async id => {
    remote.get(id).status = "complete"; return structuredClone(remote.get(id));
  } } } };
  await assert.rejects(checkout({ stripe: completingStripe, parameters: parameters(org.id, { line_items: [{ price: "price_scale", quantity: 1 }] }) }), { code: "checkout_awaiting_webhook" });
  assert.equal(calls, 1); assert.equal((await current()).state, "AWAITING_WEBHOOK");
});

test("crash before send retires an unused reservation without replaying stale request parameters", async () => {
  await checkout(); const row = await current(); remote.clear();
  await prisma.platformCheckoutAttempt.update({ where: { id: row.id }, data: { firstRequestedAt: null, sessionId: null, state: "PREPARED" } });
  clock += 25 * 60 * 60_000;
  await checkout(); assert.equal(calls, 2); assert.notEqual(keys[0], keys[1]);
  assert.equal(await prisma.platformCheckoutAttempt.count(), 2);
});

test("parameter ownership mismatch is rejected before any remote checkout creation", async () => {
  await assert.rejects(checkout({ parameters: parameters(other.id) }), { code: "checkout_ownership_unverified" });
  assert.equal(calls, 0); assert.equal(await prisma.platformCheckoutAttempt.count(), 0);
});

test("session lookup still works beyond idempotency retention when identity was persisted", async () => {
  const result = await checkout(); clock += 25 * 60 * 60_000;
  remote.get(result.sessionId).status = "expired";
  await checkout(); assert.equal(calls, 2); assert.notEqual(keys[0], keys[1]);
});

const closeGate = () => control.$executeRaw`UPDATE platform_checkout_creation_gate SET blocked = true WHERE id = 1`;
const openGate = () => control.$executeRaw`UPDATE platform_checkout_creation_gate SET blocked = false WHERE id = 1`;
const drainExpiry = async () => {
  const [row] = await control.$queryRaw`SELECT EXTRACT(EPOCH FROM last_admission_expires_at)::bigint AS expiry FROM platform_checkout_creation_gate WHERE id = 1`;
  return row.expiry === null ? null : Number(row.expiry);
};

test("closed gate denies initial create and rolls back the send marker", async () => {
  await closeGate();
  await assert.rejects(checkout(), error => error.outcome === "gate_denied");
  assert.equal(calls, 0); assert.equal((await current()).firstRequestedAt, null);
  assert.equal((await current()).state, "PREPARED"); assert.equal(await drainExpiry(), null);
  await openGate(); await checkout(); assert.equal(calls, 1);
});

test("closure during provider I/O retains a horizon covering the immutable one-hour expiry", async () => {
  createGate = deferred(); const started = checkout();
  while (!calls) await new Promise(r => setTimeout(r, 5));
  const expiry = requests[0].expires_at;
  assert.ok(expiry * 1000 - clock > 59 * 60_000);
  assert.equal(await drainExpiry(), expiry);
  await closeGate(); createGate.resolve(); const result = await started;
  assert.equal((await checkout()).sessionId, result.sessionId, "known session retrieval remains permitted");
  assert.equal(calls, 1); assert.equal(await drainExpiry(), expiry);
});

test("closed gate denies uncertain replay without altering request, key or original send marker", async () => {
  failCreate = true; await assert.rejects(checkout(), error => error.outcome === "unknown");
  const row = await current(); await closeGate(); clock += 40 * 60_000;
  await assert.rejects(checkout(), error => error.outcome === "gate_denied");
  const held = await current();
  assert.equal(calls, 1); assert.equal(held.idempotencyKey, row.idempotencyKey);
  assert.deepEqual(held.requestParameters, row.requestParameters);
  assert.deepEqual(held.firstRequestedAt, row.firstRequestedAt);
  assert.equal(await drainExpiry(), requests[0].expires_at);
  failCreate = false; await openGate(); await checkout();
  assert.equal(remote.size, 1); assert.equal(keys[0], keys[1]); assert.deepEqual(requests[0], requests[1]);
});

for (const remaining of [1801, 1800, 1799]) {
  test(`initial provider expiry boundary ${remaining}s: rejection releases only a confirmed failed send`, async () => {
    const provider = { ...stripe, checkout: { sessions: { ...stripe.checkout.sessions, create: async (params, options) => {
      assert.equal(await drainExpiry(), params.expires_at);
      if (remaining < 1800) {
        calls++; requests.push(structuredClone(params)); keys.push(options.idempotencyKey);
        throw new Stripe.errors.StripeInvalidRequestError({ message: "private error", statusCode: 400, param: "expires_at" });
      }
      return stripe.checkout.sessions.create(params, options);
    } } } };
    if (remaining < 1800) {
      await assert.rejects(checkout({ stripe: provider }), error => error.outcome === "expiry_rejected");
      assert.equal(await current(), null); assert.equal(remote.size, 0);
      const row = await prisma.platformCheckoutAttempt.findFirst();
      assert.equal(row.state, "EXPIRED"); assert.equal(row.recoveryReason, "provider_expiry_rejected");
    } else { await checkout({ stripe: provider }); assert.equal(remote.size, 1); }
    assert.equal(calls, 1); assert.equal(await drainExpiry(), requests[0].expires_at);
  });
}

test("expiry rejection on an uncertain replay preserves the unresolved purchase and key", async () => {
  failCreate = true; await assert.rejects(checkout()); const row = await current(); clock += 2 * 60 * 60_000;
  const provider = { ...stripe, checkout: { sessions: { ...stripe.checkout.sessions, create: async (params, options) => {
    calls++; assert.deepEqual(params, row.requestParameters); assert.equal(options.idempotencyKey, row.idempotencyKey);
    throw new Stripe.errors.StripeInvalidRequestError({ message: "expiry stale", statusCode: 400, param: "expires_at" });
  } } } };
  await assert.rejects(checkout({ stripe: provider }), { code: "checkout_recovery_required" });
  assert.equal((await current()).id, row.id); assert.equal((await current()).idempotencyKey, row.idempotencyKey);
  assert.equal((await current()).state, "RECOVERY_REQUIRED"); assert.equal(remote.size, 1);
  await assert.rejects(checkout(), { code: "checkout_recovery_required" }); assert.equal(calls, 2);
});

test("a stale worker fenced before admission cannot extend the drain horizon or send", async () => {
  let paused = false; const waiting = deferred(), reached = deferred();
  const stalledProvider = { ...stripe, subscriptions: { ...stripe.subscriptions, retrieve: async () => {
    if (!paused) { paused = true; reached.resolve(); await waiting.promise; }
    return { status: "canceled" };
  } } };
  await prisma.platformSubscription.create({ data: { organisationId: org.id, stripeSubscriptionId: "sub_terminal", status: "CANCELLED" } });
  subscriptions.set("sub_terminal", { status: "canceled" });
  const started = checkout({ stripe: stalledProvider }); await reached.promise;
  clock += 61_000; await checkout({ database: control }); const expiry = await drainExpiry();
  const rejected = assert.rejects(started, { code: "checkout_lease_lost" });
  waiting.resolve(); await rejected;
  assert.equal(calls, 1); assert.equal(await drainExpiry(), expiry);
});

test("shorter admission never reduces a previously recorded long drain horizon", async () => {
  await checkout(); const expiry = await drainExpiry();
  await control.$executeRaw`UPDATE platform_checkout_creation_gate SET last_admission_expires_at = to_timestamp(${expiry + 3600}::double precision) WHERE id = 1`;
  failCreate = true;
  await assert.rejects(checkout({ organisationId: other.id, parameters: parameters(other.id) }));
  assert.equal(await drainExpiry(), expiry + 3600);
  assert.ok(requests[1].expires_at <= await drainExpiry());
});


test("an unresolved request with missing immutable expiry cannot obtain a default permit", async () => {
  failCreate = true; await assert.rejects(checkout()); const row = await current();
  const body = structuredClone(row.requestParameters); delete body.expires_at;
  await prisma.platformCheckoutAttempt.update({ where: { id: row.id }, data: { requestParameters: body } });
  await assert.rejects(checkout(), { code: "checkout_recovery_required" });
  assert.equal(calls, 1); assert.equal((await current()).idempotencyKey, row.idempotencyKey);
  assert.equal((await current()).recoveryReason, "immutable_expiry_missing");
});


for (const defect of ["missing_receipt", "wrong_customer", "wrong_tenant", "wrong_mode", "local_status", "canonical_status"]) {
  test(`completed purchase with ${defect} cannot release the current slot`, async () => {
    const first = await checkout();
    await confirmedCompletedPurchase(remote.get(first.sessionId));
    const canonical = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
    if (defect === "missing_receipt") await prisma.platformSubscriptionEvent.deleteMany();
    if (defect === "wrong_customer") remote.get(first.sessionId).customer = "cus_other";
    if (defect === "wrong_tenant") subscriptions.get("sub_confirmed").metadata.organisation_id = other.id;
    if (defect === "wrong_mode") remote.get(first.sessionId).livemode = true;
    if (defect === "local_status") await prisma.platformSubscription.update({ where: { id: canonical.id }, data: { status: "ACTIVE" } });
    if (defect === "canonical_status") await prisma.platformSubscription.update({ where: { id: canonical.id }, data: { stripeStatus: "active" } });
    await assert.rejects(checkout(), { code: "checkout_awaiting_webhook" });
    assert.equal(calls, 1); assert.equal((await current()).sessionId, first.sessionId);
  });
}
test("confirmed terminal completion still cannot create a replacement while gate closed", async () => {
  const first = await checkout(); await confirmedCompletedPurchase(remote.get(first.sessionId));
  await control.$executeRaw`UPDATE platform_checkout_creation_gate SET blocked = true WHERE id = 1`;
  await assert.rejects(checkout(), error => error.name === "CheckoutTemporarilyUnavailable");
  assert.equal(calls, 1);
});


test("confirmed legacy retirement remains usable after canonical billing moves to another purchase", async () => {
  const legacy = { id: "cs_legacy_history", mode: "subscription", metadata: parameters().metadata,
    expires_at: Math.floor(clock / 1000) + 3600 };
  remote.set(legacy.id, legacy); await confirmedCompletedPurchase(legacy);
  await prisma.organisation.update({ where: { id: org.id }, data: { settings: { gen2Onboarding: { stripeCheckoutSessionId: legacy.id } } } });
  const next = await checkout();
  await prisma.platformSubscription.update({ where: { organisationId: org.id }, data: {
    stripeSubscriptionId: "sub_later", stripeCustomerId: "cus_later", stripeStatus: "canceled",
  } });
  subscriptions.set("sub_later", { id: "sub_later", customer: "cus_later", status: "canceled" });
  await prisma.organisation.update({ where: { id: org.id }, data: { billingCustomerId: "cus_later" } });
  assert.equal((await checkout()).sessionId, next.sessionId);
  assert.equal(calls, 1);
  assert.ok(await prisma.platformCheckoutAttempt.findFirst({ where: {
    organisationId: org.id, sessionId: legacy.id, currentOrganisationId: null,
    recoveryReason: "completed_subscription_terminal",
  } }));
});
