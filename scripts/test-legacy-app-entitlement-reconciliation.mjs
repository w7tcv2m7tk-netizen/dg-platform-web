import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "@dg/database";
import { expectedPurchasedLineItems } from "../packages/platform-core/src/billing/purchased-line-items.ts";
import { reconcileLegacyAppEntitlements, prismaLegacyEntitlementRepository } from "../packages/platform-core/src/billing/legacy-app-entitlement-reconciliation.ts";

let organisation;
let candidate;
let stripeSubscription;
let repository;
const control = prisma;
const now = new Date("2026-10-19T00:00:00.000Z");

function providerItems({ industryApps = ["finance"], premiumApps = [] } = {}) {
  return expectedPurchasedLineItems({
    platformTier: "professional", industryApps, premiumApps, supportPlan: "standard", cadence: "monthly",
  }).map((line) => ({
    quantity: 1,
    price: {
      id: `price_fixture_${line.amountCents}`,
      unit_amount: line.amountCents,
      currency: "aud",
      recurring: { interval: "month", interval_count: 1 },
      product: { name: line.name ?? "DigitalGate Growth" },
    },
  }));
}

function stripeFixture(overrides = {}) {
  return {
    id: candidate.stripeSubscriptionId,
    customer: candidate.stripeCustomerId,
    livemode: false,
    status: "active",
    cancel_at_period_end: false,
    trial_end: null,
    current_period_end: Math.floor(new Date("2026-11-19T00:00:00.000Z").getTime() / 1000),
    updated: Math.floor(now.getTime() / 1000),
    metadata: {
      organisation_id: organisation.id,
      dg_platform_subscription: "true",
      dg_platform_tier: "professional",
      dg_billing_cadence: "monthly",
      dg_support_plan: "standard",
      dg_industry_apps: "finance",
      dg_industry_templates: "",
      dg_premium_apps: "",
    },
    items: { data: providerItems() },
    ...overrides,
  };
}

function stripeApi(subscription) {
  return {
    accounts: { retrieve: async () => ({ id: "acct_test_fixture" }) },
    balance: { retrieve: async () => ({ livemode: false }) },
    subscriptions: { retrieve: async (id) => {
      assert.equal(id, candidate.stripeSubscriptionId);
      return structuredClone(subscription);
    } },
  };
}

