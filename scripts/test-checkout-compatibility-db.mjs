import assert from "node:assert/strict";
import { before, beforeEach, after, test, mock } from "node:test";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { prisma, PrismaClient } from "@dg/database";
import { admitPlatformCheckout, CheckoutTemporarilyUnavailable } from "../packages/platform-core/src/billing/checkout-creation-gate.ts";
import { createPlatformCheckoutSession, createCustomCommercialCheckoutSession, createNegotiatedCommercialCheckoutSession } from "../packages/platform-core/src/billing/platform-checkout.ts";
import { provisionFromPlatformCheckout, handlePlatformSubscriptionLifecycle } from "../packages/platform-core/src/billing/platform-stripe.ts";
import { getOrganisationCommercialOffer } from "../packages/platform-core/src/billing/commercial-offer.ts";
import { expectedPurchasedLineItems } from "../packages/platform-core/src/billing/purchased-line-items.ts";
import { StripePaymentConnector } from "../packages/platform-core/src/commerce/connectors/stripe/index.ts";
import { processPaymentWebhookEvent } from "../packages/platform-core/src/commerce/payment-engine.ts";
import { applyInvoicePaymentFailed as processInvoiceFailure, applyInvoicePaidRecovery, advanceDunningForSubscription } from "../packages/platform-core/src/billing/billing-service.ts";
import { readPlatformSubscriptionWebhookCutoverHold } from "../packages/platform-core/src/billing/subscription-webhook-cutover-hold.ts";
import { checkoutPost } from "./checkout-test-http.mjs";

const applyInvoicePaymentFailed = input => processInvoiceFailure({ stripeInvoiceId: "in_fixture", ...input });
const control = new PrismaClient();
let org, requests, createWait, loseResponse, beforeAcceptance, remainingAtAcceptance, acceptedSessions, providerSubscription, subscriptionReadHook, providerInvoice, invoiceReadHook, checkoutLineItems;
const priceEnvironmentKeys = ["STRIPE_PRICE_STARTER", "STRIPE_PRICE_GROWTH", "STRIPE_PRICE_PROFESSIONAL", "STRIPE_PRICE_SCALE", "STRIPE_PRICE_BUSINESS"];
const originalPriceEnvironment = new Map(priceEnvironmentKeys.map(key => [key, process.env[key]]));
let configuredPrices;
function fixturePrice({ amount, currency = "aud", interval = "month", intervalCount = 1, active = true }) {
  return { id: "price_fixture", active, currency, unit_amount: amount, recurring: { interval, interval_count: intervalCount } };
}
const waitFor = async predicate => {
  const deadline = Date.now() + 2000;
  while (!predicate()) { if (Date.now() > deadline) throw new Error("Provider fixture did not reach expected state"); await new Promise(r => setTimeout(r, 5)); }
};
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const standard = () => createPlatformCheckoutSession({ organisationId: org.id, email: "fixture@example.test", platformTier: "professional" });
const seedCanonicalSubscription = (platformExempt, providerLinked = false) => prisma.platformSubscription.create({
  data: {
    organisationId: org.id,
    status: "CANCELLED",
    entitlement: "FULL",
    planTier: "professional",
    stripeCustomerId: providerLinked ? providerSubscription.customer : null,
    stripeSubscriptionId: providerLinked ? providerSubscription.id : null,
    stripeStatus: "canceled",
    platformExempt,
  },
});
const offer = { version: 1, id: "fixture", label: "Fixture", status: "agreed", currency: "aud", amountCents: 24900, cadence: "monthly", platformTier: "professional", industryApps: [], industryTemplates: [], premiumApps: [], trialDays: 14, oneOffAmountCents: 5000, oneOffLabel: "Implementation" };
const custom = () => createCustomCommercialCheckoutSession({ organisationId: org.id, email: "fixture@example.test", offer });
const close = () => control.$executeRaw`UPDATE platform_checkout_creation_gate SET blocked = true, revision = revision + 1, changed_at = clock_timestamp() WHERE id = 1`;
function providerItems({ industryApps = [], premiumApps = [], platformTier = "professional", supportPlan = "standard", cadence = "monthly" } = {}) {
  return expectedPurchasedLineItems({ industryApps, premiumApps, platformTier, supportPlan, cadence }).map(line => ({ quantity: 1, price: {
    id: `price_${line.amountCents}_${line.name ?? "configured"}`, unit_amount: line.amountCents, currency: "aud",
    recurring: { interval: cadence === "annual" ? "year" : "month", interval_count: 1 }, product: { name: line.name ?? "Configured DigitalGate plan" },
  } }));
}
before(async () => {
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname, "127.0.0.1"); assert.notEqual(url.port, "5432"); assert.equal(url.pathname, "/dg_checkout_test");
  const [row] = await prisma.$queryRaw`SELECT current_setting('dg.checkout_test_cluster') AS nonce`;
  assert.ok(process.env.DG_CHECKOUT_DB_MARKER); assert.equal(row.nonce, process.env.DG_CHECKOUT_DB_MARKER);
  const [gate] = await prisma.$queryRaw`SELECT blocked, subscription_webhooks_held FROM platform_checkout_creation_gate WHERE id = 1`;
  assert.equal(gate.blocked, true, "migration must seed closed");
  assert.equal(gate.subscription_webhooks_held, false, "hold must remain inactive by default");
  org = await prisma.organisation.create({ data: { name: "Compatibility fixture", slug: `compat-${randomUUID()}` } });
  process.env.STRIPE_SECRET_KEY = "sk_test_no_network_allowed";
  const sdk = new Stripe(process.env.STRIPE_SECRET_KEY);
  mock.method(Object.getPrototypeOf(sdk.accounts), "retrieve", async () => ({ id: "acct_fixture" }));
  mock.method(Object.getPrototypeOf(sdk.balance), "retrieve", async () => ({ livemode: false }));
  mock.method(Object.getPrototypeOf(sdk.prices), "retrieve", async id => {
    const price = configuredPrices.get(id);
    if (!price) throw new Error("Unexpected or unavailable test price");
    return structuredClone(price);
  });
  mock.method(Object.getPrototypeOf(sdk.subscriptions), "list", () => ({ async *[Symbol.asyncIterator]() {} }));
  mock.method(Object.getPrototypeOf(sdk.checkout.sessions), "retrieve", async id => {
    const session = acceptedSessions.find(s => s.id === id);
    if (!session) throw new Error("Unexpected session lookup");
    return structuredClone(session);
  });
  mock.method(Object.getPrototypeOf(sdk.checkout.sessions), "listLineItems", async id => {
    assert.equal(id, "cs_custom_fixture");
    return structuredClone({ data: checkoutLineItems, has_more: false, object: "list", url: "/v1/checkout/sessions/cs_custom_fixture/line_items" });
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
  mock.method(Object.getPrototypeOf(sdk.customers), "retrieve", async id => {
    if (id !== providerSubscription.customer) throw new Error("Unexpected customer read");
    return { id, deleted: false };
  });
  mock.method(Object.getPrototypeOf(sdk.invoices), "retrieve", async id => {
    if (!["in_fixture", "in_review_paid"].includes(id)) throw new Error("Unexpected invoice lookup");
    const snapshot = structuredClone({ ...providerInvoice, id });
    if (invoiceReadHook) await invoiceReadHook();
    return snapshot;
  });
  mock.method(Object.getPrototypeOf(sdk.subscriptions), "retrieve", async id => {
    if (id !== providerSubscription.id) throw new Error("Unexpected subscription read");
    const snapshot = structuredClone(providerSubscription);
    if (subscriptionReadHook) await subscriptionReadHook();
    return snapshot;
  });
});
beforeEach(async () => {
  await prisma.platformCheckoutAttempt.deleteMany();
  await control.$executeRaw`UPDATE platform_checkout_creation_gate SET subscription_webhooks_held = false WHERE id = 1`;
  await prisma.platformSubscription.deleteMany();
  await prisma.opportunity.deleteMany({ where: { organisationId: org.id } });
  await prisma.organisation.update({ where: { id: org.id }, data: { billingCustomerId: null, settings: {} } });
  for (const key of priceEnvironmentKeys) delete process.env[key];
  configuredPrices = new Map();
  subscriptionReadHook = null; invoiceReadHook = null;
  requests = []; createWait = null; loseResponse = false; beforeAcceptance = null; checkoutLineItems = [];
  await prisma.opportunity.create({ data: { organisationId: org.id, title: "Accepted fixture offer", stage: "proposal", metadata: {
    custom_offer_claimed_by_org_id: org.id, custom_offer_claimed_at: "2026-10-19T00:00:00.000Z", custom_offer_token: "fixture-token", commercial_offer: offer,
  } } });
  providerSubscription = { id: "sub_completed_fixture", customer: "cus_completed_fixture", livemode: false, status: "trialing",
    trial_start: 1700000000, trial_end: 1700604800, current_period_start: 1700000000, current_period_end: 1700604800,
    metadata: { organisation_id: org.id, dg_platform_subscription: "true", dg_platform_tier: "professional", dg_billing_cadence: "monthly", dg_support_plan: "standard", dg_industry_apps: "", dg_premium_apps: "" },
    items: { data: providerItems() }, latest_invoice: "in_fixture" };
  providerInvoice = { id: "in_fixture", subscription: providerSubscription.id, customer: providerSubscription.customer,
    livemode: false, status: "open", paid: false, amount_remaining: 24900 };
  remainingAtAcceptance = 2100; acceptedSessions = [];
  await control.$executeRaw`UPDATE platform_checkout_creation_gate SET blocked = false, revision = revision + 1, changed_at = clock_timestamp(), last_admission_expires_at = NULL WHERE id = 1`;
});

test("subscription webhook hold is shared across independent database readers and fails closed when unavailable", async () => {
  const readFromPrisma = () => readPlatformSubscriptionWebhookCutoverHold(async () =>
    prisma.platformCheckoutCreationGate.findUnique({ where: { id: 1 }, select: { subscriptionWebhooksHeld: true } }));
  const readFromControl = () => readPlatformSubscriptionWebhookCutoverHold(async () =>
    control.platformCheckoutCreationGate.findUnique({ where: { id: 1 }, select: { subscriptionWebhooksHeld: true } }));

  await control.platformCheckoutCreationGate.update({ where: { id: 1 }, data: { subscriptionWebhooksHeld: true } });
  assert.equal(await readFromPrisma(), true, "separate app client sees the committed hold");
  assert.equal(await readFromControl(), true);
  await control.platformCheckoutCreationGate.update({ where: { id: 1 }, data: { subscriptionWebhooksHeld: false } });
  assert.equal(await readFromPrisma(), false, "separate app client sees release without process restart");
  await assert.rejects(readPlatformSubscriptionWebhookCutoverHold(async () => null), /hold state is unavailable/);
  await assert.rejects(readPlatformSubscriptionWebhookCutoverHold(async () => ({ subscriptionWebhooksHeld: null })), /hold state is unavailable/);
});
after(async () => {
  mock.restoreAll();
  for (const [key, value] of originalPriceEnvironment) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  await prisma.$disconnect(); await control.$disconnect();
});

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

for (const [tier, envKey, amount] of [
  ["starter", "STRIPE_PRICE_STARTER", 9900],
  ["professional", "STRIPE_PRICE_GROWTH", 24900],
  ["business", "STRIPE_PRICE_SCALE", 49900],
]) {
  test(`${tier} configured Stripe price matches the published monthly AUD catalogue`, async () => {
    process.env[envKey] = `price_${tier}_fixture`;
    configuredPrices.set(process.env[envKey], fixturePrice({ amount }));
    await createPlatformCheckoutSession({ organisationId: org.id, email: "fixture@example.test", platformTier: tier });
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].line_items, [{ quantity: 1, price: `price_${tier}_fixture` }]);
    assert.equal(requests[0].subscription_data.trial_period_days, 14);
  });
}

