import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import { mapCheckoutCompleted } from "../packages/platform-core/src/commerce/connectors/stripe/index.ts";

const orgId = "org_fixture";
const customerId = "cus_fixture";
const subscriptionId = "sub_fixture";
const platformSubscriptionMetadata = {
  dg_platform_subscription: "true",
  dg_platform_tier: "growth",
  organisation_id: orgId,
};

function invoiceEvent(type, overrides = {}) {
  const invoice = {
    id: "in_fixture",
    customer: customerId,
    subscription: subscriptionId,
    subscription_details: { metadata: platformSubscriptionMetadata },
    metadata: {},
    period_start: 1_792_000_000,
    period_end: 1_794_592_000,
    ...overrides,
  };
  return {
    providerEventId: `evt_${type}`,
    providerCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    organisationId: orgId,
    platformTier: "growth",
    type,
    raw: invoice,
  };
}

function subscriptionEvent(type, overrides = {}) {
  return {
    providerEventId: `evt_${type}`,
    providerCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    organisationId: orgId,
    type,
    raw: {
      id: subscriptionId,
      customer: customerId,
      metadata: platformSubscriptionMetadata,
      ...overrides,
    },
  };
}

function checkoutEvent(overrides = {}) {
  return {
    providerEventId: "cs_fixture",
    organisationId: orgId,
    type: "checkout.completed",
    raw: {
      id: "cs_fixture",
      mode: "subscription",
      customer: customerId,
      subscription: subscriptionId,
      metadata: { dg_platform_checkout: "true", organisation_id: orgId },
      ...overrides,
    },
  };
}

function loadRoute({
  event,
  hold = false,
  holdError = null,
  owner = { id: orgId, billingCustomerId: customerId },
  platformSubscription = null,
  customerOwner = null,
  ownershipError = null,
  memberships = [{ organisationId: orgId }],
  commerceSubscriptions = [],
} = {}) {
  let receiptClaims = 0;
  let handlers = 0;
  let platformMutations = 0;
  const seen = new Set();
  const guardChecks = [];
  const provisionedSessions = [];
  const invoiceMutations = [];

  class PlatformSubscriptionWebhookHoldUnavailableError extends Error {
    code = "PLATFORM_SUBSCRIPTION_WEBHOOK_HOLD_UNAVAILABLE";
  }

  const database = {
    membership: { async findMany() { if (ownershipError) throw ownershipError; return memberships; } },
    commerceSubscription: { async findMany() { if (ownershipError) throw ownershipError; return commerceSubscriptions; } },
    organisation: {
      async findUnique({ where }) {
        if (ownershipError) throw ownershipError;
        if (where.id) return owner?.id === where.id ? owner : null;
        if (where.billingCustomerId) {
          return customerOwner?.billingCustomerId === where.billingCustomerId ? customerOwner :
            owner?.billingCustomerId === where.billingCustomerId ? owner : null;
        }
        return null;
      },
    },
    platformSubscription: {
      async findUnique({ where }) {
        if (ownershipError) throw ownershipError;
        if (where.stripeSubscriptionId) {
          return platformSubscription?.stripeSubscriptionId === where.stripeSubscriptionId
            ? platformSubscription
            : null;
        }
        if (where.stripeCustomerId) {
          return platformSubscription?.stripeCustomerId === where.stripeCustomerId
            ? platformSubscription
            : null;
        }
        return null;
      },
    },
  };

  const platform = {
    bootPaymentConnectors() {},
    requirePaymentConnector: () => ({ parseWebhook: async () => event }),
    prismaReceiptStore: () => ({}),
    PlatformSubscriptionWebhookHoldUnavailableError,
    isPlatformSubscription: (subscription) => Boolean(
      subscription?.metadata?.dg_platform_subscription === "true" || subscription?.metadata?.dg_platform_tier,
    ),
    isPlatformCheckoutSession: (session) => session?.metadata?.dg_platform_checkout === "true",
    withWebhookReceiptState: async ({ eventId, requireSubscriptionWebhookOpen, handle }) => {
      guardChecks.push(requireSubscriptionWebhookOpen);
      if (requireSubscriptionWebhookOpen) {
        if (holdError) throw new PlatformSubscriptionWebhookHoldUnavailableError({ cause: holdError });
        if (hold) return { status: "held" };
      }
      if (seen.has(eventId)) return { status: "duplicate", reason: "already_processed" };
      seen.add(eventId);
      receiptClaims++;
      handlers++;
      return { status: "processed", result: await handle() };
    },
    handlePlatformSubscriptionLifecycle: async () => { platformMutations++; return { ok: true }; },
    applyInvoicePaymentFailed: async input => { invoiceMutations.push(input); platformMutations++; return { status: "ACTIVE", entitlement: "FULL" }; },
    applyInvoicePaidRecovery: async input => { invoiceMutations.push(input); platformMutations++; return { status: "ACTIVE" }; },
    provisionFromPlatformCheckout: async session => { provisionedSessions.push(session); platformMutations++; return { ok: true }; },
    resolveOrganisationIdByConnectAccount: async () => undefined,
    isCommerceCustomerSubscription: (subscription) => Boolean(subscription?.metadata?.organisation_id),
    syncCommerceSubscriptionFromStripe: async () => ({ ok: true }),
    processPaymentWebhookEvent: async () => ({ ok: true }),
    accrueMonthlyReferralCreditFromInvoice: async () => null,
    accruePartnerCommissionFromInvoice: async () => null,
  };

  const source = ts.transpileModule(readFileSync("src/app/api/webhooks/stripe/route.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require: (name) => {
      if (name === "@dg/platform-core") return platform;
      if (name === "@dg/database") return { prisma: database };
      if (name === "next/server") return { NextResponse: { json: Response.json } };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    Response,
    process: { env: { STRIPE_SECRET_KEY: "sk_test_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture" } },
    console: { info() {}, error() {}, warn() {} },
  });

  return {
    async post() {
      return exports.POST(new Request("https://fixture.test/api/webhooks/stripe", { method: "POST", body: "fixture" }));
    },
    setHold(value) { hold = value; },
    get receiptClaims() { return receiptClaims; },
    get handlers() { return handlers; },
    get platformMutations() { return platformMutations; },
    get guardChecks() { return guardChecks; },
    get provisionedSessions() { return provisionedSessions; },
    get invoiceMutations() { return invoiceMutations; },
  };
}

