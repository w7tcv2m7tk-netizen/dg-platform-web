import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { randomUUID, generateKeyPairSync, sign } from "node:crypto";
import { prisma } from "@dg/database";
import { expectedPurchasedLineItems } from "../packages/platform-core/src/billing/purchased-line-items.ts";
import { reconcileLegacyAppEntitlements, prismaLegacyEntitlementRepository, prismaProductionLegacyEntitlementRepository } from "../packages/platform-core/src/billing/legacy-app-entitlement-reconciliation.ts";
import { canonicalProductionApproval } from "../packages/platform-core/src/billing/legacy-reconciliation-approval.ts";

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
      product: { id: `prod_fixture_${line.amountCents}`, name: line.name ?? "DigitalGate Growth" },
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

function stripeApi(subscription, balanceLivemode = subscription.livemode) {
  return {
    accounts: { retrieve: async () => ({ id: "acct_test_fixture" }) },
    balance: { retrieve: async () => ({ livemode: balanceLivemode }) },
    subscriptions: { retrieve: async (id) => {
      assert.equal(id, candidate.stripeSubscriptionId);
      return structuredClone(subscription);
    } },
  };
}

function signedApproval(planSha256, { expired = false } = {}) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const approvedAt = new Date(Date.now() - (expired ? 2 * 60 * 60 * 1000 : 0)).toISOString();
  const unsigned = { version: 1, mode: "production", planSha256, stripeAccountId: "acct_test_fixture",
    databaseHost: "ep-prod-fixture.neon.tech", databaseName: "dg_production_fixture",
    approvedBy: "release-manager", changeTicket: "CHG-TEST-EVIDENCE", approvedAt,
    expiresAt: new Date(Date.now() + (expired ? -60 * 60 * 1000 : 60 * 60 * 1000)).toISOString() };
  const approval = { ...unsigned, signature: sign(null, Buffer.from(canonicalProductionApproval(unsigned)), privateKey).toString("base64") };
  return { approval, publicKey: publicKey.export({ type: "spki", format: "pem" }).toString() };
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

test("dry-run evidence is reviewable, redacted and fingerprints the proposed catalogue purchase", async () => {
  await setup();
  const report = await reconcileLegacyAppEntitlements({ stripe: stripeApi(stripeSubscription), repository,
    expectedStripeAccountId: "acct_test_fixture", now });
  const evidence = report.results[0].evidence;
  assert.equal(evidence.stripeSubscriptionId, stripeSubscription.id);
  assert.equal(evidence.stripeCustomerRef.length, 16);
  assert.equal(evidence.livemode, false);
  const item = evidence.lineItems.find(line => line.priceId === stripeSubscription.items.data[1].price.id);
  assert.ok(item);
  assert.equal(item.productId, `prod_fixture_${item.unitAmountCents}`);
  assert.equal(item.quantity, 1);
  assert.equal(item.currency, "aud");
  assert.equal(item.billingInterval, "month");
  assert.notEqual(item.catalogueMapping, "unmatched");
  assert.deepEqual(evidence.proposedIndustryApps, ["finance"]);
  assert.deepEqual(evidence.proposedPremiumApps, []);
  assert.equal(evidence.evidenceFingerprint, report.results[0].itemFingerprint);
  assert.doesNotMatch(JSON.stringify(evidence), /fixture@example|cus_[a-z0-9]+/i);
});

test("production-mode dry-run uses live-mode fixtures but performs no database write", async () => {
  await setup();
  stripeSubscription.livemode = true;
  const report = await reconcileLegacyAppEntitlements({
    stripe: stripeApi(stripeSubscription), repository,
    expectedStripeAccountId: "acct_test_fixture", mode: "production", now,
  });
  assert.equal(report.mode, "production");
  assert.equal(report.applied, false);
  assert.equal(report.results[0].outcome, "reconcile");
  const row = await control.platformSubscription.findUnique({ where: { id: candidate.id } });
  assert.deepEqual(row.industryApps, []);
});