for (const [label, price] of [
  ["amount", fixturePrice({ amount: 24901 })],
  ["currency", fixturePrice({ amount: 24900, currency: "usd" })],
  ["interval", fixturePrice({ amount: 24900, interval: "year" })],
  ["interval count", fixturePrice({ amount: 24900, intervalCount: 2 })],
  ["inactive status", fixturePrice({ amount: 24900, active: false })],
]) {
  test(`configured Growth Stripe price with mismatched ${label} fails closed`, async () => {
    process.env.STRIPE_PRICE_GROWTH = "price_growth_mismatch";
    configuredPrices.set(process.env.STRIPE_PRICE_GROWTH, price);
    await assert.rejects(standard(), /does not match the published professional monthly AUD catalogue price/);
    assert.equal(requests.length, 0);
  });
}

test("Founding 10 designation keeps standard monthly pricing and 14-day trial", async () => {
  await prisma.organisation.update({
    where: { id: org.id },
    data: { settings: { foundingOnboarding: { stage: "onboarding_started" }, billing: { foundingCustomer: true, programme: "founding" } } },
  });
  await standard();
  assert.equal(requests[0].line_items[0].price_data.unit_amount, 24900);
  assert.equal(requests[0].subscription_data.trial_period_days, 14);
});

// Synthetic equivalents of the two saved onboarding shapes; no customer data.
for (const scenario of [
  { label: "mortgage prospect", tier: "professional", industry: "finance", template: "mortgage-finance-broking", premium: [], staleOffer: true, expiredSession: false },
  { label: "cleaning prospect", tier: "business", industry: "services", template: "cleaning", premium: ["growth_suite"], staleOffer: false, expiredSession: true },
]) test(`${scenario.label}: saved onboarding resumes standard checkout once without activation`, async () => {
  await prisma.opportunity.deleteMany({ where: { organisationId: org.id } });
  const progress = { platformTier: scenario.tier, billingCadence: "monthly", industryApps: [scenario.industry],
    industryTemplates: [scenario.template], premiumApps: scenario.premium, supportPlan: "standard",
    currentStep: "stripe", completedSteps: ["business", "plan", "apps", "order_summary"],
    ...(scenario.expiredSession ? { stripeCheckoutSessionId: "cs_expired_saved_fixture" } : {}) };
  const settings = { gen2Onboarding: progress, billing: { programme: "founding", foundingCustomer: true,
    ...(scenario.staleOffer ? { commercialOffer: { ...offer, id: "historical-unaccepted", amountCents: 94700, trialDays: 0 } } : {}) } };
  await prisma.organisation.update({ where: { id: org.id }, data: { settings } });
  if (scenario.expiredSession) acceptedSessions.push({ id: progress.stripeCheckoutSessionId, mode: "subscription", status: "expired",
    expires_at: 1, metadata: { organisation_id: org.id, dg_platform_checkout: "true" } });
  assert.equal(await getOrganisationCommercialOffer(org.id), null, "historical agreed settings are not an accepted custom contract");
  const input = { organisationId: org.id, email: "fixture@example.test", platformTier: scenario.tier,
    industryApps: progress.industryApps, premiumApps: progress.premiumApps, supportPlan: "standard" };
  const first = await createPlatformCheckoutSession(input);
  const resumed = await createPlatformCheckoutSession(input);
  assert.deepEqual(resumed, first, "resumption returns the same owned open session");
  assert.equal(requests.length, 1, "resumption cannot create a second provider session");
  assert.equal(requests[0].line_items[0].price_data.unit_amount, scenario.tier === "professional" ? 24900 : 49900);
  assert.equal(requests[0].subscription_data.trial_period_days, 14);
  assert.equal(requests[0].metadata.dg_commercial_offer_id, undefined);
  const after = await prisma.organisation.findUniqueOrThrow({ where: { id: org.id } });
  assert.deepEqual(after.settings, settings, "checkout creation/resumption preserves saved progress and historical records");
  assert.equal(after.billingCustomerId, null);
  assert.equal(await prisma.platformSubscription.count({ where: { organisationId: org.id } }), 0, "uncompleted checkout grants no subscription or access");
});

test("only the explicit platform exemption omits the standard trial", async () => {
  await prisma.organisation.update({ where: { id: org.id }, data: { settings: { billing: { platformExempt: true } } } });
  await standard();
  assert.equal(requests[0].subscription_data?.trial_period_days, undefined);
});

test("canonical exemption remains authoritative when organisation settings omit it", async () => {
  await seedCanonicalSubscription(true);
  await standard();
  assert.equal(requests[0].subscription_data?.trial_period_days, undefined);
});

test("canonical non-exemption keeps the standard trial despite stale exempt settings", async () => {
  await seedCanonicalSubscription(false);
  await prisma.organisation.update({ where: { id: org.id }, data: { settings: { billing: { platformExempt: true } } } });
  await standard();
  assert.equal(requests[0].subscription_data.trial_period_days, 14);
});

test("checkout webhook preserves a canonical exemption absent from organisation settings", async () => {
  await seedCanonicalSubscription(true, true);
  await provisionFromPlatformCheckout(completedSession());
  const canonical = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  const owner = await prisma.organisation.findUnique({ where: { id: org.id } });
  assert.equal(canonical.platformExempt, true);
  assert.equal(owner.settings.billing.platformExempt, true);
  assert.equal(canonical.status, "ACTIVE");
});

test("checkout webhook cannot grant a canonical non-exempt subscription from stale settings", async () => {
  await seedCanonicalSubscription(false, true);
  await prisma.organisation.update({ where: { id: org.id }, data: { settings: { billing: { platformExempt: true } } } });
  await provisionFromPlatformCheckout(completedSession());
  const canonical = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  const owner = await prisma.organisation.findUnique({ where: { id: org.id } });
  assert.equal(canonical.platformExempt, false);
  assert.equal(owner.settings.billing.platformExempt, false);
  assert.equal(canonical.status, "TRIALING");
});