const guardedEvents = [
  ["customer.subscription.created → subscription.created", subscriptionEvent("subscription.created")],
  ["customer.subscription.updated → subscription.updated", subscriptionEvent("subscription.updated")],
  ["customer.subscription.deleted → subscription.cancelled", subscriptionEvent("subscription.cancelled")],
  ["checkout.session.completed → checkout.completed", checkoutEvent()],
  ["checkout.session.async_payment_succeeded → checkout.completed", checkoutEvent()],
  ["invoice.payment_failed", invoiceEvent("invoice.payment_failed")],
  ["invoice.payment_action_required", invoiceEvent("invoice.payment_action_required")],
  ["invoice.paid", invoiceEvent("invoice.paid")],
];

for (const [label, event] of guardedEvents) {
  test(`${label} receives retryable 503 before receipt claim while held`, async () => {
    const app = loadRoute({ event, hold: true });
    const response = await app.post();
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "60");
    assert.equal(app.receiptClaims, 0);
    assert.equal(app.handlers, 0);
    assert.equal(app.platformMutations, 0);
    assert.deepEqual(app.guardChecks, [true]);
  });
}

test("held checkout event retries after release and its duplicate remains idempotent", async () => {
  const app = loadRoute({ event: checkoutEvent(), hold: true });
  assert.equal((await app.post()).status, 503);
  assert.equal(app.receiptClaims, 0);
  app.setHold(false);
  assert.equal((await app.post()).status, 200);
  assert.equal((await app.post()).status, 200);
  assert.equal(app.receiptClaims, 1);
  assert.equal(app.platformMutations, 1);
});

test("platform subscription can be identified by canonical subscription ownership without metadata", async () => {
  const event = subscriptionEvent("subscription.updated", { metadata: {} });
  const app = loadRoute({
    event,
    hold: true,
    platformSubscription: { organisationId: orgId, stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId },
  });
  assert.equal((await app.post()).status, 503);
  assert.equal(app.receiptClaims, 0);
  assert.deepEqual(app.guardChecks, [true]);
});

