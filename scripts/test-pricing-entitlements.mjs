import fs from "node:fs";
import assert from "node:assert/strict";
import {
  SCALE_MAX_BUSINESSES,
  SCALE_MAX_USERS,
  canAddBusinessAtCount,
  canAddUserAtCount,
  canUseIndustryIntegrations,
  canUseMultipleBusinesses,
  maxActiveBusinessesForTier,
  maxUsersForTier,
} from "../src/lib/plans.ts";

assert.equal(SCALE_MAX_BUSINESSES, 5);
assert.equal(SCALE_MAX_USERS, 20);
assert.equal(maxUsersForTier("starter"), 1);
assert.equal(maxUsersForTier("professional"), 5);
assert.equal(maxUsersForTier("business"), 20);
assert.equal(maxActiveBusinessesForTier("starter"), 1);
assert.equal(maxActiveBusinessesForTier("professional"), 1);
assert.equal(maxActiveBusinessesForTier("business"), 5);
assert.equal(maxActiveBusinessesForTier("enterprise"), null);

assert.equal(canAddUserAtCount("professional", 4), true);
assert.equal(canAddUserAtCount("professional", 5), false);
assert.equal(canAddUserAtCount("business", 19), true);
assert.equal(canAddUserAtCount("business", 20), false);
assert.equal(canAddUserAtCount("enterprise", 500), true);

assert.equal(canAddBusinessAtCount("professional", 0), true);
assert.equal(canAddBusinessAtCount("professional", 1), false);
assert.equal(canAddBusinessAtCount("business", 4), true);
assert.equal(canAddBusinessAtCount("business", 5), false);
assert.equal(canAddBusinessAtCount("enterprise", 50), true);

assert.equal(canUseMultipleBusinesses("starter"), false);
assert.equal(canUseMultipleBusinesses("professional"), false);
assert.equal(canUseMultipleBusinesses("business"), true);
assert.equal(canUseMultipleBusinesses("enterprise"), true);

assert.equal(canUseIndustryIntegrations("starter"), false);
assert.equal(canUseIndustryIntegrations("professional"), false);
assert.equal(canUseIndustryIntegrations("business"), true);
assert.equal(canUseIndustryIntegrations("enterprise"), true);

console.log("pricing entitlement regression checks passed");

const commercialCatalogue = fs.readFileSync(
  "packages/platform-core/src/billing/commercial-catalogue.ts",
  "utf8",
);
const stripeBilling = fs.readFileSync(
  "packages/platform-core/src/billing/platform-stripe.ts",
  "utf8",
);
const commandOverview = fs.readFileSync(
  "packages/platform-core/src/command-centre/overview.ts",
  "utf8",
);

assert.match(commercialCatalogue, /id: "starter"[\s\S]*?monthlyCents: 9900/);
assert.match(commercialCatalogue, /id: "professional"[\s\S]*?monthlyCents: 24900/);
assert.match(commercialCatalogue, /id: "business"[\s\S]*?monthlyCents: 49900/);
assert.match(commercialCatalogue, /id: "standard"[\s\S]*?monthlyCents: 0/);
assert.match(commercialCatalogue, /id: "priority"[\s\S]*?monthlyCents: 19900/);
assert.match(commercialCatalogue, /id: "success_partner"[\s\S]*?monthlyCents: 49900/);
assert.match(commercialCatalogue, /id: "enterprise_success"[\s\S]*?monthlyCents: null/);
assert.match(stripeBilling, /PLATFORM_COMMERCIAL_PLANS/);
assert.match(stripeBilling, /SUPPORT_COMMERCIAL_PLANS/);
assert.match(commandOverview, /commercial-catalogue/);
assert.doesNotMatch(
  commandOverview,
  /starter:\s*9900,\s*professional:\s*24900,\s*business:\s*49900/,
  "Command Centre must not duplicate canonical tier prices",
);

console.log("canonical commercial catalogue regression checks passed");


const commercialModel = fs.readFileSync(
  "docs/foundations/COMMERCIAL-MODEL.md",
  "utf8",
);
const rollout = fs.readFileSync(
  "docs/strategy/DIGITALGATE-ROLLOUT.md",
  "utf8",
);
const pricingLock = fs.readFileSync(
  "docs/commercial/PRICING-AND-PACKAGING.md",
  "utf8",
);

assert.match(pricingLock, /Starter \*\*\$99\/mo\*\* · Growth \*\*\$249\/mo\*\* · Scale \*\*\$499\/mo\*\*/);
assert.match(pricingLock, /Scale supports up to 20 users/);
assert.match(pricingLock, /up to 5 businesses total/);
assert.match(commercialModel, /scale=20, enterprise=custom/);
assert.match(commercialModel, /Up to 20 users, up to 5 active businesses/);
assert.doesNotMatch(commercialModel, /Scale \| \+ Unlimited users/);
assert.match(rollout, /Starter\*\* · \*\*Growth\*\* · \*\*Scale\*\* · \*\*Enterprise/);
assert.doesNotMatch(rollout, /Founding 10 → Founding 100|Founding 100 \/ 1,000|24-month founding window|Preferred founding terms/);

console.log("commercial documentation lock regression checks passed");

const pricingCatalog = fs.readFileSync(
  "src/lib/pricing-catalog.ts",
  "utf8",
);
const publicPricing = fs.readFileSync(
  "marketing/pages/pricing-page.html",
  "utf8",
);
assert.match(pricingCatalog, /key: "enterprise"[\s\S]*?users: "Custom user limits"/);
assert.match(publicPricing, /Enterprise<\/div>[\s\S]{0,600}<div class="plan-users">Custom user limits<\/div>/);
assert.doesNotMatch(pricingCatalog, /key: "enterprise"[\s\S]*?users: "Unlimited Users"/);

console.log("enterprise pricing copy consistency checks passed");

const paidApps = fs.readFileSync(
  "packages/platform-core/src/billing/paid-apps.ts",
  "utf8",
);
const appHierarchy = fs.readFileSync(
  "docs/foundations/APP-HIERARCHY.md",
  "utf8",
);
const industryPlatform = fs.readFileSync(
  "packages/platform-core/src/industry/platform.ts",
  "utf8",
);

for (const id of ["advertising", "marketing", "prospecting", "ai-visibility", "seo", "automation", "analytics", "social", "reviews"]) {
  assert.ok(paidApps.includes(`appId: "${id}"`), `missing canonical Growth App ${id}`);
}
assert.match(pricingLock, /Advertising \| \*\*\$99\/mo\*\*/);
assert.match(pricingLock, /Marketing \| \*\*\$99\/mo\*\*/);
assert.match(appHierarchy, /Advertising · Marketing · Prospecting & Opportunity Engine · AI Visibility · SEO · Automation · Analytics · Social · Reviews & Reputation/);
assert.match(industryPlatform, /Advertising, Marketing, Prospecting, AI Visibility, SEO, Automation, Analytics, Social, Reputation/);
assert.doesNotMatch(industryPlatform, /Prospecting, AI Visibility, SEO, Reputation, Social, Analytics, AI Communications/);
assert.match(appHierarchy, /Property Industry App \$149 with one primary Template included/);

console.log("Growth and Industry hierarchy consistency checks passed");