test("repeated lifecycle webhook preserves the canonical exemption and remains idempotent", async () => {
  providerSubscription.status = "active";
  await seedCanonicalSubscription(true, true);
  await handlePlatformSubscriptionLifecycle(providerSubscription, "updated", "evt_canonical_exemption");
  await handlePlatformSubscriptionLifecycle(providerSubscription, "updated", "evt_canonical_exemption");
  const canonical = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  const owner = await prisma.organisation.findUnique({ where: { id: org.id } });
  assert.equal(canonical.platformExempt, true);
  assert.equal(owner.settings.billing.platformExempt, true);
  assert.equal(await prisma.platformSubscriptionEvent.count({ where: { stripeEventId: "evt_canonical_exemption:subscription" } }), 1);
});

test("lifecycle webhook cannot override canonical non-exemption from stale settings", async () => {
  providerSubscription.status = "active";
  await seedCanonicalSubscription(false, true);
  await prisma.organisation.update({ where: { id: org.id }, data: { settings: { billing: { platformExempt: true } } } });
  await handlePlatformSubscriptionLifecycle(providerSubscription, "updated", "evt_canonical_non_exemption");
  const canonical = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  const owner = await prisma.organisation.findUnique({ where: { id: org.id } });
  assert.equal(canonical.platformExempt, false);
  assert.equal(owner.settings.billing.platformExempt, false);
});

test("verified lifecycle webhook projects Industry and premium purchases idempotently", async () => {
  providerSubscription.status = "trialing";
  providerSubscription.metadata.dg_industry_apps = "finance";
  providerSubscription.metadata.dg_premium_apps = "voice_ai";
  providerSubscription.items.data = providerItems({ industryApps: ["finance"], premiumApps: ["voice_ai"] });
  await handlePlatformSubscriptionLifecycle(providerSubscription, "created", "evt_app_entitlements");
  await handlePlatformSubscriptionLifecycle(providerSubscription, "created", "evt_app_entitlements");
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.deepEqual(row.industryApps, ["finance"]);
  assert.deepEqual(row.premiumApps, ["voice_ai"]);
  assert.equal(await prisma.platformSubscriptionEvent.count({ where: { stripeEventId: "evt_app_entitlements:subscription" } }), 1);
});

test("actual Stripe line-item removal revokes prior app purchases despite stale metadata", async () => {
  await seedCanonicalSubscription(false, true);
  await prisma.platformSubscription.update({ where: { organisationId: org.id }, data: {
    status: "ACTIVE", entitlement: "FULL", stripeStatus: "active", industryApps: ["finance"], premiumApps: ["voice_ai"],
  } });
  providerSubscription.status = "active";
  providerSubscription.metadata.dg_industry_apps = "finance";
  providerSubscription.metadata.dg_premium_apps = "voice_ai";
  providerSubscription.items.data = providerItems();
  await handlePlatformSubscriptionLifecycle(providerSubscription, "updated", "evt_purchase_line_conflict");
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.status, "ACTIVE");
  assert.deepEqual(row.industryApps, []);
  assert.deepEqual(row.premiumApps, []);
});

test("incomplete purchase metadata cannot erase previously verified entitlements", async () => {
  await seedCanonicalSubscription(false, true);
  await prisma.platformSubscription.update({ where: { organisationId: org.id }, data: {
    status: "ACTIVE", entitlement: "FULL", stripeStatus: "active", industryApps: ["finance"], premiumApps: ["voice_ai"],
  } });
  providerSubscription.status = "active";
  delete providerSubscription.metadata.dg_premium_apps;
  providerSubscription.items.data = providerItems({ industryApps: ["finance"], premiumApps: ["voice_ai"] });
  await handlePlatformSubscriptionLifecycle(providerSubscription, "updated", "evt_incomplete_purchase_metadata");
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.deepEqual(row.industryApps, ["finance"]);
  assert.deepEqual(row.premiumApps, ["voice_ai"]);
});

test("verified subscription item removal revokes only the removed app projection", async () => {
  providerSubscription.status = "active";
  providerSubscription.metadata.dg_industry_apps = "finance,services";
  providerSubscription.metadata.dg_premium_apps = "voice_ai";
  providerSubscription.items.data = providerItems({ industryApps: ["finance", "services"], premiumApps: ["voice_ai"] });
  await handlePlatformSubscriptionLifecycle(providerSubscription, "created", "evt_purchase_before_removal");
  providerSubscription.metadata.dg_industry_apps = "services";
  providerSubscription.metadata.dg_premium_apps = "";
  providerSubscription.items.data = providerItems({ industryApps: ["services"] });
  await handlePlatformSubscriptionLifecycle(providerSubscription, "updated", "evt_verified_purchase_removal");
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.deepEqual(row.industryApps, ["services"]);
  assert.deepEqual(row.premiumApps, []);
});

test("new subscription cannot omit app selections while charging their catalogue line items", async () => {
  providerSubscription.status = "active";
  delete providerSubscription.metadata.dg_industry_apps;
  delete providerSubscription.metadata.dg_industry_templates;
  delete providerSubscription.metadata.dg_premium_apps;
  providerSubscription.items.data = providerItems({ premiumApps: ["voice_ai"] });
  await assert.rejects(
    handlePlatformSubscriptionLifecycle(providerSubscription, "created", "evt_missing_app_selections"),
    /purchase metadata is incomplete/,
  );
  assert.equal(await prisma.platformSubscription.count({ where: { organisationId: org.id } }), 0);
});

test("checkout selection cannot create an Industry entitlement absent from the verified subscription", async () => {
  const session = completedSession();
  session.metadata.dg_industry_apps = "finance";
  await assert.rejects(provisionFromPlatformCheckout(session), /Industry App metadata does not match/);
  assert.equal(await prisma.platformSubscription.count({ where: { organisationId: org.id } }), 0);
});

test("out-of-order lifecycle event projects the latest provider purchases and cancellation expires access", async () => {
  providerSubscription.status = "active";
  providerSubscription.trial_end = null;
  providerSubscription.metadata.dg_industry_apps = "finance";
  providerSubscription.items.data = providerItems({ industryApps: ["finance"] });
  await handlePlatformSubscriptionLifecycle(providerSubscription, "created", "evt_app_old");
  const staleEvent = structuredClone(providerSubscription);
  providerSubscription.metadata.dg_industry_apps = "services,cleaning";
  providerSubscription.items.data = providerItems({ industryApps: ["services", "cleaning"] });
  await handlePlatformSubscriptionLifecycle(staleEvent, "updated", "evt_app_new");
  let row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.deepEqual(row.industryApps, ["services", "cleaning"]);
  providerSubscription.status = "canceled";
  await handlePlatformSubscriptionLifecycle(providerSubscription, "deleted", "evt_app_cancel");
  row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.deepEqual(row.industryApps, ["services", "cleaning"]);
  assert.equal(row.status, "CANCELLED");
});

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
  const result = await provisionFromPlatformCheckout({ ...completedSession(), id: "cs_completed_fixture", payment_status: "no_payment_required" });
  assert.equal(result.ok, true);
  const canonical = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(canonical.stripeSubscriptionId, "sub_completed_fixture"); assert.equal(canonical.entitlement, "FULL");
  assert.equal(requests.length, 0);
});

const completedSession = () => ({ id: "cs_paid_fixture", mode: "subscription", status: "complete", payment_status: "paid", livemode: false,
  customer: providerSubscription.customer, subscription: providerSubscription.id,
  metadata: { dg_platform_checkout: "true", organisation_id: org.id, dg_platform_tier: "professional" } });

function customOfferMetadata() {
  return {
    dg_platform_checkout: "true", organisation_id: org.id,
    dg_platform_tier: offer.platformTier, dg_billing_cadence: offer.cadence,
    dg_industry_apps: "", dg_industry_templates: "", dg_premium_apps: "",
    dg_support_plan: "standard", dg_commercial_offer_id: offer.id,
    dg_commercial_offer_label: offer.label, dg_commercial_offer_version: String(offer.version),
    dg_offer_currency: offer.currency, dg_subscription_amount_cents: String(offer.amountCents),
    dg_one_off_amount_cents: String(offer.oneOffAmountCents), dg_one_off_label: offer.oneOffLabel,
    dg_trial_days: String(offer.trialDays), dg_seats: "",
  };
}

function customProviderLine(id, amount, recurring, name, extra = {}) {
  return { quantity: 1, price: { id, unit_amount: amount, currency: "aud",
    recurring: recurring ? { interval: "month", interval_count: 1 } : null,
    product: { name, metadata: { dg_commercial_offer_id: offer.id, ...extra } } } };
}

function completedCustomSession(metadata = customOfferMetadata()) {
  return { id: "cs_custom_fixture", mode: "subscription", status: "complete", payment_status: "paid", livemode: false,
    customer: providerSubscription.customer, subscription: providerSubscription.id, metadata };
}