test("platform marker with unknown organisation or conflicting customer fails closed", async () => {
  const unknownOrg = loadRoute({ event: subscriptionEvent("subscription.updated"), hold: true, owner: null });
  assert.equal((await unknownOrg.post()).status, 503);
  assert.equal(unknownOrg.receiptClaims, 0);

  const conflict = loadRoute({
    event: checkoutEvent(),
    hold: true,
    owner: { id: orgId, billingCustomerId: "cus_other" },
  });
  assert.equal((await conflict.post()).status, 503);
  assert.equal(conflict.receiptClaims, 0);
});

test("ownership lookup failure returns retryable 503 without claiming", async () => {
  const app = loadRoute({ event: invoiceEvent("invoice.payment_failed"), ownershipError: new Error("DB unavailable") });
  const response = await app.post();
  assert.equal(response.status, 503);
  assert.equal(app.receiptClaims, 0);
  assert.equal(app.platformMutations, 0);
});

test("known non-platform subscription and invoice events preserve normal unrelated processing", async () => {
  const subscription = loadRoute({
    event: subscriptionEvent("subscription.updated", { metadata: { organisation_id: orgId } }),
    hold: true,
  });
  assert.equal((await subscription.post()).status, 200);
  assert.deepEqual(subscription.guardChecks, [false]);
  assert.equal(subscription.receiptClaims, 1);

  const invoice = loadRoute({
    event: invoiceEvent("invoice.payment_failed", {
      subscription_details: { metadata: { organisation_id: orgId, dg_commerce_subscription: "true" } },
    }),
    hold: true,
    owner: null,
  });
  assert.equal((await invoice.post()).status, 200);
  assert.deepEqual(invoice.guardChecks, [false]);
  assert.equal(invoice.receiptClaims, 1);
  assert.equal(invoice.platformMutations, 0);
});

for (const type of ["invoice.payment_failed", "invoice.payment_action_required", "invoice.paid"]) {
  const commerceEvent = () => invoiceEvent(type, {
    subscription_details: { metadata: { organisation_id: orgId, dg_commerce_subscription: "true" } },
  });
  for (const stripeSubscriptionId of [null, "sub_platform", subscriptionId]) {
    test(`${type}: commerce marker cannot bypass a canonical platform customer without commerce evidence (${stripeSubscriptionId})`, async () => {
      const app = loadRoute({ event: commerceEvent(), hold: true,
        platformSubscription: { organisationId: orgId, stripeCustomerId: customerId, stripeSubscriptionId } });
      assert.equal((await app.post()).status, 503);
      assert.equal(app.receiptClaims, 0);
      assert.equal(app.handlers, 0);
      assert.equal(app.platformMutations, 0);
    });
  }
  test(`${type}: commerce-only customer remains unrelated and unheld`, async () => {
    const app = loadRoute({ event: commerceEvent(), hold: true, owner: null });
    assert.equal((await app.post()).status, 200);
    assert.deepEqual(app.guardChecks, [false]);
    assert.equal(app.receiptClaims, 1);
    assert.equal(app.platformMutations, 0);
  });
  test(`${type}: distinct corroborated commerce subscription permits a shared customer`, async () => {
    const app = loadRoute({ event: commerceEvent(), hold: true,
      platformSubscription: { organisationId: orgId, stripeCustomerId: customerId, stripeSubscriptionId: "sub_platform" },
      commerceSubscriptions: [{ organisationId: orgId, metadata: { customerId } }] });
    assert.equal((await app.post()).status, 200);
    assert.deepEqual(app.guardChecks, [false]);
    assert.equal(app.platformMutations, 0);
  });
  test(`${type}: commerce record cannot override an unresolved platform subscription`, async () => {
    const app = loadRoute({ event: commerceEvent(),
      platformSubscription: { organisationId: orgId, stripeCustomerId: customerId, stripeSubscriptionId: null },
      commerceSubscriptions: [{ organisationId: orgId, metadata: { customerId } }] });
    assert.equal((await app.post()).status, 503);
    assert.equal(app.receiptClaims, 0);
  });
  test(`${type}: connected-account commerce marker remains isolated despite platform lookup failure`, async () => {
    const app = loadRoute({ event: { ...commerceEvent(), connectAccountId: "acct_fixture" }, hold: true,
      ownershipError: new Error("must not consult platform ownership") });
    assert.equal((await app.post()).status, 200);
    assert.deepEqual(app.guardChecks, [false]);
    assert.equal(app.platformMutations, 0);
  });
}