test("production apply requires a signature bound to the exact plan and target", async () => {
  await setup();
  stripeSubscription.livemode = true;
  const stripe = stripeApi(stripeSubscription);
  const target = { databaseHost: "ep-prod-fixture.neon.tech", databaseName: "dg_production_fixture", stripeAccountId: "acct_test_fixture" };
  const dryRun = await reconcileLegacyAppEntitlements({ stripe, repository, expectedStripeAccountId: target.stripeAccountId, mode: "production", expectedDatabaseHost: target.databaseHost, expectedDatabaseName: target.databaseName, now });
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const approvedAt = new Date().toISOString();
  const unsigned = { version: 1, mode: "production", planSha256: dryRun.planSha256, stripeAccountId: target.stripeAccountId,
    databaseHost: target.databaseHost, databaseName: target.databaseName,
    approvedBy: "release-manager", changeTicket: "CHG-TEST-42", approvedAt, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
  const productionApproval = { ...unsigned, signature: sign(null, Buffer.from(canonicalProductionApproval(unsigned)), privateKey).toString("base64") };
  const testOnlyAuthorizedRepository = {
    ...repository,
    authorizeProductionApply: async input => input.planSha256 === dryRun.planSha256 && input.approval.signature === productionApproval.signature,
  };
  await assert.rejects(reconcileLegacyAppEntitlements({
    stripe, repository, expectedStripeAccountId: target.stripeAccountId, mode: "production", apply: true, now,
  }), /separately signed approval/);
  const applied = await reconcileLegacyAppEntitlements({
    stripe, repository: testOnlyAuthorizedRepository, expectedStripeAccountId: target.stripeAccountId, mode: "production", apply: true,
    productionApproval, approvalPublicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
    expectedDatabaseHost: target.databaseHost, expectedDatabaseName: target.databaseName, now,
  });
  assert.equal(applied.applied, true);
  assert.equal(applied.results[0].reason, "applied_with_audit_event");
  const row = await control.platformSubscription.findUnique({ where: { id: candidate.id } });
  assert.deepEqual(row.industryApps, ["finance"]);
});

test("production approval cannot be replayed when Stripe line-item evidence changes", async () => {
  await setup();
  stripeSubscription.livemode = true;
  const stripe = stripeApi(stripeSubscription);
  const dryRun = await reconcileLegacyAppEntitlements({ stripe, repository, expectedStripeAccountId: "acct_test_fixture", mode: "production", expectedDatabaseHost: "ep-prod-fixture.neon.tech", expectedDatabaseName: "dg_production_fixture", now });
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const approvedAt = new Date().toISOString();
  const unsigned = { version: 1, mode: "production", planSha256: dryRun.planSha256, stripeAccountId: "acct_test_fixture",
    databaseHost: "ep-prod-fixture.neon.tech", databaseName: "dg_production_fixture",
    approvedBy: "release-manager", changeTicket: "CHG-TEST-43", approvedAt, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
  const productionApproval = { ...unsigned, signature: sign(null, Buffer.from(canonicalProductionApproval(unsigned)), privateKey).toString("base64") };
  const testOnlyAuthorizedRepository = {
    ...repository,
    authorizeProductionApply: async input => input.planSha256 === dryRun.planSha256 && input.approval.signature === productionApproval.signature,
  };
  stripeSubscription.items.data[0].price.product.id = "prod_changed_after_review";
  const changedEvidence = await reconcileLegacyAppEntitlements({ stripe, repository, expectedStripeAccountId: "acct_test_fixture",
    mode: "production", expectedDatabaseHost: unsigned.databaseHost, expectedDatabaseName: unsigned.databaseName, now });
  assert.notEqual(changedEvidence.results[0].evidence.evidenceFingerprint, dryRun.results[0].evidence.evidenceFingerprint);
  assert.notEqual(changedEvidence.planSha256, dryRun.planSha256);
  await assert.rejects(reconcileLegacyAppEntitlements({
    stripe, repository: testOnlyAuthorizedRepository, expectedStripeAccountId: "acct_test_fixture", mode: "production", apply: true,
    productionApproval, approvalPublicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
    expectedDatabaseHost: unsigned.databaseHost, expectedDatabaseName: unsigned.databaseName, now,
  }), /does not match this exact plan/);
  const row = await control.platformSubscription.findUnique({ where: { id: candidate.id } });
  assert.deepEqual(row.industryApps, []);
});

test("expired signed reconciliation approval is rejected before writes", async () => {
  await setup();
  stripeSubscription.livemode = true;
  const target = { databaseHost: "ep-prod-fixture.neon.tech", databaseName: "dg_production_fixture" };
  const dryRun = await reconcileLegacyAppEntitlements({ stripe: stripeApi(stripeSubscription), repository,
    expectedStripeAccountId: "acct_test_fixture", mode: "production", ...target, now });
  const { approval, publicKey } = signedApproval(dryRun.planSha256, { expired: true });
  await assert.rejects(reconcileLegacyAppEntitlements({ stripe: stripeApi(stripeSubscription), repository,
    expectedStripeAccountId: "acct_test_fixture", mode: "production", apply: true,
    productionApproval: approval, approvalPublicKey: publicKey, ...target, now }), /does not match this exact plan/);
  assert.deepEqual((await control.platformSubscription.findUnique({ where: { id: candidate.id } })).industryApps, []);
});

test("tampered reconciliation approval signature is rejected before writes", async () => {
  await setup();
  stripeSubscription.livemode = true;
  const target = { databaseHost: "ep-prod-fixture.neon.tech", databaseName: "dg_production_fixture" };
  const dryRun = await reconcileLegacyAppEntitlements({ stripe: stripeApi(stripeSubscription), repository,
    expectedStripeAccountId: "acct_test_fixture", mode: "production", ...target, now });
  const { approval, publicKey } = signedApproval(dryRun.planSha256);
  approval.signature = `${approval.signature[0] === "A" ? "B" : "A"}${approval.signature.slice(1)}`;
  await assert.rejects(reconcileLegacyAppEntitlements({ stripe: stripeApi(stripeSubscription), repository,
    expectedStripeAccountId: "acct_test_fixture", mode: "production", apply: true,
    productionApproval: approval, approvalPublicKey: publicKey, ...target, now }), /does not match this exact plan/);
  assert.deepEqual((await control.platformSubscription.findUnique({ where: { id: candidate.id } })).industryApps, []);
});

test("post-deployment catch-up candidates require a fresh signed plan", async () => {
  await setup();
  stripeSubscription.livemode = true;
  const target = { databaseHost: "ep-prod-fixture.neon.tech", databaseName: "dg_production_fixture" };
  const stripe = stripeApi(stripeSubscription);
  const firstPlan = await reconcileLegacyAppEntitlements({ stripe, repository, expectedStripeAccountId: "acct_test_fixture",
    mode: "production", ...target, now });
  const { approval, publicKey } = signedApproval(firstPlan.planSha256);
  const originalCandidate = await control.platformSubscription.findUnique({ where: { id: candidate.id },
    include: { organisation: { select: { billingCustomerId: true } } } });
  const catchup = { ...candidate, id: "post-deployment-catchup-row", organisationId: "org_post_deploy_catchup",
    stripeCustomerId: "cus_post_deploy_catchup", stripeSubscriptionId: "sub_post_deploy_catchup",
    organisation: { billingCustomerId: "cus_post_deploy_catchup" }, industryApps: [], premiumApps: [] };
  const catchupStripe = { ...stripe, subscriptions: { retrieve: async id => {
    if (id === stripeSubscription.id) return structuredClone(stripeSubscription);
    assert.equal(id, catchup.stripeSubscriptionId);
    const sub = structuredClone(stripeSubscription);
    sub.id = catchup.stripeSubscriptionId; sub.customer = catchup.stripeCustomerId;
    sub.metadata.organisation_id = catchup.organisationId;
    return sub;
  } } };
  repository = { ...repository, listCandidates: async () => [originalCandidate, catchup] };
  const postDeploy = await reconcileLegacyAppEntitlements({ stripe: catchupStripe, repository,
    expectedStripeAccountId: "acct_test_fixture", mode: "production", ...target, now });
  assert.notEqual(postDeploy.planSha256, firstPlan.planSha256);
  assert.equal(postDeploy.results.length, 2);
  assert.equal(postDeploy.results[1].outcome, "reconcile");
  await assert.rejects(reconcileLegacyAppEntitlements({ stripe: catchupStripe, repository,
    expectedStripeAccountId: "acct_test_fixture", mode: "production", apply: true,
    productionApproval: approval, approvalPublicKey: publicKey, ...target, now }), /does not match this exact plan/);
  assert.deepEqual((await control.platformSubscription.findUnique({ where: { id: candidate.id } })).industryApps, []);
});

test("production writer refuses direct writes without a separately authorized plan", async () => {
  await setup();
  const writer = prismaProductionLegacyEntitlementRepository(control, {
    databaseHost: "ep-prod-fixture.neon.tech", databaseName: "dg_production_fixture",
  }, "");
  await assert.rejects(writer.apply({ candidate, industryApps: ["finance"], premiumApps: [], auditKey: "unauthorized", approvalReference: "none", itemFingerprint: "none", planSha256: "unapproved" }), /writer is locked/);
  const row = await control.platformSubscription.findUnique({ where: { id: candidate.id } });
  assert.deepEqual(row.industryApps, []);
});

test("production writer rejects a signed plan when the database URL is not its allowlisted Neon target", async () => {
  await setup();
  const target = { databaseHost: "ep-prod-fixture.neon.tech", databaseName: "dg_production_fixture" };
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const approvedAt = new Date().toISOString();
  const unsigned = { version: 1, mode: "production", planSha256: "a".repeat(64), stripeAccountId: "acct_test_fixture",
    ...target, approvedBy: "release-manager", changeTicket: "CHG-TEST-44", approvedAt,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
  const approval = { ...unsigned, signature: sign(null, Buffer.from(canonicalProductionApproval(unsigned)), privateKey).toString("base64") };
  const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const writer = prismaProductionLegacyEntitlementRepository(control, target, pem);
  const change = { candidateId: candidate.id, organisationId: candidate.organisationId,
    stripeSubscriptionId: candidate.stripeSubscriptionId, stripeCustomerId: candidate.stripeCustomerId,
    updatedAt: candidate.updatedAt.toISOString(), industryApps: ["finance"], premiumApps: [],
    auditKey: "approved-audit", itemFingerprint: "fixture-fingerprint" };
  assert.equal(await writer.authorizeProductionApply({ planSha256: unsigned.planSha256, approval,
    stripeAccountId: unsigned.stripeAccountId, ...target, proposedChanges: [change] }), true);
  await assert.rejects(writer.apply({ candidate, industryApps: change.industryApps, premiumApps: [],
    auditKey: change.auditKey, itemFingerprint: change.itemFingerprint, approvalReference: "CHG-TEST-44:release-manager",
    planSha256: unsigned.planSha256 }), /does not match the approved Neon host/);
  const row = await control.platformSubscription.findUnique({ where: { id: candidate.id } });
  assert.deepEqual(row.industryApps, []);
});

test("partial repository failure is reported and leaves the failed row unchanged", async () => {
  await setup();
  const failingRepository = { ...repository, apply: async () => { throw new Error("fixture write failure"); } };
  const report = await reconcileLegacyAppEntitlements({
    stripe: stripeApi(stripeSubscription), repository: failingRepository,
    expectedStripeAccountId: "acct_test_fixture", apply: true,
    approvalReference: "test:partial-failure", now,
  });
  assert.equal(report.results[0].outcome, "blocked");
  assert.equal(report.results[0].reason, "reconciliation_write_failed");
  const row = await control.platformSubscription.findUnique({ where: { id: candidate.id } });
  assert.deepEqual(row.industryApps, []);
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
    const report = await reconcileLegacyAppEntitlements({ stripe: stripeApi(invalid, false), repository, expectedStripeAccountId: "acct_test_fixture", apply: true, approvalReference: "test:fixture-approved", now });
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