test("accepted custom offer provisions only exact recurring and one-off checkout lines", async () => {
  const recurring = customProviderLine("price_custom_recurring", offer.amountCents, true, offer.label);
  const setup = customProviderLine("price_custom_setup", offer.oneOffAmountCents, false, offer.oneOffLabel, { dg_charge_type: "one_off_implementation" });
  providerSubscription.status = "trialing";
  providerSubscription.trial_end = providerSubscription.trial_start + offer.trialDays * 86400;
  providerSubscription.metadata = { ...customOfferMetadata(), dg_platform_subscription: "true" };
  providerSubscription.items = { data: [recurring] };
  checkoutLineItems = [recurring, setup];
  await provisionFromPlatformCheckout(completedCustomSession());
  await provisionFromPlatformCheckout(completedCustomSession());
  const canonical = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(canonical.stripeSubscriptionId, providerSubscription.id);
  assert.deepEqual(canonical.industryApps, []);
  assert.equal(canonical.status, "TRIALING");
  assert.equal(await prisma.platformSubscriptionEvent.count({ where: { stripeEventId: "cs_custom_fixture:checkout" } }), 1);
});

test("custom offer rejects extra or duplicated Checkout lines", async () => {
  const recurring = customProviderLine("price_custom_recurring", offer.amountCents, true, offer.label);
  const setup = customProviderLine("price_custom_setup", offer.oneOffAmountCents, false, offer.oneOffLabel, { dg_charge_type: "one_off_implementation" });
  providerSubscription.status = "trialing";
  providerSubscription.trial_end = providerSubscription.trial_start + offer.trialDays * 86400;
  providerSubscription.metadata = { ...customOfferMetadata(), dg_platform_subscription: "true" };
  providerSubscription.items = { data: [recurring] };
  checkoutLineItems = [recurring, setup, setup];
  await assert.rejects(provisionFromPlatformCheckout(completedCustomSession()), /do not match the accepted offer/);
  assert.equal(await prisma.platformSubscription.count({ where: { organisationId: org.id } }), 0);
});

test("custom offer rejects stale offer metadata and mismatched recurring line", async () => {
  const recurring = customProviderLine("price_custom_recurring", offer.amountCents + 1, true, offer.label);
  const setup = customProviderLine("price_custom_setup", offer.oneOffAmountCents, false, offer.oneOffLabel, { dg_charge_type: "one_off_implementation" });
  providerSubscription.status = "trialing";
  providerSubscription.trial_end = providerSubscription.trial_start + offer.trialDays * 86400;
  providerSubscription.metadata = { ...customOfferMetadata(), dg_platform_subscription: "true" };
  providerSubscription.items = { data: [recurring] };
  checkoutLineItems = [recurring, setup];
  await assert.rejects(provisionFromPlatformCheckout(completedCustomSession({ ...customOfferMetadata(), dg_commercial_offer_id: "stale-offer" })), /stale, unaccepted/);
  await assert.rejects(provisionFromPlatformCheckout(completedCustomSession()), /do not match the accepted offer/);
  assert.equal(await prisma.platformSubscription.count({ where: { organisationId: org.id } }), 0);
});

test("custom offer requires every metadata field written by the creator", async () => {
  const recurring = customProviderLine("price_custom_recurring", offer.amountCents, true, offer.label);
  const setup = customProviderLine("price_custom_setup", offer.oneOffAmountCents, false, offer.oneOffLabel, { dg_charge_type: "one_off_implementation" });
  providerSubscription.status = "trialing";
  providerSubscription.trial_end = providerSubscription.trial_start + offer.trialDays * 86400;
  providerSubscription.metadata = { ...customOfferMetadata(), dg_platform_subscription: "true" };
  providerSubscription.items = { data: [recurring] };
  checkoutLineItems = [recurring, setup];
  for (const key of ["dg_commercial_offer_label", "dg_commercial_offer_version", "dg_offer_currency",
    "dg_platform_tier", "dg_billing_cadence", "dg_support_plan", "dg_subscription_amount_cents",
    "dg_one_off_amount_cents", "dg_one_off_label", "dg_trial_days", "dg_seats",
    "dg_industry_apps", "dg_industry_templates", "dg_premium_apps", "organisation_id"]) {
    const incomplete = customOfferMetadata();
    delete incomplete[key];
    await assert.rejects(provisionFromPlatformCheckout(completedCustomSession(incomplete)),
      key === "organisation_id" ? /ownership.*unconfirmed/ : /do not match the accepted offer/,
      `missing ${key} must fail closed`);
  }
  for (const key of ["dg_commercial_offer_version", "dg_offer_currency", "dg_subscription_amount_cents",
    "dg_one_off_amount_cents", "dg_one_off_label", "dg_trial_days", "dg_seats", "dg_industry_apps",
    "dg_industry_templates", "dg_premium_apps", "organisation_id"]) {
    providerSubscription.metadata = { ...customOfferMetadata(), dg_platform_subscription: "true" };
    delete providerSubscription.metadata[key];
    await assert.rejects(provisionFromPlatformCheckout(completedCustomSession()),
      key === "organisation_id" ? /ownership.*unconfirmed/ : /do not match the accepted offer/,
      `missing subscription ${key} must fail closed`);
  }
  assert.equal(await prisma.platformSubscription.count({ where: { organisationId: org.id } }), 0);
});

test("custom offer rejects forged seats and recurring quantity", async () => {
  const recurring = customProviderLine("price_custom_recurring", offer.amountCents, true, offer.label);
  const setup = customProviderLine("price_custom_setup", offer.oneOffAmountCents, false, offer.oneOffLabel, { dg_charge_type: "one_off_implementation" });
  providerSubscription.status = "trialing";
  providerSubscription.trial_end = providerSubscription.trial_start + offer.trialDays * 86400;
  providerSubscription.metadata = { ...customOfferMetadata(), dg_platform_subscription: "true" };
  providerSubscription.items = { data: [recurring] };
  checkoutLineItems = [recurring, setup];
  await assert.rejects(provisionFromPlatformCheckout(completedCustomSession({ ...customOfferMetadata(), dg_seats: "1" })), /do not match the accepted offer/);
  checkoutLineItems = [{ ...recurring, quantity: 2 }, setup];
  await assert.rejects(provisionFromPlatformCheckout(completedCustomSession()), /do not match the accepted offer/);
  await assert.rejects(provisionFromPlatformCheckout({ ...completedCustomSession(), customer: "cus_foreign" }), /ownership.*unconfirmed/);
  await assert.rejects(provisionFromPlatformCheckout(completedCustomSession({ ...customOfferMetadata(), organisation_id: "org_foreign" })), /ownership.*unconfirmed/);
  assert.equal(await prisma.platformSubscription.count({ where: { organisationId: org.id } }), 0);
});

test("custom offer rejects wrong recurring interval and setup charge", async () => {
  const recurring = customProviderLine("price_custom_recurring", offer.amountCents, true, offer.label);
  const setup = customProviderLine("price_custom_setup", offer.oneOffAmountCents, false, offer.oneOffLabel, { dg_charge_type: "one_off_implementation" });
  providerSubscription.status = "trialing";
  providerSubscription.trial_end = providerSubscription.trial_start + offer.trialDays * 86400;
  providerSubscription.metadata = { ...customOfferMetadata(), dg_platform_subscription: "true" };
  providerSubscription.items = { data: [recurring] };
  checkoutLineItems = [recurring, setup];
  const wrongInterval = structuredClone(recurring);
  wrongInterval.price.recurring.interval = "year";
  checkoutLineItems = [wrongInterval, setup];
  await assert.rejects(provisionFromPlatformCheckout(completedCustomSession()), /do not match the accepted offer/);
  const wrongSetup = customProviderLine("price_custom_setup", offer.oneOffAmountCents + 1, false, offer.oneOffLabel, { dg_charge_type: "one_off_implementation" });
  checkoutLineItems = [recurring, wrongSetup];
  await assert.rejects(provisionFromPlatformCheckout(completedCustomSession()), /do not match the accepted offer/);
  const renamedSetup = customProviderLine("price_custom_setup", offer.oneOffAmountCents, false, "Different label", { dg_charge_type: "one_off_implementation" });
  checkoutLineItems = [recurring, renamedSetup];
  await assert.rejects(provisionFromPlatformCheckout(completedCustomSession()), /do not match the accepted offer/);
  await assert.rejects(provisionFromPlatformCheckout(completedCustomSession({ ...customOfferMetadata(), dg_one_off_label: "Different label" })), /do not match the accepted offer/);
  assert.equal(await prisma.platformSubscription.count({ where: { organisationId: org.id } }), 0);
});

