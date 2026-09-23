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


// Billing exemption authority is part of the canonical subscription contract.
const billingStatusSource = (await import("node:fs")).readFileSync(
  "packages/platform-core/src/billing/org-billing-status.ts",
  "utf8",
);
assert.match(
  billingStatusSource,
  /const platformExempt = platformSub\s*\? platformSub\.platformExempt === true\s*:\s*!expectsPlatformBilling \|\| billing\.platformExempt === true;/,
  "an existing PlatformSubscription must be authoritative for platform exemption",
);
assert.match(
  billingStatusSource,
  /kind: resolveKind\(\{\s*expectsPlatformBilling: platformSub \? !platformExempt : expectsPlatformBilling,/,
  "billing kind must follow canonical PlatformSubscription exemption when one exists",
);
