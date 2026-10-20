import assert from "node:assert/strict";
import { test } from "node:test";
import Stripe from "stripe";
import { createAdmittedPlatformSession } from "../packages/platform-core/src/billing/checkout-session-create.ts";
import { CheckoutTemporarilyUnavailable } from "../packages/platform-core/src/billing/checkout-creation-gate.ts";
import { checkoutPost } from "./checkout-test-http.mjs";

const expiry = 10000;
for (const [label, remaining, accepted] of [
  ["valid window", 2100, true], ["immediately before boundary", 1801, true],
  ["at boundary", 1800, true], ["after boundary", 1799, false],
]) {
  test(`provider acceptance ${label}`, async () => {
    let calls = 0;
    const parameters = { mode: "subscription", expires_at: expiry };
    const stripe = { checkout: { sessions: { create: async (body, options) => {
      calls++; assert.equal(options.maxNetworkRetries, 0);
      assert.match(options.idempotencyKey, /^platform-checkout-admission-/);
      assert.equal(body.expires_at, expiry);
      const providerNow = expiry - remaining;
      if (body.expires_at < providerNow + 1800) throw new Stripe.errors.StripeInvalidRequestError({
        message: "RAW_PROVIDER_SECRET", statusCode: 400, param: "expires_at",
      });
      return { id: "cs_accepted", expires_at: body.expires_at };
    } } } };
    if (accepted) assert.equal((await createAdmittedPlatformSession(stripe, parameters)).id, "cs_accepted");
    else await assert.rejects(createAdmittedPlatformSession(stripe, parameters), error =>
      error instanceof CheckoutTemporarilyUnavailable && error.outcome === "expiry_rejected" && !error.message.includes("RAW_PROVIDER"));
    assert.equal(calls, 1); assert.equal(parameters.expires_at, expiry);
  });
}

for (const kind of ["billing", "standard", "custom"]) {
  for (const outcome of ["expiry_rejected", "unknown", "gate_denied"]) {
    test(`${kind}: HTTP 503 safely distinguishes ${outcome}`, async () => {
      const error = new CheckoutTemporarilyUnavailable(outcome);
      const response = await checkoutPost(kind, async () => { throw error; })();
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      assert.equal(response.headers.get("Retry-After"), outcome === "unknown" ? null : "60");
      const body = await response.json();
      assert.equal(body.error.code, outcome === "unknown" ? "checkout_outcome_unknown" : "checkout_temporarily_unavailable");
      assert.equal(body.error.message, error.message);
      if (outcome === "unknown") assert.match(body.error.message, /before starting another checkout/);
    });
  }
}

test("ambiguous expiry-looking errors must never be classified as confirmed rejection", async () => {
  for (const error of [new Error("expires_at RAW_PROVIDER_SECRET"),
    new Stripe.errors.StripeConnectionError({ message: "expires_at RAW_PROVIDER_SECRET" }),
    new Stripe.errors.StripeAPIError({ message: "RAW_PROVIDER_SECRET", param: "expires_at", statusCode: 500 })]) {
    let calls = 0;
    const stripe = { checkout: { sessions: { create: async () => { calls++; throw error; } } } };
    await assert.rejects(createAdmittedPlatformSession(stripe, { expires_at: expiry }), result =>
      result.outcome === "unknown" && !result.message.includes("RAW_PROVIDER"));
    assert.equal(calls, 1);
  }
});

for (const replayLost of [false, true]) {
  test(`real SDK connection-close replay retains key/body and one accepted session; replay lost=${replayLost}`, async () => {
    const sends = [], accepted = new Map();
    let providerNow = expiry - 1801;
    const stripe = new Stripe("sk_test_no_network", { httpClient: {
      getClientName: () => "isolated-fixture",
      makeRequest: async (_host, _port, _path, _method, headers, body) => {
        const key = headers["Idempotency-Key"];
        sends.push({ key, body });
        assert.ok(key);
        if (!accepted.has(key)) {
          assert.ok(Number(new URLSearchParams(body).get("expires_at")) >= providerNow + 1800);
          accepted.set(key, { id: "cs_accepted_before_loss", object: "checkout.session", expires_at: expiry });
          providerNow = expiry - 1799;
          throw Object.assign(new Error("response lost after acceptance"), { code: "ECONNRESET" });
        }
        // Stripe's cached idempotent response is an existing accepted session,
        // not a new create subject to the now-stale expiry boundary.
        if (replayLost) throw Object.assign(new Error("response still unknown"), { code: "ETIMEDOUT" });
        return {
          getStatusCode: () => 200, getHeaders: () => ({}),
          getRawResponse: () => ({}),
          toJSON: async () => structuredClone(accepted.get(key)),
        };
      },
    } });
    const request = createAdmittedPlatformSession(stripe, { mode: "subscription", expires_at: expiry });
    if (replayLost) await assert.rejects(request, error => error.outcome === "unknown");
    else assert.equal((await request).id, "cs_accepted_before_loss");
    assert.equal(sends.length, 2); assert.deepEqual(sends[1], sends[0]);
    assert.equal(accepted.size, 1); assert.equal([...accepted.values()][0].expires_at, expiry);
  });
}