test("custom offer rejects mismatched trial and revoked accepted offer", async () => {
  const recurring = customProviderLine("price_custom_recurring", offer.amountCents, true, offer.label);
  const setup = customProviderLine("price_custom_setup", offer.oneOffAmountCents, false, offer.oneOffLabel, { dg_charge_type: "one_off_implementation" });
  providerSubscription.status = "trialing";
  providerSubscription.trial_end = providerSubscription.trial_start + (offer.trialDays - 1) * 86400;
  providerSubscription.metadata = { ...customOfferMetadata(), dg_platform_subscription: "true" };
  providerSubscription.items = { data: [recurring] };
  checkoutLineItems = [recurring, setup];
  await assert.rejects(provisionFromPlatformCheckout(completedCustomSession({ ...customOfferMetadata(), dg_trial_days: "13" })), /do not match the accepted offer/);
  await assert.rejects(provisionFromPlatformCheckout(completedCustomSession()), /do not match the accepted offer/);
  await prisma.opportunity.updateMany({ where: { organisationId: org.id }, data: { metadata: {
    custom_offer_claimed_by_org_id: org.id, custom_offer_claimed_at: "2026-10-19T00:00:00.000Z", custom_offer_token: "fixture-token",
    commercial_offer: { ...offer, status: "cancelled" },
  } } });
  providerSubscription.trial_end = providerSubscription.trial_start + offer.trialDays * 86400;
  await assert.rejects(provisionFromPlatformCheckout(completedCustomSession()), /stale, unaccepted/);
  assert.equal(await prisma.platformSubscription.count({ where: { organisationId: org.id } }), 0);
});

test("custom checkout creation rejects unaccepted and customer-modified offers", async () => {
  const modified = { ...offer, amountCents: offer.amountCents - 1000 };
  await assert.rejects(createCustomCommercialCheckoutSession({ organisationId: org.id, email: "fixture@example.test", offer: modified }), /exact current offer accepted/);
  await prisma.opportunity.updateMany({ where: { organisationId: org.id }, data: { metadata: { commercial_offer: offer, custom_offer_token: "fixture-token" } } });
  await assert.rejects(custom(), /exact current offer accepted/);
  assert.equal(requests.length, 0);
});

test("paid zero-trial custom checkout projects ACTIVE without fabricating a trial", async () => {
  Object.assign(providerSubscription, { status: "active", trial_start: null, trial_end: null });
  await close(); await provisionFromPlatformCheckout(completedSession());
  const canonical = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(canonical.status, "ACTIVE"); assert.equal(canonical.stripeStatus, "active"); assert.equal(canonical.trialEnd, null);
  const owner = await prisma.organisation.findUnique({ where: { id: org.id } });
  assert.equal(owner.status, "active"); assert.equal(owner.settings.billing.subscriptionStatus, "active");
});

test("custom trial uses provider dates instead of a new default trial", async () => {
  await provisionFromPlatformCheckout(completedSession());
  const canonical = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(canonical.trialStart.getTime(), providerSubscription.trial_start * 1000);
  assert.equal(canonical.trialEnd.getTime(), providerSubscription.trial_end * 1000);
});

test("cancellation delivered before completion records terminal evidence and permits gated, deduplicated restart", async () => {
  const first = await custom();
  Object.assign(acceptedSessions[0], completedSession(), { id: first.sessionId, status: "complete" });
  Object.assign(providerSubscription, { status: "canceled", trial_start: null, trial_end: null });
  await close();
  await handlePlatformSubscriptionLifecycle(providerSubscription, "deleted", "evt_cancel_before_complete");
  const completion = await provisionFromPlatformCheckout(acceptedSessions[0]);
  assert.equal(completion.outcome, "terminal_subscription");
  const canonical = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(canonical.status, "CANCELLED"); assert.equal(canonical.entitlement, "NONE");
  assert.equal(await prisma.platformSubscriptionEvent.count({ where: { organisationId: org.id, type: "checkout.provisioned" } }), 0);
  assert.equal(await prisma.platformSubscriptionEvent.count({ where: { organisationId: org.id, type: "checkout.terminal_observed" } }), 1);
  await assert.rejects(custom(), error => error.outcome === "gate_denied");
  assert.equal(requests.length, 1);
  await control.$executeRaw`UPDATE platform_checkout_creation_gate SET blocked = false WHERE id = 1`;
  const next = await custom(); const replay = await custom();
  assert.notEqual(next.sessionId, first.sessionId); assert.equal(replay.sessionId, next.sessionId);
  assert.equal(requests.length, 2);
  assert.equal((await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } })).entitlement, "NONE");
});

test("scheduled cancellation arriving before checkout completion preserves cancellation and period dates", async () => {
  Object.assign(providerSubscription, { status: "active", trial_start: null, trial_end: null, cancel_at_period_end: true });
  await handlePlatformSubscriptionLifecycle(providerSubscription, "updated", "evt_schedule_before_complete");
  await provisionFromPlatformCheckout(completedSession());
  const canonical = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(canonical.status, "CANCEL_AT_PERIOD_END"); assert.equal(canonical.cancelAtPeriodEnd, true);
  assert.equal(canonical.currentPeriodStart.getTime(), providerSubscription.current_period_start * 1000);
  assert.equal(canonical.currentPeriodEnd.getTime(), providerSubscription.current_period_end * 1000);
});

test("terminal checkout cannot invent cancellation evidence or provisioning", async () => {
  Object.assign(providerSubscription, { status: "canceled" });
  const canonical = await prisma.platformSubscription.create({ data: { organisationId: org.id, status: "CANCELLED", entitlement: "NONE",
    stripeCustomerId: providerSubscription.customer, stripeSubscriptionId: providerSubscription.id, stripeStatus: "canceled" } });
  await assert.rejects(provisionFromPlatformCheckout(completedSession()), /webhook evidence is missing/);
  assert.equal(await prisma.platformSubscriptionEvent.count({ where: { subscriptionId: canonical.id } }), 0);
  assert.equal((await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } })).entitlement, "NONE");
});

test("older compatibility cancellation evidence remains usable with exact provider and canonical identity", async () => {
  Object.assign(providerSubscription, { status: "canceled" });
  await handlePlatformSubscriptionLifecycle(providerSubscription, "deleted", "evt_compat_cancel");
  await prisma.platformSubscriptionEvent.update({ where: { stripeEventId: "evt_compat_cancel:subscription" }, data: {
    payload: { stripeStatus: "canceled", commercialStatus: "CANCELLED", entitlement: "NONE" },
  } });
  const completion = await provisionFromPlatformCheckout(completedSession());
  assert.equal(completion.outcome, "terminal_subscription");
  assert.equal((await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } })).entitlement, "NONE");
});

for (const defect of ["active_event", "foreign_subscription", "foreign_customer"]) {
  test(`terminal observation rejects ${defect} cancellation evidence`, async () => {
    Object.assign(providerSubscription, { status: "canceled" });
    await handlePlatformSubscriptionLifecycle(providerSubscription, "deleted", "evt_conflicting_cancel");
    await prisma.platformSubscriptionEvent.update({ where: { stripeEventId: "evt_conflicting_cancel:subscription" }, data: {
      payload: { stripeStatus: defect === "active_event" ? "active" : "canceled",
        stripeSubscriptionId: defect === "foreign_subscription" ? "sub_foreign" : providerSubscription.id,
        stripeCustomerId: defect === "foreign_customer" ? "cus_foreign" : providerSubscription.customer },
    } });
    await assert.rejects(provisionFromPlatformCheckout(completedSession()), /webhook evidence is missing/);
    assert.equal(await prisma.platformSubscriptionEvent.count({ where: { organisationId: org.id, type: "checkout.terminal_observed" } }), 0);
  });
}

test("completion followed by scheduled cancellation retains the same authoritative projection", async () => {
  Object.assign(providerSubscription, { status: "active", trial_start: null, trial_end: null, cancel_at_period_end: true });
  await provisionFromPlatformCheckout(completedSession());
  await handlePlatformSubscriptionLifecycle(providerSubscription, "updated", "evt_schedule_after_complete");
  const canonical = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(canonical.status, "CANCEL_AT_PERIOD_END"); assert.equal(canonical.cancelAtPeriodEnd, true);
  assert.equal(canonical.currentPeriodEnd.getTime(), providerSubscription.current_period_end * 1000);
});

test("completion then cancellation then completion retry never restores access", async () => {
  Object.assign(providerSubscription, { status: "active", trial_start: null, trial_end: null });
  await provisionFromPlatformCheckout(completedSession());
  Object.assign(providerSubscription, { status: "canceled" });
  await handlePlatformSubscriptionLifecycle(providerSubscription, "deleted", "evt_cancel_after_complete");
  await provisionFromPlatformCheckout(completedSession()); await provisionFromPlatformCheckout(completedSession());
  const canonical = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(canonical.status, "CANCELLED"); assert.equal(canonical.entitlement, "NONE");
  const owner = await prisma.organisation.findUnique({ where: { id: org.id } });
  assert.equal(owner.status, "suspended"); assert.equal(owner.settings.apps.entitlementsSuspended, true);
  assert.equal(await prisma.platformSubscriptionEvent.count({ where: { organisationId: org.id, type: "checkout.terminal_observed" } }), 1);
});

