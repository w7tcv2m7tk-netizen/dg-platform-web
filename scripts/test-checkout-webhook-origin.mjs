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