for (const type of ["invoice.payment_failed", "invoice.payment_action_required", "invoice.paid"]) {
  for (const mapping of ["organisation", "subscription"]) {
    test(`${type}: canonical ${mapping} customer fallback is held, recovers once after release`, async () => {
      const event = invoiceEvent(type, { subscription_details: { metadata: {} }, metadata: {} });
      delete event.organisationId;
      const app = loadRoute({ event, hold: true,
        owner: { id: orgId, billingCustomerId: mapping === "organisation" ? customerId : null },
        platformSubscription: mapping === "subscription"
          ? { organisationId: orgId, stripeCustomerId: customerId, stripeSubscriptionId: null } : null,
      });
      assert.equal((await app.post()).status, 503);
      assert.equal(app.receiptClaims, 0);
      app.setHold(false);
      assert.equal((await app.post()).status, 200);
      assert.equal((await app.post()).status, 200);
      assert.equal(app.receiptClaims, 1);
      assert.equal(app.invoiceMutations.length, 1);
      assert.equal(app.invoiceMutations[0].organisationId, orgId);
    });
  }
  test(`${type}: unknown subscription ownership remains retryable and unclaimed`, async () => {
    const app = loadRoute({ event: invoiceEvent(type, { subscription_details: { metadata: {} }, metadata: {} }), owner: null });
    assert.equal((await app.post()).status, 503);
    assert.equal(app.receiptClaims, 0);
    assert.equal(app.platformMutations, 0);
  });
  test(`${type}: conflicting customer owners fail closed`, async () => {
    const app = loadRoute({ event: invoiceEvent(type, { subscription_details: { metadata: {} } }),
      platformSubscription: { organisationId: "org_other", stripeCustomerId: customerId, stripeSubscriptionId: null } });
    assert.equal((await app.post()).status, 503);
    assert.equal(app.receiptClaims, 0);
  });
  test(`${type}: connected invoices never use platform ownership or hold`, async () => {
    const app = loadRoute({ event: { ...invoiceEvent(type), connectAccountId: "acct_fixture" }, hold: true,
      ownershipError: new Error("platform DB must not be read") });
    assert.equal((await app.post()).status, 200);
    assert.deepEqual(app.guardChecks, [false]);
    assert.equal(app.platformMutations, 0);
  });
}

test("customer fallback rejects a conflicting canonical subscription ID", async () => {
  const app = loadRoute({ event: invoiceEvent("invoice.payment_failed", { subscription_details: { metadata: {} } }),
    platformSubscription: { organisationId: orgId, stripeCustomerId: customerId, stripeSubscriptionId: "sub_other" } });
  assert.equal((await app.post()).status, 503);
  assert.equal(app.receiptClaims, 0);
});

test("corroborated commerce subscription invoice remains unrelated", async () => {
  const app = loadRoute({ event: invoiceEvent("invoice.payment_failed", { subscription_details: { metadata: {} } }),
    hold: true, owner: null,
    commerceSubscriptions: [{ organisationId: orgId, metadata: { customerId } }] });
  assert.equal((await app.post()).status, 200);
  assert.deepEqual(app.guardChecks, [false]);
  assert.equal(app.platformMutations, 0);
});

for (const commerceSubscriptions of [
  [{ organisationId: orgId, metadata: { customerId: "cus_foreign" } }],
  [{ organisationId: orgId, metadata: { customerId } }, { organisationId: "org_other", metadata: { customerId } }],
]) {
  test("ambiguous or conflicting commerce invoice evidence fails closed", async () => {
    const app = loadRoute({ event: invoiceEvent("invoice.payment_failed", { subscription_details: { metadata: {} } }),
      owner: null, commerceSubscriptions });
    assert.equal((await app.post()).status, 503);
    assert.equal(app.receiptClaims, 0);
  });
}

test("empty subscription metadata cannot hide invoice platform metadata", async () => {
  const app = loadRoute({ event: invoiceEvent("invoice.payment_failed", {
    subscription_details: { metadata: {} }, metadata: platformSubscriptionMetadata,
  }), hold: true });
  assert.equal((await app.post()).status, 503);
  assert.equal(app.receiptClaims, 0);
});

test("conflicting invoice organisation or billing class claims fail closed", async () => {
  for (const metadata of [{ organisation_id: "org_other" }, { dg_commerce: "true" }]) {
    const app = loadRoute({ event: invoiceEvent("invoice.payment_failed", { metadata }) });
    assert.equal((await app.post()).status, 503);
    assert.equal(app.receiptClaims, 0);
  }
});