for (const type of ["checkout.session.expired", "payment_intent.payment_failed"]) {
  test(`signed connected-account ${type} cannot mutate another tenant payment request`, async () => {
    const victim = await prisma.commercePaymentRequest.create({ data: { organisationId: org.id, sourceApp: "commerce", providerId: "stripe",
      status: "checkout_open", currency: "AUD", subtotalCents: 100, totalCents: 100, providerSessionId: "cs_victim" } });
    const payload = JSON.stringify({ id: `evt_malicious_${type}`, type, account: "acct_attacker", created: 1700000000,
      data: { object: { id: type.startsWith("checkout.") ? "cs_attacker" : "pi_attacker", created: 1700000000,
        metadata: { organisationId: org.id, paymentRequestId: victim.id } } } });
    const oldSecret = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_isolated_fixture";
    try {
      const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
      const event = await new StripePaymentConnector().parseWebhook(payload, { "stripe-signature": signature });
      const result = await processPaymentWebhookEvent(event);
      assert.equal((await prisma.commercePaymentRequest.findUnique({ where: { id: victim.id } })).status, "checkout_open");
      assert.equal(result.ok, false);
    } finally {
      if (oldSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = oldSecret;
      await prisma.commercePaymentRequest.delete({ where: { id: victim.id } });
    }
  });
}

for (const type of ["checkout.expired", "payment.failed"]) {
  test(`legitimate platform-account ${type} keeps payment request behaviour`, async () => {
    const payment = await prisma.commercePaymentRequest.create({ data: { organisationId: org.id, sourceApp: "commerce", providerId: "stripe",
      status: "checkout_open", currency: "AUD", subtotalCents: 100, totalCents: 100, providerSessionId: "cs_owned" } });
    try {
      const result = await processPaymentWebhookEvent({ type, providerId: "stripe", providerEventId: `evt_platform_${type}`,
        organisationId: org.id, paymentRequestId: payment.id, providerPaymentId: "pi_owned", occurredAt: new Date() });
      assert.equal(result.ok, true);
      assert.equal((await prisma.commercePaymentRequest.findUnique({ where: { id: payment.id } })).status, type === "checkout.expired" ? "expired" : "failed");
    } finally { await prisma.commercePaymentRequest.delete({ where: { id: payment.id } }); }
  });
}

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


for (const conflict of ["customer", "organisation", "mode", "marker", "status"]) {
  test(`checkout projection refuses unconfirmed provider ${conflict} without granting entitlement`, async () => {
    if (conflict === "customer") providerSubscription.customer = "cus_other";
    if (conflict === "organisation") providerSubscription.metadata.organisation_id = "other_org";
    if (conflict === "mode") providerSubscription.livemode = true;
    if (conflict === "marker") providerSubscription.metadata.dg_platform_subscription = "false";
    if (conflict === "status") providerSubscription.status = "incomplete";
    const session = { ...completedSession(), customer: "cus_completed_fixture" };
    await assert.rejects(provisionFromPlatformCheckout(session), /unconfirmed/);
    assert.equal(await prisma.platformSubscription.count({ where: { organisationId: org.id } }), 0);
    const owner = await prisma.organisation.findUnique({ where: { id: org.id } });
    assert.equal(owner.billingCustomerId, null); assert.deepEqual(owner.settings, {});
  });
}


test("stale ACTIVE lifecycle delivery cannot restore cancelled access", async () => {
  providerSubscription.status = "active";
  const stale = structuredClone(providerSubscription);
  await provisionFromPlatformCheckout(completedSession());
  providerSubscription.status = "canceled";
  await handlePlatformSubscriptionLifecycle(providerSubscription, "deleted", "evt_terminal_new");
  await handlePlatformSubscriptionLifecycle(stale, "updated", "evt_active_old");
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.status, "CANCELLED"); assert.equal(row.entitlement, "NONE");
});

test("stale unscheduled lifecycle delivery cannot undo current scheduled cancellation", async () => {
  providerSubscription.status = "active";
  const stale = structuredClone(providerSubscription);
  await provisionFromPlatformCheckout(completedSession());
  providerSubscription.cancel_at_period_end = true;
  await handlePlatformSubscriptionLifecycle(providerSubscription, "updated", "evt_schedule_new");
  await handlePlatformSubscriptionLifecycle(stale, "updated", "evt_schedule_old");
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.status, "CANCEL_AT_PERIOD_END"); assert.equal(row.cancelAtPeriodEnd, true);
});

for (const kind of ["deleted", "updated"]) test(`replaced subscription ${kind} cannot change current identity or access`, async () => {
  providerSubscription.status = "active";
  await provisionFromPlatformCheckout(completedSession());
  const old = { ...structuredClone(providerSubscription), id: "sub_replaced", status: kind === "deleted" ? "canceled" : "active" };
  await handlePlatformSubscriptionLifecycle(old, kind, `evt_replaced_${kind}`);
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.stripeSubscriptionId, providerSubscription.id); assert.equal(row.status, "ACTIVE"); assert.equal(row.entitlement, "FULL");
});

for (const status of ["incomplete", "paused"]) test(`${status} lifecycle never grants active access`, async () => {
  providerSubscription.status = status;
  await handlePlatformSubscriptionLifecycle(providerSubscription, "created", `evt_nonactive_${status}`);
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.entitlement, "NONE"); assert.notEqual(row.status, "ACTIVE"); assert.notEqual(row.status, "TRIALING");
});

for (const mismatch of ["subscription", "customer", "missing_subscription"]) test(`invoice failure ${mismatch} mismatch preserves canonical state`, async () => {
  providerSubscription.status = "active";
  await provisionFromPlatformCheckout(completedSession());
  const before = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  await applyInvoicePaymentFailed({ organisationId: org.id,
    stripeSubscriptionId: mismatch === "missing_subscription" ? undefined : mismatch === "subscription" ? "sub_old" : providerSubscription.id,
    stripeCustomerId: mismatch === "customer" ? "cus_foreign" : providerSubscription.customer, stripeEventId: `evt_invoice_${mismatch}` });
  const after = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(after.status, before.status); assert.equal(after.stripeSubscriptionId, before.stripeSubscriptionId);
  assert.equal(after.stripeCustomerId, before.stripeCustomerId); assert.equal(after.entitlement, before.entitlement);
});

test("invoice failure cannot invent an unconfirmed canonical subscription", async () => {
  await applyInvoicePaymentFailed({ organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: "evt_invoice_unconfirmed" });
  assert.equal(await prisma.platformSubscription.count({ where: { organisationId: org.id } }), 0);
});

test("late invoice failure cannot reactivate a cancelled subscription", async () => {
  providerSubscription.status = "active";
  await provisionFromPlatformCheckout(completedSession());
  providerSubscription.status = "canceled";
  await handlePlatformSubscriptionLifecycle(providerSubscription, "deleted", "evt_cancel_before_invoice");
  await applyInvoicePaymentFailed({ organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: "evt_invoice_late" });
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.status, "CANCELLED"); assert.equal(row.entitlement, "NONE");
});


test("matching invoice failure preserves dunning and event idempotency", async () => {
  providerSubscription.status = "active";
  await provisionFromPlatformCheckout(completedSession());
  providerSubscription.status = "past_due";
  const input = { organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: "evt_matching_invoice" };
  const first = await applyInvoicePaymentFailed(input); const second = await applyInvoicePaymentFailed(input);
  assert.equal(first.status, "PAYMENT_FAILED"); assert.equal(first.entitlement, "FULL_WITH_WARNING");
  assert.equal(second.paymentFailedAt.getTime(), first.paymentFailedAt.getTime());
  assert.equal(await prisma.platformSubscriptionEvent.count({ where: { stripeEventId: input.stripeEventId } }), 1);
});

test("duplicate lifecycle event cannot overwrite subsequent cancellation", async () => {
  providerSubscription.status = "active";
  const stale = structuredClone(providerSubscription);
  await handlePlatformSubscriptionLifecycle(stale, "created", "evt_initial_active");
  providerSubscription.status = "canceled";
  await handlePlatformSubscriptionLifecycle(providerSubscription, "deleted", "evt_new_cancel");
  await handlePlatformSubscriptionLifecycle(stale, "created", "evt_initial_active");
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.status, "CANCELLED"); assert.equal(row.entitlement, "NONE");
  assert.equal(await prisma.platformSubscriptionEvent.count({ where: { stripeEventId: "evt_initial_active:subscription" } }), 1);
});

test("concurrent completion and cancellation serialize provider reads and derived access", async () => {
  providerSubscription.status = "active";
  const entered = deferred(); const release = deferred(); let reads = 0;
  subscriptionReadHook = async () => { if (++reads === 1) { entered.resolve(); await release.promise; } };
  const completion = provisionFromPlatformCheckout(completedSession());
  await entered.promise;
  providerSubscription.status = "canceled";
  const cancellation = handlePlatformSubscriptionLifecycle(providerSubscription, "deleted", "evt_concurrent_cancel");
  release.resolve();
  await Promise.all([completion, cancellation]);
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  const organisation = await prisma.organisation.findUnique({ where: { id: org.id } });
  assert.equal(row.status, "CANCELLED"); assert.equal(row.entitlement, "NONE");
  assert.equal(organisation.settings.apps.entitlementsSuspended, true);
});


