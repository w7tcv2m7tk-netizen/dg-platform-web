import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const stripe = fs.readFileSync(
  "packages/platform-core/src/billing/platform-stripe.ts",
  "utf8",
);
const paidApps = fs.readFileSync(
  "packages/platform-core/src/billing/paid-apps.ts",
  "utf8",
);
const orgApps = fs.readFileSync("src/app/api/v1/org/apps/route.ts", "utf8");

test("every paid app key has an explicit server-side price", () => {
  for (const key of [
    "prospecting_pro",
    "ai_visibility_pro",
    "seo_pro",
    "automation_pro",
    "analytics_pro",
    "social_pro",
    "voice_ai",
  ]) {
    assert.match(paidApps, new RegExp(`${key}: \\d+`));
  }
});

test("Stripe checkout charges paid apps instead of trusting metadata alone", () => {
  assert.match(stripe, /for \(const line of paidAppCheckoutLines\(premiumApps\)\)/);
  assert.match(stripe, /unit_amount: lineAmount/);
  assert.match(stripe, /dg_premium_apps: premiumApps\.join\(","\)/);
});

test("paid app selection is copied onto the Stripe subscription", () => {
  const subscriptionData = stripe.indexOf("subscription_data:");
  assert.ok(subscriptionData >= 0);
  assert.match(stripe.slice(subscriptionData), /dg_premium_apps: premiumApps\.join\(","\)/);
});

test("webhook provisioning verifies paid app entitlement against Stripe subscription", () => {
  assert.match(stripe, /stripe\.subscriptions\.retrieve\(input\.subscriptionId\)/);
  assert.match(stripe, /Paid app entitlement missing from Stripe subscription/);
  const verify = stripe.indexOf("paidAppsFromAuthoritativeSubscription");
  const selection = stripe.indexOf("const selection: PlanSelectionInput");
  assert.ok(verify >= 0 && selection > verify, "Stripe verification must precede app provisioning");
});

test("org app mutation blocks paid app activation without a recorded purchase", () => {
  assert.match(orgApps, /paidAppKeyForAppId/);
  assert.match(orgApps, /settings\.profile\?\.purchasedPremium/);
  assert.match(orgApps, /paid_app_purchase_required/);
});
