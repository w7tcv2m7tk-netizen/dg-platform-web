import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
const read = p => readFileSync(p, "utf8");
const creators = read("packages/platform-core/src/billing/platform-checkout.ts");
test("both platform session creators must pass authoritative admission immediately before Stripe create", () => {
  assert.equal((creators.match(/await createAdmittedPlatformSession\(stripe, sessionParams\)/g) ?? []).length, 2);
  assert.equal((creators.match(/await admitPlatformCheckout\(\);\s+sessionParams\.expires_at = admission\.expiresAt;\s+const session = await createAdmittedPlatformSession\(stripe, sessionParams\)/g) ?? []).length, 2);
  assert.match(creators, /^import "server-only"/);
});
test("all subscription create sites are covered, separate Connect payment creator stays separate", () => {
  const files = [];
  function walk(dir) { for (const e of readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (/\.tsx?$/.test(p) && read(p).includes("checkout.sessions.create(")) files.push(p); } }
  walk("packages"); walk("src");
  assert.deepEqual(files.sort(), ["packages/platform-core/src/billing/checkout-session-create.ts", "packages/platform-core/src/commerce/connectors/stripe/index.ts"].sort());
  assert.match(read(files.find(x => x.includes("commerce/"))), /mode: "payment"/);
});
test("billing and both onboarding branches use direct server imports and return retryable customer error", () => {
  for (const name of ["billing/checkout", "onboarding/gen2"]) {
    const s = read(`src/app/api/v1/${name}/route.ts`);
    assert.match(s, /from "@dg\/platform-core\/billing\/platform-checkout"/);
    assert.match(s, /instanceof CheckoutTemporarilyUnavailable/); assert.match(s, /status: 503/); assert.match(s, /"Retry-After": "60"/);
  }
  const onboarding = read("src/app/api/v1/onboarding/gen2/route.ts");
  assert.match(onboarding, /offer \? await createCustomCommercialCheckoutSession/);
  assert.match(onboarding, /: await createPlatformCheckoutSession/);
  for (const p of ["platform-stripe", "commercial-offer"]) assert.doesNotMatch(read(`packages/platform-core/src/billing/${p}.ts`), /export (?:async function|const) create.*CheckoutSession/);
  assert.doesNotMatch(read("packages/platform-core/src/index.ts"), /platform-checkout|checkout-creation-gate|checkout-session-create/);
});
test("webhook route never consults admission barrier", () => {
  assert.doesNotMatch(read("src/app/api/webhooks/stripe/route.ts"), /admitPlatformCheckout|checkout-creation-gate/);
  assert.doesNotMatch(read("packages/platform-core/src/billing/platform-stripe.ts"), /admitPlatformCheckout|checkout-creation-gate/);
});

test("review branch push cannot request an automatic Vercel deployment", () => {
  const config = JSON.parse(read("vercel.json"));
  assert.deepEqual(config.git.deploymentEnabled, { "work/commercial-checkout-compatibility": false });
});
