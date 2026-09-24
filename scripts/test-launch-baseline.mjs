import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const pricing = read("packages/platform-core/src/billing/commercial-catalogue.ts");
assert.match(pricing, /starter[\s\S]*9900/);
assert.match(pricing, /professional[\s\S]*24900/);
assert.match(pricing, /business[\s\S]*49900/);
assert.match(pricing, /priority[\s\S]*19900/);
assert.match(pricing, /success_partner[\s\S]*49900/);

const entitlements = read("src/lib/plans.ts");
assert.match(entitlements, /starter/);
assert.match(entitlements, /professional/);
assert.match(entitlements, /business/);
assert.match(entitlements, /professional:\\s*\\{\\s*maxUsers:\\s*5,\\s*maxActiveBusinesses:\\s*1\\s*\\}/);
assert.match(entitlements, /business:\\s*\\{\\s*maxUsers:\\s*SCALE_MAX_USERS,\\s*maxActiveBusinesses:\\s*SCALE_MAX_BUSINESSES\\s*\\}/);
assert.match(entitlements, /SCALE_MAX_USERS\\s*=\\s*20/);
assert.match(entitlements, /SCALE_MAX_BUSINESSES\\s*=\\s*5/);

const subscriptionStore = read("packages/platform-core/src/billing/subscription-store.ts");
const dunning = subscriptionStore.slice(subscriptionStore.indexOf("export async function listSubscriptionsNeedingDunning"));
assert.match(dunning, /platformExempt:\s*false/);
assert.doesNotMatch(dunning, /foundingCustomer:\s*false/);

const onboarding = read("src/app/(shell)/onboarding/page.tsx");
assert.match(onboarding, /AdaptiveOnboardingJourney/);
assert.match(onboarding, /14-day free trial/);

const stripeWebhook = read("src/app/api/webhooks/stripe/route.ts");
assert.match(stripeWebhook, /requirePaymentConnector/);
assert.match(stripeWebhook, /provisionFromPlatformCheckout/);

const connected = read("src/app/(shell)/dashboard/settings/connected-services/page.tsx");
for (const panel of ["GoogleBusinessProfileLocationSelector", "GoogleAdsConnectorPanel", "MicrosoftAdsConnectorPanel", "TikTokAdsConnectorPanel", "MetaConnectorPanel", "LinkedInConnectorPanel", "YouTubeConnectorPanel"]) {
  assert.match(connected, new RegExp(panel));
}

const customOffer = read("src/app/api/v1/billing/custom-offer/route.ts");
assert.match(customOffer, /CustomCommercialOffer|commercialOffer|custom offer/i);

console.log("DigitalGate launch baseline regression checks passed");