test("subscription metadata cannot mask an invoice-level conflicting billing marker", async () => {
  const app = loadRoute({ event: invoiceEvent("invoice.payment_failed", {
    subscription_details: { metadata: { ...platformSubscriptionMetadata, dg_commerce: "false" } },
    metadata: { dg_commerce: "true" },
  }) });
  assert.equal((await app.post()).status, 503);
  assert.equal(app.receiptClaims, 0);
  assert.equal(app.platformMutations, 0);
});

test("valid legacy email fallback uses the corroborated canonical organisation", async () => {
  const event = checkoutEvent({ metadata: { dg_platform_checkout: "true", contact_email: "fixture@example.test" } });
  delete event.organisationId;
  const app = loadRoute({ event, hold: true });
  assert.equal((await app.post()).status, 503);
  assert.equal(app.receiptClaims, 0);
  app.setHold(false);
  assert.equal((await app.post()).status, 200);
  assert.equal((await app.post()).status, 200);
  assert.equal(app.provisionedSessions.length, 1);
  assert.equal(app.provisionedSessions[0].metadata.organisation_id, orgId);
});

test("conflicting checkout organisation aliases remain unclaimed", async () => {
  const app = loadRoute({ event: checkoutEvent({ metadata: {
    dg_platform_checkout: "true", organisation_id: orgId, organisationId: "org_other",
  } }) });
  assert.equal((await app.post()).status, 503);
  assert.equal(app.receiptClaims, 0);
  assert.equal(app.platformMutations, 0);
});

test("platform-marked checkout with a conflicting mode cannot bypass the hold", async () => {
  const app = loadRoute({ event: checkoutEvent({ mode: "payment" }), hold: true });
  assert.equal((await app.post()).status, 503);
  assert.equal(app.receiptClaims, 0);
  assert.equal(app.platformMutations, 0);
});

for (const input of [
  { memberships: [] },
  { memberships: [{ organisationId: "org_other" }] },
  { memberships: [{ organisationId: orgId }, { organisationId: "org_other" }] },
  { owner: { id: orgId, billingCustomerId: null } },
  { platformSubscription: { organisationId: "org_other", stripeCustomerId: customerId, stripeSubscriptionId: null } },
]) {
  test("legacy email fallback rejects absent, ambiguous or cross-organisation corroboration", async () => {
    const app = loadRoute({ event: checkoutEvent({ metadata: { dg_platform_checkout: "true", contact_email: "fixture@example.test" } }), ...input });
    assert.equal((await app.post()).status, 503);
    assert.equal(app.receiptClaims, 0);
    assert.equal(app.provisionedSessions.length, 0);
  });
}

test("connected-account checkout and subscription events bypass the platform hold and platform provisioning", async () => {
  for (const { event, guardChecks, receiptClaims } of [
    { event: { ...checkoutEvent(), connectAccountId: "acct_fixture" }, guardChecks: [], receiptClaims: 0 },
    { event: { ...subscriptionEvent("subscription.updated"), connectAccountId: "acct_fixture" }, guardChecks: [false], receiptClaims: 1 },
  ]) {
    const app = loadRoute({ event, hold: true });
    assert.equal((await app.post()).status, 200);
    assert.deepEqual(app.guardChecks, guardChecks);
    assert.equal(app.receiptClaims, receiptClaims);
    assert.equal(app.platformMutations, 0);
  }
});

test("signed connected-account checkout context is preserved by Stripe event normalization", () => {
  const normalized = mapCheckoutCompleted({
    id: "cs_connected",
    mode: "subscription",
    customer: customerId,
    subscription: subscriptionId,
    metadata: { dg_platform_checkout: "true", organisation_id: orgId },
  }, "acct_connected_fixture");
  assert.equal(normalized.connectAccountId, "acct_connected_fixture");
});

test("non-platform checkout completion remains unheld", async () => {
  const app = loadRoute({
    event: checkoutEvent({ metadata: { organisation_id: orgId } }),
    hold: true,
  });
  assert.equal((await app.post()).status, 200);
  assert.deepEqual(app.guardChecks, [false]);
  assert.equal(app.receiptClaims, 1);
  assert.equal(app.platformMutations, 0);
});
