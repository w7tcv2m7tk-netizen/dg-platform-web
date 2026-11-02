import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveWebhookDestination } from "./stripe-webhook-setup-safety.mjs";

const testKey = "sk_test_synthetic";
const liveKey = "sk_live_synthetic";
const isolated = "https://dg-platform-web-git-feature-auth.vercel.app/api/webhooks/stripe";

test("test mode requires an explicit isolated destination", () => {
  assert.throws(() => resolveWebhookDestination({ secretKey: testKey }), /WEBHOOK_URL is required/);
  assert.deepEqual(resolveWebhookDestination({ secretKey: testKey, webhookUrl: isolated }), {
    mode: "test",
    url: isolated,
  });
});

test("test mode rejects every known Production destination", () => {
  for (const url of [
    "https://app.digitalgate.com.au/api/webhooks/stripe",
    "https://dg-platform-web.vercel.app/api/webhooks/stripe",
    "https://digitalgate.com.au/api/webhooks/stripe",
    "https://www.digitalgate.com.au/api/webhooks/stripe",
    "https://staging.digitalgate.com.au/api/webhooks/stripe",
  ]) {
    assert.throws(() => resolveWebhookDestination({ secretKey: testKey, webhookUrl: url }), /Production webhook/);
  }
});

test("test mode rejects non-HTTPS, wrong paths, credentials, query, fragment and wildcard hosts", () => {
  for (const url of [
    "http://preview.example.test/api/webhooks/stripe",
    "https://preview.example.test/other",
    "https://user:pass@preview.example.test/api/webhooks/stripe",
    "https://preview.example.test/api/webhooks/stripe?x=1",
    "https://preview.example.test/api/webhooks/stripe#x",
    "https://*.example.test/api/webhooks/stripe",
    "not a url",
  ]) {
    assert.throws(() => resolveWebhookDestination({ secretKey: testKey, webhookUrl: url }));
  }
});

test("live mode retains the explicit Production default and accepts an explicit URL", () => {
  assert.deepEqual(resolveWebhookDestination({ secretKey: liveKey }), {
    mode: "live",
    url: "https://app.digitalgate.com.au/api/webhooks/stripe",
  });
  assert.deepEqual(resolveWebhookDestination({ secretKey: liveKey, webhookUrl: isolated }), {
    mode: "live",
    url: isolated,
  });
});

test("unknown keys fail closed", () => {
  assert.throws(() => resolveWebhookDestination({ secretKey: undefined }), /sk_test_ or sk_live_/);
  assert.throws(() => resolveWebhookDestination({ secretKey: "pk_test_synthetic" }), /sk_test_ or sk_live_/);
});