async function setup({ exempt = false, paidApps = false, status = "ACTIVE", stripeStatus = "active", entitlement = "FULL", trialEnd = null } = {}) {
  const suffix = randomUUID();
  organisation = await control.organisation.create({
    data: { name: "Entitlement reconciliation fixture", slug: `legacy-entitlement-${suffix}`, billingCustomerId: `cus_${suffix}` },
  });
  candidate = await control.platformSubscription.create({
    data: {
      organisationId: organisation.id,
      status,
      entitlement,
      planTier: "professional",
      industryApps: paidApps ? ["finance"] : [],
      premiumApps: [],
      stripeCustomerId: organisation.billingCustomerId,
      stripeSubscriptionId: `sub_${suffix}`,
      stripeStatus,
      trialEnd,
      currentPeriodEnd: new Date("2026-11-19T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
      platformExempt: exempt,
    },
  });
  stripeSubscription = stripeFixture();
  stripeSubscription.status = stripeStatus;
  if (stripeStatus === "trialing") {
    const end = trialEnd ?? new Date("2026-11-02T00:00:00.000Z");
    stripeSubscription.trial_end = Math.floor(end.getTime() / 1000);
    stripeSubscription.current_period_end = stripeSubscription.trial_end;
    if (!trialEnd) await control.platformSubscription.update({ where: { id: candidate.id }, data: { trialEnd: end } }).then((row) => { candidate = row; });
  }
  const baseRepository = prismaLegacyEntitlementRepository(control);
  repository = {
    ...baseRepository,
    listCandidates: async () => [await control.platformSubscription.findUnique({
      where: { id: candidate.id },
      include: { organisation: { select: { billingCustomerId: true } } },
    })],
  };
}

async function cleanup() {
  if (organisation) await control.organisation.delete({ where: { id: organisation.id } });
  organisation = undefined;
  candidate = undefined;
}

before(async () => {
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/dg_checkout_test");
  assert.ok(process.env.DG_CHECKOUT_DB_MARKER);
  const [row] = await control.$queryRaw`SELECT current_setting('dg.checkout_test_cluster', true) AS marker`;
  assert.equal(row.marker, process.env.DG_CHECKOUT_DB_MARKER);
});

afterEach(cleanup);
after(async () => { await cleanup(); await control.$disconnect(); });

test("dry-run verifies Stripe line items and performs no database write", async () => {
  await setup();
  const report = await reconcileLegacyAppEntitlements({
    stripe: stripeApi(stripeSubscription), repository,
    expectedStripeAccountId: "acct_test_fixture", now,
  });
  assert.equal(report.applied, false);
  assert.equal(report.results[0].outcome, "reconcile");
  assert.deepEqual(report.results[0].industryApps, ["finance"]);
  const row = await control.platformSubscription.findUnique({ where: { id: candidate.id } });
  assert.deepEqual(row.industryApps, []);
  assert.equal(await control.platformSubscriptionEvent.count({ where: { subscriptionId: candidate.id } }), 0);
  await cleanup();
});

test("authorized test-fixture write is atomic, idempotent and leaves billing exemptions untouched", async () => {
  await setup();
  const report = await reconcileLegacyAppEntitlements({
    stripe: stripeApi(stripeSubscription), repository,
    expectedStripeAccountId: "acct_test_fixture", apply: true,
    approvalReference: "test:fixture-approved", now,
  });
  assert.equal(report.results[0].outcome, "reconcile");
  const row = await control.platformSubscription.findUnique({ where: { id: candidate.id } });
  assert.deepEqual(row.industryApps, ["finance"]);
  assert.deepEqual(row.premiumApps, []);
  assert.equal(row.platformExempt, false);
  assert.equal(row.status, "ACTIVE");
  assert.equal(await control.platformSubscriptionEvent.count({ where: { subscriptionId: candidate.id, type: "legacy_app_entitlements_reconciled" } }), 1);
  const again = await reconcileLegacyAppEntitlements({
    stripe: stripeApi(stripeSubscription), repository,
    expectedStripeAccountId: "acct_test_fixture", apply: true,
    approvalReference: "test:fixture-approved", now,
  });
  assert.equal(again.results[0].outcome, "already_reconciled");
  assert.equal(await control.platformSubscriptionEvent.count({ where: { subscriptionId: candidate.id, type: "legacy_app_entitlements_reconciled" } }), 1);
  await cleanup();
});

test("authorised exemption is skipped without changing its app or billing state", async () => {
  await setup({ exempt: true });
  const report = await reconcileLegacyAppEntitlements({ stripe: stripeApi(stripeSubscription), repository, expectedStripeAccountId: "acct_test_fixture", apply: true, approvalReference: "test:fixture-approved", now });
  assert.equal(report.results[0].outcome, "skip");
  const row = await control.platformSubscription.findUnique({ where: { id: candidate.id } });
  assert.equal(row.platformExempt, true);
  assert.deepEqual(row.industryApps, []);
  assert.equal(await control.platformSubscriptionEvent.count({ where: { subscriptionId: candidate.id } }), 0);
  await cleanup();
});

test("verified unexpired trial can be reconciled", async () => {
  await setup({ status: "TRIALING", stripeStatus: "trialing", trialEnd: new Date("2026-11-02T00:00:00.000Z") });
  const report = await reconcileLegacyAppEntitlements({ stripe: stripeApi(stripeSubscription), repository, expectedStripeAccountId: "acct_test_fixture", apply: true, approvalReference: "test:trial-fixture", now });
  assert.equal(report.results[0].outcome, "reconcile");
  assert.deepEqual((await control.platformSubscription.findUnique({ where: { id: candidate.id } })).industryApps, ["finance"]);
  await cleanup();
});

test("expired trial is blocked", async () => {
  await setup({ status: "TRIALING", stripeStatus: "trialing", trialEnd: new Date("2026-10-18T00:00:00.000Z") });
  stripeSubscription.trial_end = Math.floor(new Date("2026-10-18T00:00:00.000Z").getTime() / 1000);
  const report = await reconcileLegacyAppEntitlements({ stripe: stripeApi(stripeSubscription), repository, expectedStripeAccountId: "acct_test_fixture", apply: true, approvalReference: "test:expired-trial", now });
  assert.equal(report.results[0].outcome, "blocked");
  assert.deepEqual((await control.platformSubscription.findUnique({ where: { id: candidate.id } })).industryApps, []);
  await cleanup();
});

for (const [name, change] of [
  ["wrong Stripe mode", (sub) => { sub.livemode = true; }],
  ["wrong organisation metadata", (sub) => { sub.metadata.organisation_id = "org_foreign"; }],
  ["wrong customer", (sub) => { sub.customer = "cus_foreign"; }],
  ["unpaid status", (sub) => { sub.status = "canceled"; }],
  ["wrong currency", (sub) => { sub.items.data[1].price.currency = "usd"; }],
  ["wrong interval", (sub) => { sub.items.data[1].price.recurring.interval = "year"; }],
  ["wrong catalogue amount", (sub) => { sub.items.data[1].price.unit_amount = 1; }],
  ["missing selection metadata", (sub) => { delete sub.metadata.dg_industry_apps; }],
]) {
  test(`${name} fails closed and never writes`, async () => {
    await setup();
    const invalid = structuredClone(stripeSubscription);
    change(invalid);
    const report = await reconcileLegacyAppEntitlements({ stripe: stripeApi(invalid), repository, expectedStripeAccountId: "acct_test_fixture", apply: true, approvalReference: "test:fixture-approved", now });
    assert.equal(report.results[0].outcome, "blocked");
    const row = await control.platformSubscription.findUnique({ where: { id: candidate.id } });
    assert.deepEqual(row.industryApps, []);
    assert.equal(await control.platformSubscriptionEvent.count({ where: { subscriptionId: candidate.id } }), 0);
    await cleanup();
  });
}

test("apply cannot run without explicit test approval", async () => {
  await setup();
  await assert.rejects(reconcileLegacyAppEntitlements({ stripe: stripeApi(stripeSubscription), repository, expectedStripeAccountId: "acct_test_fixture", apply: true, now }), /explicit test: approval/);
  await cleanup();
});

test("organisation billing-customer mismatch fails closed", async () => {
  await setup();
  await control.organisation.update({ where: { id: organisation.id }, data: { billingCustomerId: "cus_different" } });
  const report = await reconcileLegacyAppEntitlements({ stripe: stripeApi(stripeSubscription), repository, expectedStripeAccountId: "acct_test_fixture", apply: true, approvalReference: "test:ownership-mismatch", now });
  assert.equal(report.results[0].outcome, "blocked");
  assert.equal(report.results[0].reason, "organisation_customer_mismatch");
  assert.deepEqual((await control.platformSubscription.findUnique({ where: { id: candidate.id } })).industryApps, []);
  await cleanup();
});

test("Stripe account mismatch aborts before reading or writing subscriptions", async () => {
  await setup();
  const stripe = stripeApi(stripeSubscription);
  stripe.accounts.retrieve = async () => ({ id: "acct_wrong" });
  await assert.rejects(reconcileLegacyAppEntitlements({ stripe, repository, expectedStripeAccountId: "acct_test_fixture", apply: true, approvalReference: "test:wrong-account", now }), /account or mode verification failed/);
  assert.deepEqual((await control.platformSubscription.findUnique({ where: { id: candidate.id } })).industryApps, []);
  await cleanup();
});

test("concurrent approved runs update once and emit one audit record", async () => {
  await setup();
  const input = { stripe: stripeApi(stripeSubscription), repository, expectedStripeAccountId: "acct_test_fixture", apply: true, approvalReference: "test:concurrent-run", now };
  const [left, right] = await Promise.all([
    reconcileLegacyAppEntitlements(input),
    reconcileLegacyAppEntitlements(input),
  ]);
  const outcomes = [left.results[0].outcome, right.results[0].outcome];
  assert.equal(outcomes.filter((outcome) => outcome === "reconcile").length, 1);
  assert.equal(outcomes.filter((outcome) => outcome === "blocked" || outcome === "already_reconciled").length, 1);
  assert.equal(await control.platformSubscriptionEvent.count({ where: { subscriptionId: candidate.id, type: "legacy_app_entitlements_reconciled" } }), 1);
  await cleanup();
});
