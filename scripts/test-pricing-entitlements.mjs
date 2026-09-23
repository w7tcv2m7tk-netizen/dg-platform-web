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