test("late checkout completion cannot replace a newer active canonical purchase", async () => {
  providerSubscription.status = "active";
  await provisionFromPlatformCheckout(completedSession());
  await prisma.platformSubscription.update({ where: { organisationId: org.id }, data: { stripeSubscriptionId: "sub_newer" } });
  await assert.rejects(provisionFromPlatformCheckout(completedSession()), /current subscription/);
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.stripeSubscriptionId, "sub_newer"); assert.equal(row.entitlement, "FULL");
});


test("stale lifecycle metadata cannot overwrite the authoritative current tier", async () => {
  providerSubscription.status = "active";
  const stale = structuredClone(providerSubscription); stale.metadata.dg_platform_tier = "starter";
  providerSubscription.metadata.dg_platform_tier = "business";
  providerSubscription.items.data = providerItems({ platformTier: "business" });
  const session = completedSession();
  session.metadata.dg_platform_tier = "business";
  await provisionFromPlatformCheckout(session);
  await handlePlatformSubscriptionLifecycle(stale, "updated", "evt_stale_plan");
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.planTier, "business");
});


test("provider refresh failure rolls back and remains retryable without granting access", async () => {
  providerSubscription.status = "active";
  const event = structuredClone(providerSubscription);
  subscriptionReadHook = async () => { throw new Error("provider temporarily unavailable"); };
  await assert.rejects(handlePlatformSubscriptionLifecycle(event, "created", "evt_retryable_refresh"), /temporarily unavailable/);
  assert.equal(await prisma.platformSubscription.count({ where: { organisationId: org.id } }), 0);
  assert.equal(await prisma.platformSubscriptionEvent.count({ where: { stripeEventId: "evt_retryable_refresh:subscription" } }), 0);
  subscriptionReadHook = null;
  await handlePlatformSubscriptionLifecycle(event, "created", "evt_retryable_refresh");
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.status, "ACTIVE"); assert.equal(row.entitlement, "FULL");
});

test("authoritative foreign tenant metadata rejects lifecycle projection before writes", async () => {
  providerSubscription.status = "active";
  const event = structuredClone(providerSubscription);
  providerSubscription.metadata.organisation_id = "foreign_organisation";
  await assert.rejects(handlePlatformSubscriptionLifecycle(event, "created", "evt_foreign_provider"), /ownership is unconfirmed/);
  assert.equal(await prisma.platformSubscription.count({ where: { organisationId: org.id } }), 0);
  assert.equal(await prisma.platformSubscriptionEvent.count({ where: { stripeEventId: "evt_foreign_provider:subscription" } }), 0);
});


test("paused subscription clears the dunning clock so cron cannot restore paid access", async () => {
  providerSubscription.status = "active";
  await provisionFromPlatformCheckout(completedSession());
  providerSubscription.status = "past_due";
  await applyInvoicePaymentFailed({ organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: "evt_before_pause" });
  providerSubscription.status = "paused";
  await handlePlatformSubscriptionLifecycle(providerSubscription, "updated", "evt_pause_after_failure");
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.entitlement, "NONE"); assert.equal(row.paymentFailedAt, null);
});


test("old invoice-paid event cannot recover the current subscription", async () => {
  providerSubscription.status = "active";
  await provisionFromPlatformCheckout(completedSession());
  providerSubscription.status = "past_due";
  await applyInvoicePaymentFailed({ organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: "evt_current_failure" });
  await applyInvoicePaidRecovery({ organisationId: org.id, stripeSubscriptionId: "sub_old", stripeCustomerId: providerSubscription.customer,
    stripeEventId: "evt_old_paid" });
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.status, "PAYMENT_FAILED"); assert.equal(row.entitlement, "FULL_WITH_WARNING");
});

test("invoice-paid recovery cannot activate a paused subscription", async () => {
  providerSubscription.status = "paused";
  await handlePlatformSubscriptionLifecycle(providerSubscription, "updated", "evt_paused_before_paid");
  await applyInvoicePaidRecovery({ organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: "evt_paid_while_paused" });
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.entitlement, "NONE"); assert.equal(row.stripeStatus, "paused");
});

test("stale dunning snapshot cannot overwrite a subsequent cancellation", async () => {
  providerSubscription.status = "active";
  await provisionFromPlatformCheckout(completedSession());
  providerSubscription.status = "past_due";
  const stale = await applyInvoicePaymentFailed({ organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: "evt_dunning_stale" });
  providerSubscription.status = "canceled";
  await handlePlatformSubscriptionLifecycle(providerSubscription, "deleted", "evt_dunning_cancel" );
  await advanceDunningForSubscription(stale, new Date(stale.paymentFailedAt.getTime() + 10 * 86400000));
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.entitlement, "NONE"); assert.equal(row.status, "CANCELLED");
});


test("matching invoice-paid recovery uses current provider health and remains idempotent", async () => {
  providerSubscription.status = "active";
  await provisionFromPlatformCheckout(completedSession());
  providerSubscription.status = "past_due";
  await applyInvoicePaymentFailed({ organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: "evt_valid_failure" });
  const input = { organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: "evt_valid_recovery" };
  providerSubscription.status = "active"; providerInvoice.status = "paid"; providerInvoice.paid = true; providerInvoice.amount_remaining = 0;
  const first = await applyInvoicePaidRecovery(input); const second = await applyInvoicePaidRecovery(input);
  assert.equal(first.status, "ACTIVE"); assert.equal(first.entitlement, "FULL"); assert.equal(first.paymentFailedAt, null);
  assert.equal(second.entitlement, "FULL");
  assert.equal(await prisma.platformSubscriptionEvent.count({ where: { stripeEventId: `${input.stripeEventId}:recovery` } }), 1);
});

test("stale dunning snapshot cannot replace a newer subscription", async () => {
  providerSubscription.status = "active";
  await provisionFromPlatformCheckout(completedSession());
  providerSubscription.status = "past_due";
  const stale = await applyInvoicePaymentFailed({ organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: "evt_replaced_dunning" });
  await prisma.platformSubscription.update({ where: { organisationId: org.id }, data: {
    stripeSubscriptionId: "sub_replacement", status: "ACTIVE", entitlement: "FULL", stripeStatus: "active", paymentFailedAt: null } });
  await advanceDunningForSubscription(stale, new Date(stale.paymentFailedAt.getTime() + 10 * 86400000));
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.stripeSubscriptionId, "sub_replacement"); assert.equal(row.status, "ACTIVE"); assert.equal(row.entitlement, "FULL");
});

test("independent: delayed failure after paid recovery must preserve healthy state", async () => {
  providerSubscription.status = "active";
  await provisionFromPlatformCheckout(completedSession());
  await applyInvoicePaidRecovery({ organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: "evt_review_paid_first" });
  await applyInvoicePaymentFailed({ organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeInvoiceId: "in_review_paid", stripeEventId: "evt_review_old_failure_late" });
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.status, "ACTIVE"); assert.equal(row.paymentFailedAt, null);
});

test("independent: scheduled cancellation plus successful recovery must clear dunning", async () => {
  providerSubscription.status = "active";
  await provisionFromPlatformCheckout(completedSession());
  providerSubscription.status = "past_due";
  await applyInvoicePaymentFailed({ organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: "evt_review_failure" });
  providerSubscription.status = "active"; providerInvoice.status = "paid"; providerInvoice.paid = true; providerInvoice.amount_remaining = 0;
  providerSubscription.cancel_at_period_end = true;
  await applyInvoicePaidRecovery({ organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: "evt_review_recovery" });
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  await advanceDunningForSubscription(row, new Date((row.paymentFailedAt?.getTime() ?? Date.now()) + 10 * 86400000));
  const after = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(after.status, "CANCEL_AT_PERIOD_END"); assert.equal(after.paymentFailedAt, null);
});


test("provisioning provider timeout rolls back and a retry can succeed", async () => {
  providerSubscription.status = "active";
  const stuck = deferred(); let entered = false;
  subscriptionReadHook = async () => { entered = true; await stuck.promise; };
  const started = Date.now();
  const pending = provisionFromPlatformCheckout(completedSession());
  await waitFor(() => entered);
  try {
    await assert.rejects(Promise.race([pending, new Promise((_, reject) => setTimeout(() => reject(new Error("Review deadline exceeded")), 6500))]), /provider read.*timed out/i);
    assert.ok(Date.now() - started < 6500);
    assert.equal(await prisma.platformSubscription.count({ where: { organisationId: org.id } }), 0);
    assert.equal(await prisma.platformSubscriptionEvent.count({ where: { organisationId: org.id } }), 0);
  } finally { stuck.resolve(); await pending.catch(() => {}); subscriptionReadHook = null; }
  const result = await provisionFromPlatformCheckout(completedSession());
  assert.equal(result.ok, true);
});


