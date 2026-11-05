import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  mergeWebhookEvents,
  missingWebhookEvents,
  resolveWebhookDestination,
} from "./stripe-webhook-setup-safety.mjs";

const testKey = "sk_test_synthetic";
const liveKey = "sk_live_synthetic";
const isolated = "https://dg-platform-web-git-feature-auth.vercel.app/api/webhooks/stripe";
const isolatedOrigin = "https://dg-platform-web-git-feature-auth.vercel.app";

test("test mode requires an explicit, owner-approved isolated destination", () => {
  assert.throws(() => resolveWebhookDestination({ secretKey: testKey }), /WEBHOOK_URL is required/);
  assert.throws(
    () => resolveWebhookDestination({ secretKey: testKey, webhookUrl: isolated }),
    /DG_STRIPE_SANDBOX_WEBHOOK_ORIGINS/,
  );
  assert.deepEqual(
    resolveWebhookDestination({ secretKey: testKey, webhookUrl: isolated, approvedOrigins: [isolatedOrigin] }),
    { mode: "test", url: isolated },
  );
});

test("test mode rejects Production, main and immutable aliases even when explicitly supplied", () => {
  for (const url of [
    "https://app.digitalgate.com.au/api/webhooks/stripe",
    "https://dg-platform-web.vercel.app/api/webhooks/stripe",
    "https://digitalgate.com.au/api/webhooks/stripe",
    "https://www.digitalgate.com.au/api/webhooks/stripe",
    "https://staging.digitalgate.com.au/api/webhooks/stripe",
    "https://dg-platform-web-git-main-team.vercel.app/api/webhooks/stripe",
    "https://dg-platform-web-abc123.vercel.app/api/webhooks/stripe",
  ]) {
    assert.throws(
      () => resolveWebhookDestination({ secretKey: testKey, webhookUrl: url }),
      /Production webhook|DG_STRIPE_SANDBOX_WEBHOOK_ORIGINS/,
    );
  }
  assert.throws(
    () => resolveWebhookDestination({
      secretKey: testKey,
      webhookUrl: "https://dg-platform-web-git-main-team.vercel.app/api/webhooks/stripe",
      approvedOrigins: ["https://dg-platform-web-git-main-team.vercel.app"],
    }),
    /Production webhook/,
  );
});

test("test mode rejects unapproved Vercel aliases and wildcard approvals", () => {
  for (const approvedOrigins of [[], ["https://*.vercel.app"], ["https://another-preview.vercel.app"]]) {
    assert.throws(
      () => resolveWebhookDestination({ secretKey: testKey, webhookUrl: isolated, approvedOrigins }),
      /owner-approved|DG_STRIPE_SANDBOX_WEBHOOK_ORIGINS/,
    );
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
    assert.throws(
      () => resolveWebhookDestination({ secretKey: testKey, webhookUrl: url, approvedOrigins: ["https://preview.example.test"] }),
    );
  }
});

test("existing event coverage is preserved and wildcard semantics are retained", () => {
  const existing = ["checkout.session.completed", "customer.subscription.paused"];
  const missing = missingWebhookEvents(existing);
  assert.ok(missing.includes("invoice.paid"));
  const merged = mergeWebhookEvents(existing);
  assert.deepEqual(merged.slice(0, 2), existing);
  assert.ok(merged.includes("invoice.paid"));
  assert.equal(new Set(merged).size, merged.length);
  assert.deepEqual(missingWebhookEvents(["*"]), []);
  assert.deepEqual(mergeWebhookEvents(["*"]), ["*"]);
});

test("setup output cannot emit the signing secret or key prefix", () => {
  const source = readFileSync("scripts/setup-stripe-webhook.mjs", "utf8");
  assert.doesNotMatch(source, /created\.secret/);
  assert.doesNotMatch(source, /secretKey\.slice/);
  assert.doesNotMatch(source, /STRIPE_WEBHOOK_SECRET=\$\{/);
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
