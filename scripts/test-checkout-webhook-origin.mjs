import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import Stripe from "stripe";
import ts from "typescript";
import { StripePaymentConnector } from "../packages/platform-core/src/commerce/connectors/stripe/index.ts";
import { processPaymentWebhookEvent } from "../packages/platform-core/src/commerce/payment-engine.ts";

test("signed checkout event retains connected-account provenance", async () => {
  const previous = { key: process.env.STRIPE_SECRET_KEY, secret: process.env.STRIPE_WEBHOOK_SECRET };
  process.env.STRIPE_SECRET_KEY = "sk_test_no_network";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_isolated_fixture";
  try {
    const payload = JSON.stringify({ id: "evt_connected", type: "checkout.session.completed", account: "acct_connected",
      data: { object: { id: "cs_connected", mode: "subscription", created: 1700000000, metadata: { dg_platform_checkout: "true" } } } });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
    const event = await new StripePaymentConnector().parseWebhook(payload, { "stripe-signature": signature });
    assert.equal(event.connectAccountId, "acct_connected");
  } finally {
    for (const [name, value] of [["STRIPE_SECRET_KEY", previous.key], ["STRIPE_WEBHOOK_SECRET", previous.secret]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

for (const mode of ["payment", "subscription"]) {
  test(`actual webhook POST never provisions a connected-account ${mode} checkout`, async () => {
    let provisions = 0;
    const event = { providerEventId: "cs_connected", type: "checkout.completed", connectAccountId: "acct_connected",
      raw: { id: "cs_connected", mode, metadata: { dg_platform_checkout: "true", organisation_id: "victim" } } };
    const platform = { bootPaymentConnectors: () => {}, requirePaymentConnector: () => ({ parseWebhook: async () => event }),
      prismaReceiptStore: () => ({}), withWebhookReceiptState: async ({ handle }) => ({ status: "processed", result: await handle() }),
      isPlatformCheckoutSession: session => session.metadata?.dg_platform_checkout === "true",
      provisionFromPlatformCheckout: async () => { provisions++; return { ok: true }; } };
    const source = ts.transpileModule(readFileSync("src/app/api/webhooks/stripe/route.ts", "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(source, { exports, require: name => {
      if (name === "@dg/platform-core") return platform;
      if (name === "next/server") return { NextResponse: { json: Response.json } };
      throw new Error(`Unexpected dependency: ${name}`);
    }, Response, process: { env: { STRIPE_SECRET_KEY: "sk_test_no_network", STRIPE_WEBHOOK_SECRET: "whsec_fixture" } },
    console: { info() {}, error() {} } });
    const response = await exports.POST(new Request("https://fixture.test/api/webhooks/stripe", { method: "POST", body: "fixture" }));
    assert.equal(response.status, 200); assert.equal(provisions, 0);
    assert.equal((await response.json()).skipped, "connected_account_checkout");
  });
}

for (const type of ["checkout.completed", "checkout.expired", "payment.failed"]) {
  test(`direct production processor rejects connected-account ${type} without a database`, async () => {
    const result = await processPaymentWebhookEvent({ type, connectAccountId: "acct_attacker", providerId: "stripe",
      providerEventId: "evt_attack", organisationId: "victim", paymentRequestId: "victim_request", occurredAt: new Date() });
    assert.equal(result.ok, false); assert.equal(result.reason, "connected_account_payment_event");
  });
}

for (const type of ["checkout.session.expired", "payment_intent.payment_failed"]) {
  test(`signed ${type} provenance is enforced by actual POST before receipt or tenant writes`, async () => {
    const previousKey = process.env.STRIPE_SECRET_KEY, previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = "sk_test_no_network"; process.env.STRIPE_WEBHOOK_SECRET = "whsec_isolated_fixture";
    try {
      const payload = JSON.stringify({ id: "evt_attack", type, account: "acct_attacker", created: 1700000000,
        data: { object: { id: "object_attacker", created: 1700000000, metadata: { organisationId: "victim", paymentRequestId: "victim_request" } } } });
      const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
      const event = await new StripePaymentConnector().parseWebhook(payload, { "stripe-signature": signature });
      assert.equal(event.connectAccountId, "acct_attacker");
      let receipts = 0, mutations = 0;
      const source = ts.transpileModule(readFileSync("src/app/api/webhooks/stripe/route.ts", "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      }).outputText;
      const exports = {}, platform = { bootPaymentConnectors() {}, requirePaymentConnector: () => ({ parseWebhook: async () => event }),
        prismaReceiptStore: () => { receipts++; return {}; },
        withWebhookReceiptState: async ({ handle }) => ({ result: await handle() }),
        processPaymentWebhookEvent: async () => { mutations++; return { ok: true }; } };
      vm.runInNewContext(source, { exports, require: name => name === "@dg/platform-core" ? platform : { NextResponse: { json: Response.json } },
        Response, process: { env: { STRIPE_SECRET_KEY: "sk_test_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture" } }, console: { info() {}, error() {} } });
      const response = await exports.POST(new Request("https://fixture.test/webhook", { method: "POST", body: payload }));
      assert.equal(response.status, 200); assert.equal(receipts, 0); assert.equal(mutations, 0);
    } finally {
      if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = previousKey;
      if (previousSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
    }
  });
}

for (const type of ["invoice.paid", "invoice.payment_failed", "invoice.payment_action_required"]) {
  for (const version of ["2025-02-24.acacia", "2026-05-27.dahlia"]) {
    for (const expanded of [false, true]) test(`${version} ${type} resolves signed canonical invoice identities; expanded=${expanded}`, async () => {
      const previous = { key: process.env.STRIPE_SECRET_KEY, secret: process.env.STRIPE_WEBHOOK_SECRET };
      process.env.STRIPE_SECRET_KEY = "sk_test_no_network"; process.env.STRIPE_WEBHOOK_SECRET = "whsec_isolated_fixture";
      try {
        const subscription = expanded ? { id: "sub_canonical" } : "sub_canonical";
        const metadata = { organisation_id: "owner", dg_platform_tier: "professional" };
        const invoice = { id: "in_fixture", customer: expanded ? { id: "cus_canonical" } : "cus_canonical",
          metadata: { organisation_id: "wrong_fallback" }, currency: "aud", amount_paid: 24900, amount_due: 24900,
          ...(version.includes("dahlia") ? { parent: { type: "subscription_details", subscription_details: { subscription, metadata } } }
            : { subscription, subscription_details: { metadata } }) };
        const payload = JSON.stringify({ id: "evt_invoice", type, api_version: version, created: 1700000000,
          account: "acct_connected", data: { object: invoice } });
        const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
        const event = await new StripePaymentConnector().parseWebhook(payload, { "stripe-signature": signature });
        assert.equal(event.stripeSubscriptionId, "sub_canonical"); assert.equal(event.providerCustomerId, "cus_canonical");
        assert.equal(event.organisationId, "owner"); assert.equal(event.connectAccountId, "acct_connected");
        assert.equal(event.providerEventId, "evt_invoice"); assert.equal(event.stripeInvoiceId, "in_fixture");
      } finally {
        for (const [name, value] of [["STRIPE_SECRET_KEY", previous.key], ["STRIPE_WEBHOOK_SECRET", previous.secret]]) {
          if (value === undefined) delete process.env[name]; else process.env[name] = value;
        }
      }
    });
  }
}

function cutoverWebhookRuntime(readHold, receipts) {
  let event = {
    providerEventId: "evt_cutover_hold",
    type: "subscription.updated",
    connectAccountId: undefined,
    raw: { id: "sub_cutover_hold", customer: "cus_cutover_hold", metadata: { dg_platform_subscription: "true", organisation_id: "org_cutover_hold" } },
  };
  let receiptClaims = 0;
  let lifecycleCalls = 0;
  const platform = {
    bootPaymentConnectors() {},
    requirePaymentConnector: () => ({ parseWebhook: async () => event }),
    prismaReceiptStore: () => ({ claim: true }),
    PlatformSubscriptionWebhookHoldUnavailableError: class PlatformSubscriptionWebhookHoldUnavailableError extends Error {},
    isPlatformSubscription: sub => Boolean(sub?.metadata?.dg_platform_tier || sub?.metadata?.dg_platform_subscription === "true"),
    handlePlatformSubscriptionLifecycle: async () => { lifecycleCalls++; return { ok: true }; },
    resolveOrganisationIdByConnectAccount: async () => undefined,
    withWebhookReceiptState: async ({ eventId, requireSubscriptionWebhookOpen, handle }) => {
      if (requireSubscriptionWebhookOpen) {
        try { if (await readHold()) return { status: "held" }; }
        catch (cause) { throw new platform.PlatformSubscriptionWebhookHoldUnavailableError("hold unavailable", { cause }); }
      }
      receiptClaims++;
      if (receipts.has(eventId)) return { status: "duplicate", reason: "already_processed" };
      const result = await handle();
      receipts.add(eventId);
      return { status: "processed", result };
    },
  };
  const source = ts.transpileModule(readFileSync("src/app/api/webhooks/stripe/route.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => {
    if (name === "@dg/platform-core") return platform;
    if (name === "@dg/database") return { prisma: {
      organisation: { findUnique: async ({ where }) => where.id === "org_cutover_hold" || where.billingCustomerId === "cus_cutover_hold"
        ? { id: "org_cutover_hold", billingCustomerId: "cus_cutover_hold" } : null },
      platformSubscription: { findUnique: async () => null },
    } };
    if (name === "next/server") return { NextResponse: { json: Response.json } };
    throw new Error(`Unexpected dependency: ${name}`);
  }, Response, process: { env: { STRIPE_SECRET_KEY: "sk_test_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture" } },
  console: { info() {}, error() {}, warn() {} } });
  return {
    setEvent(next) { event = next; },
    async post() { return exports.POST(new Request("https://fixture.test/api/webhooks/stripe", { method: "POST", body: "signed fixture" })); },
    get receiptClaims() { return receiptClaims; },
    get lifecycleCalls() { return lifecycleCalls; },
  };
}

test("held platform lifecycle event returns retryable 503 before receipt claim and processes after release", async () => {
  const receipts = new Set();
  let held = true;
  const appA = cutoverWebhookRuntime(async () => held, receipts);
  const heldResponse = await appA.post();
  assert.equal(heldResponse.status, 503);
  assert.equal(heldResponse.headers.get("retry-after"), "60");
  assert.equal(appA.receiptClaims, 0);
  assert.equal(receipts.size, 0);
  assert.equal(appA.lifecycleCalls, 0);

  held = false;
  const appB = cutoverWebhookRuntime(async () => held, receipts);
  const releasedResponse = await appB.post();
  assert.equal(releasedResponse.status, 200);
  assert.equal(appB.receiptClaims, 1);
  assert.equal(appB.lifecycleCalls, 1);
  assert.equal(receipts.size, 1);
  const duplicate = await appA.post();
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).duplicate, true);
  assert.equal(appA.lifecycleCalls, 0);
});

test("hold lookup failure defers platform lifecycle event without claiming its receipt", async () => {
  const receipts = new Set();
  const app = cutoverWebhookRuntime(async () => { throw new Error("database unavailable"); }, receipts);
  const response = await app.post();
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "subscription_webhook_hold_unavailable");
  assert.equal(app.receiptClaims, 0);
  assert.equal(receipts.size, 0);
});

test("unrelated and connected-account subscription events bypass the platform cutover hold", async () => {
  const receipts = new Set();
  let reads = 0;
  const app = cutoverWebhookRuntime(async () => { reads++; return true; }, receipts);
  app.setEvent({ providerEventId: "evt_unrelated", type: "ignored", raw: { ignoredStripeType: "product.updated" } });
  assert.equal((await app.post()).status, 200);
  assert.equal(reads, 0);
  app.setEvent({ providerEventId: "evt_connected_subscription", type: "subscription.updated", connectAccountId: "acct_connected",
    raw: { id: "sub_connected", metadata: { dg_platform_subscription: "true" } } });
  assert.equal((await app.post()).status, 200);
  assert.equal(reads, 0);
});

test("multiple webhook application instances observe hold activation and release through shared state", async () => {
  const receipts = new Set();
  const shared = { held: false };
  const readSharedState = async () => shared.held;
  const appA = cutoverWebhookRuntime(readSharedState, receipts);
  const appB = cutoverWebhookRuntime(readSharedState, receipts);
  shared.held = true;
  assert.equal((await appA.post()).status, 503);
  assert.equal((await appB.post()).status, 503);
  assert.equal(appA.receiptClaims + appB.receiptClaims, 0);
  shared.held = false;
  assert.equal((await appB.post()).status, 200);
  assert.equal(receipts.size, 1);
});

test("Dahlia commerce subscription projects common item billing periods", async () => {
  const source = ts.transpileModule(readFileSync("packages/platform-core/src/commerce/subscription-sync.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {}; let captured;
  vm.runInNewContext(source, { exports, require: () => ({ upsertCommerceSubscription: async input => { captured = input; return { id: "commerce" }; } }), Date });
  await exports.syncCommerceSubscriptionFromStripe({ organisationId: "trusted_owner", subscription: {
    id: "sub_commerce", status: "active", customer: "cus_commerce", currency: "aud", metadata: { dg_commerce_subscription: "true", organisation_id: "untrusted_owner" },
    items: { data: [{ current_period_start: 1700000000, current_period_end: 1700604800, price: { unit_amount: 100, recurring: { interval: "month" } } }] },
  } });
  assert.equal(captured.organisationId, "trusted_owner");
  assert.equal(captured.currentPeriodStart?.getTime(), 1700000000000); assert.equal(captured.currentPeriodEnd?.getTime(), 1700604800000);
});

for (const conflict of ["different_ids", "missing_parent_id", "non_subscription_parent"]) test(`invoice parent ${conflict} cannot supply an unverified subscription identity`, async () => {
  const key = process.env.STRIPE_SECRET_KEY, secret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_SECRET_KEY = "sk_test_no_network"; process.env.STRIPE_WEBHOOK_SECRET = "whsec_fixture";
  try {
    const invoice = { id: "in_conflict", customer: "cus_fixture", subscription: "sub_legacy",
      parent: { type: conflict === "non_subscription_parent" ? "quote_details" : "subscription_details",
        subscription_details: { subscription: conflict === "missing_parent_id" ? null : "sub_current" } } };
    const payload = JSON.stringify({ id: "evt_conflict", type: "invoice.paid", created: 1700000000, data: { object: invoice } });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
    const parse = () => new StripePaymentConnector().parseWebhook(payload, { "stripe-signature": signature });
    if (conflict === "non_subscription_parent") assert.equal((await parse()).stripeSubscriptionId, undefined);
    else await assert.rejects(parse(), /identity is unconfirmed/);
  } finally {
    if (key === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = key;
    if (secret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = secret;
  }
});

for (const type of ["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "customer.subscription.paused", "customer.subscription.resumed"]) test(`Dahlia ${type} retains identity and account provenance`, async () => {
  const key = process.env.STRIPE_SECRET_KEY, secret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_SECRET_KEY = "sk_test_no_network"; process.env.STRIPE_WEBHOOK_SECRET = "whsec_fixture";
  try {
    const payload = JSON.stringify({ id: `evt_${type}`, type, api_version: "2026-05-27.dahlia", account: "acct_owner", created: 1700000000,
      data: { object: { id: "sub_current", customer: { id: "cus_current" }, status: type.endsWith("deleted") ? "canceled" : "active",
        metadata: { organisation_id: "metadata_hint" }, items: { data: [{ current_period_start: 1700000000, current_period_end: 1700604800 }] } } } });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
    const event = await new StripePaymentConnector().parseWebhook(payload, { "stripe-signature": signature });
    assert.equal(event.type, type.endsWith("created") ? "subscription.created" : type.endsWith("deleted") ? "subscription.cancelled" : "subscription.updated");
    assert.equal(event.stripeSubscriptionId, "sub_current"); assert.equal(event.providerCustomerId, "cus_current");
    assert.equal(event.connectAccountId, "acct_owner"); assert.equal(event.providerEventId, `evt_${type}`);
  } finally {
    if (key === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = key;
    if (secret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = secret;
  }
});

for (const type of ["invoice.paid", "invoice.payment_failed", "invoice.payment_action_required"]) test(`actual POST cannot apply connected-account ${type} to platform billing`, async () => {
  let billingWrites = 0;
  const event = { type, providerEventId: `evt_${type}`, connectAccountId: "acct_attacker", organisationId: "victim",
    providerCustomerId: "cus_victim", stripeSubscriptionId: "sub_victim", raw: { metadata: {} } };
  const platform = { bootPaymentConnectors() {}, requirePaymentConnector: () => ({ parseWebhook: async () => event }),
    prismaReceiptStore: () => ({}), withWebhookReceiptState: async ({ handle }) => ({ result: await handle() }),
    applyInvoicePaymentFailed: async () => { billingWrites++; }, applyInvoicePaidRecovery: async () => { billingWrites++; },
    processPaymentWebhookEvent: async () => ({ ok: false, reason: "ignored" }) };
  const source = ts.transpileModule(readFileSync("src/app/api/webhooks/stripe/route.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => name === "@dg/platform-core" ? platform : { NextResponse: { json: Response.json } },
    Response, process: { env: { STRIPE_SECRET_KEY: "sk_test_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture" } }, console: { info() {}, error() {} } });
  const response = await exports.POST(new Request("https://fixture.test/webhook", { method: "POST", body: "fixture" }));
  assert.equal(response.status, 200); assert.equal(billingWrites, 0);
});

for (const version of ["legacy", "different_item_periods"]) test(`commerce billing periods preserve ${version} semantics`, async () => {
  const source = ts.transpileModule(readFileSync("packages/platform-core/src/commerce/subscription-sync.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {}; let captured;
  vm.runInNewContext(source, { exports, require: () => ({ upsertCommerceSubscription: async input => { captured = input; return { id: "fixture" }; } }), Date });
  await exports.syncCommerceSubscriptionFromStripe({ organisationId: "trusted_owner", subscription: {
    id: "sub_fixture", status: "active", customer: "cus_fixture", metadata: { dg_commerce_subscription: "true" },
    ...(version === "legacy" ? { current_period_start: 1700000000, current_period_end: 1700604800 } : {}),
    items: { data: [{ current_period_start: 1700000100, current_period_end: 1700604900, price: {} },
      { current_period_start: 1700000200, current_period_end: 1700605000, price: {} }] },
  } });
  assert.equal(captured.currentPeriodStart?.getTime() ?? null, version === "legacy" ? 1700000000000 : null);
  assert.equal(captured.currentPeriodEnd?.getTime() ?? null, version === "legacy" ? 1700604800000 : null);
});