for (const health of ["active", "trialing"]) test(`${health} recovery with scheduled cancellation clears dunning and remains scheduled after cron`, async () => {
  providerSubscription.status = "active";
  await provisionFromPlatformCheckout(completedSession());
  providerSubscription.status = "past_due";
  await applyInvoicePaymentFailed({ organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: `evt_schedule_failure_${health}` });
  providerSubscription.status = health; providerSubscription.cancel_at_period_end = true;
  providerInvoice.status = "paid"; providerInvoice.paid = true; providerInvoice.amount_remaining = 0;
  const row = await applyInvoicePaidRecovery({ organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: `evt_schedule_recovery_${health}` });
  assert.equal(row.status, "CANCEL_AT_PERIOD_END"); assert.equal(row.paymentFailedAt, null); assert.equal(row.gracePeriodEndsAt, null);
  await advanceDunningForSubscription(row, new Date(Date.now() + 10 * 86400000));
  const after = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(after.status, "CANCEL_AT_PERIOD_END"); assert.equal(after.cancelAtPeriodEnd, true); assert.equal(after.entitlement, "FULL");
});

test("genuinely unpaid scheduled cancellation retains dunning protection", async () => {
  providerSubscription.status = "active";
  await provisionFromPlatformCheckout(completedSession());
  providerSubscription.status = "past_due"; providerSubscription.cancel_at_period_end = true;
  await handlePlatformSubscriptionLifecycle(providerSubscription, "updated", "evt_unpaid_scheduled");
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.status, "PAYMENT_FAILED"); assert.ok(row.paymentFailedAt); assert.equal(row.cancelAtPeriodEnd, true);
  await advanceDunningForSubscription(row, new Date(row.paymentFailedAt.getTime() + 10 * 86400000));
  const after = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(after.status, "PAST_DUE"); assert.notEqual(after.entitlement, "FULL");
});

test("concurrent delayed failure and recovery serialize and retain healthy access", async () => {
  providerSubscription.status = "active";
  await provisionFromPlatformCheckout(completedSession());
  providerSubscription.status = "past_due";
  const entered = deferred(); const release = deferred();
  invoiceReadHook = async () => { entered.resolve(); await release.promise; };
  const failure = applyInvoicePaymentFailed({ organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: "evt_concurrent_failure" });
  await entered.promise;
  providerSubscription.status = "active"; providerInvoice.status = "paid"; providerInvoice.paid = true; providerInvoice.amount_remaining = 0;
  const recovery = applyInvoicePaidRecovery({ organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: "evt_concurrent_recovery" });
  release.resolve(); await Promise.all([failure, recovery]);
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.status, "ACTIVE"); assert.equal(row.paymentFailedAt, null);
  assert.equal(await prisma.platformSubscriptionEvent.count({ where: { stripeEventId: "evt_concurrent_failure" } }), 1);
});

for (const conflict of ["customer", "subscription", "mode"]) test(`invoice ${conflict} ownership conflict performs no mutation`, async () => {
  providerSubscription.status = "active";
  await provisionFromPlatformCheckout(completedSession());
  providerSubscription.status = "past_due";
  if (conflict === "customer") providerInvoice.customer = "cus_foreign";
  if (conflict === "subscription") providerInvoice.subscription = "sub_foreign";
  if (conflict === "mode") providerInvoice.livemode = true;
  await assert.rejects(applyInvoicePaymentFailed({ organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: `evt_conflict_${conflict}` }), /ownership is unconfirmed/);
  const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(row.status, "ACTIVE"); assert.equal(row.paymentFailedAt, null);
  assert.equal(await prisma.platformSubscriptionEvent.count({ where: { stripeEventId: `evt_conflict_${conflict}` } }), 0);
});

test("invoice provider timeout preserves canonical state and permits retry", async () => {
  providerSubscription.status = "active";
  await provisionFromPlatformCheckout(completedSession()); providerSubscription.status = "past_due";
  const stuck = deferred(); invoiceReadHook = () => stuck.promise;
  const input = { organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: "evt_invoice_timeout" };
  try { await assert.rejects(applyInvoicePaymentFailed(input), /provider read.*timed out/i); }
  finally { stuck.resolve(); invoiceReadHook = null; }
  const before = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
  assert.equal(before.status, "ACTIVE"); assert.equal(before.paymentFailedAt, null);
  assert.equal(await prisma.platformSubscriptionEvent.count({ where: { stripeEventId: input.stripeEventId } }), 0);
  const recovered = await applyInvoicePaymentFailed(input); assert.equal(recovered.status, "PAYMENT_FAILED");
  assert.equal(await prisma.platformSubscriptionEvent.count({ where: { stripeEventId: input.stripeEventId } }), 1);
});


test("paid-app provisioning reuses the verified subscription snapshot", async () => {
  providerSubscription.status = "active"; providerSubscription.metadata.dg_premium_apps = "growth_suite";
  const session = completedSession(); session.metadata.dg_premium_apps = "growth_suite";
  providerSubscription.items.data = providerItems({ premiumApps: ["growth_suite"] });
  let reads = 0; subscriptionReadHook = async () => { reads++; };
  await provisionFromPlatformCheckout(session);
  assert.equal(reads, 1);
});

test("reused provider snapshot rejects unpaid app metadata before provisioning", async () => {
  providerSubscription.status = "active"; providerSubscription.metadata.dg_premium_apps = "";
  const session = completedSession(); session.metadata.dg_premium_apps = "growth_suite";
  await assert.rejects(provisionFromPlatformCheckout(session), /premium-app metadata does not match/);
  assert.equal(await prisma.platformSubscription.count({ where: { organisationId: org.id } }), 0);
});

for (const kind of ["invoice.payment_failed", "invoice.paid", "invoice.payment_action_required"]) test(`signed Dahlia ${kind} reaches canonical production projection`, async () => {
  providerSubscription.status = "active"; await provisionFromPlatformCheckout(completedSession());
  providerSubscription.status = "past_due";
  await applyInvoicePaymentFailed({ organisationId: org.id, stripeSubscriptionId: providerSubscription.id,
    stripeCustomerId: providerSubscription.customer, stripeEventId: `evt_dahlia_initial_${kind}` });
  if (kind === "invoice.paid") { providerSubscription.status = "active"; providerInvoice.status = "paid"; providerInvoice.paid = true; providerInvoice.amount_remaining = 0; }
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET; process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_fixture";
  try {
    const payload = JSON.stringify({ id: `evt_dahlia_${kind}`, type: kind, api_version: "2026-05-27.dahlia", created: 1700000000,
      data: { object: { ...providerInvoice, subscription: undefined,
        parent: { type: "subscription_details", subscription_details: { subscription: providerSubscription.id, metadata: providerSubscription.metadata } } } } });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
    const event = await new StripePaymentConnector().parseWebhook(payload, { "stripe-signature": signature });
    const input = { organisationId: event.organisationId, stripeSubscriptionId: event.stripeSubscriptionId,
      stripeCustomerId: event.providerCustomerId, stripeEventId: event.providerEventId, stripeInvoiceId: event.stripeInvoiceId };
    const project = kind === "invoice.paid" ? applyInvoicePaidRecovery : applyInvoicePaymentFailed;
    await project(input); await project(input);
    const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
    assert.equal(row.status, kind === "invoice.paid" ? "ACTIVE" : "PAYMENT_FAILED");
    assert.equal(row.stripeSubscriptionId, providerSubscription.id); assert.equal(row.stripeCustomerId, providerSubscription.customer);
    assert.equal(await prisma.platformSubscriptionEvent.count({ where: { stripeEventId: kind === "invoice.paid" ? `${input.stripeEventId}:recovery` : input.stripeEventId } }), 1);
  } finally { if (previousSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = previousSecret; }
});

for (const state of ["paused", "resumed"]) test(`signed Dahlia subscription ${state} projects authoritative access`, async () => {
  providerSubscription.status = "active"; await provisionFromPlatformCheckout(completedSession());
  providerSubscription.status = state === "paused" ? "paused" : "active";
  if (state === "resumed") {
    await prisma.platformSubscription.update({ where: { organisationId: org.id }, data: { status: "SUSPENDED", entitlement: "NONE", stripeStatus: "paused" } });
  }
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET; process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_fixture";
  try {
    const payload = JSON.stringify({ id: `evt_dahlia_${state}`, type: `customer.subscription.${state}`, api_version: "2026-05-27.dahlia", created: 1700000000,
      data: { object: { ...providerSubscription, current_period_start: undefined, current_period_end: undefined,
        items: { data: [{ current_period_start: 1700000000, current_period_end: 1700604800 }] } } } });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
    const event = await new StripePaymentConnector().parseWebhook(payload, { "stripe-signature": signature });
    assert.equal(event.type, "subscription.updated");
    await handlePlatformSubscriptionLifecycle(event.raw, "updated", event.providerEventId);
    await handlePlatformSubscriptionLifecycle(event.raw, "updated", event.providerEventId);
    const row = await prisma.platformSubscription.findUnique({ where: { organisationId: org.id } });
    assert.equal(row.entitlement, state === "paused" ? "NONE" : "FULL"); assert.equal(row.stripeStatus, providerSubscription.status);
    assert.equal(await prisma.platformSubscriptionEvent.count({ where: { stripeEventId: `${event.providerEventId}:subscription` } }), 1);
  } finally { if (previousSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = previousSecret; }
});
