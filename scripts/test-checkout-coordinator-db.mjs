import assert from "node:assert/strict";
import { before, beforeEach, after, test } from "node:test";
import { randomUUID } from "node:crypto";
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
  failCreate = true; await assert.rejects(checkout(), /response lost/);
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
