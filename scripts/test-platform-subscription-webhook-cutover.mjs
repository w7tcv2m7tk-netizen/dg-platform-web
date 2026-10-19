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
} = {}) {
  let receiptClaims = 0;
  let handlers = 0;
  let platformMutations = 0;
  const seen = new Set();
  const guardChecks = [];

  class PlatformSubscriptionWebhookHoldUnavailableError extends Error {
    code = "PLATFORM_SUBSCRIPTION_WEBHOOK_HOLD_UNAVAILABLE";
  }

  const database = {
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
    applyInvoicePaymentFailed: async () => { platformMutations++; return { status: "ACTIVE", entitlement: "FULL" }; },
    applyInvoicePaidRecovery: async () => { platformMutations++; return { status: "ACTIVE" }; },
    provisionFromPlatformCheckout: async () => { platformMutations++; return { ok: true }; },
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
      subscription_details: { metadata: { organisation_id: orgId } },
    }),
    hold: true,
  });
  assert.equal((await invoice.post()).status, 200);
  assert.deepEqual(invoice.guardChecks, [false]);
  assert.equal(invoice.receiptClaims, 1);
  assert.equal(invoice.platformMutations, 0);
});

test("connected-account checkout and subscription events bypass the platform hold and platform provisioning", async () => {
  for (const event of [
    { ...checkoutEvent(), connectAccountId: "acct_fixture" },
    { ...subscriptionEvent("subscription.updated"), connectAccountId: "acct_fixture" },
  ]) {
    const app = loadRoute({ event, hold: true });
    assert.equal((await app.post()).status, 200);
    assert.deepEqual(app.guardChecks, [false]);
    assert.equal(app.receiptClaims, 1);
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
