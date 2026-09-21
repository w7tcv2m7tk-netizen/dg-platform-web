import assert from "node:assert/strict";
import {
  SCALE_MAX_BUSINESSES,
  canAddBusinessAtCount,
  canAddUserAtCount,
  canUseIndustryIntegrations,
  canUseMultipleBusinesses,
  maxActiveBusinessesForTier,
  maxUsersForTier,
} from "../src/lib/plans.ts";

assert.equal(SCALE_MAX_BUSINESSES, 5);
assert.equal(maxUsersForTier("starter"), 1);
assert.equal(maxUsersForTier("professional"), 5);
assert.equal(maxUsersForTier("business"), null);
assert.equal(maxActiveBusinessesForTier("starter"), 1);
assert.equal(maxActiveBusinessesForTier("professional"), 1);
assert.equal(maxActiveBusinessesForTier("business"), 5);
assert.equal(maxActiveBusinessesForTier("enterprise"), null);

assert.equal(canAddUserAtCount("professional", 4), true);
assert.equal(canAddUserAtCount("professional", 5), false);
assert.equal(canAddUserAtCount("business", 500), true);

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
