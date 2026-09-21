import assert from "node:assert/strict";
import fs from "node:fs";
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


const source = (path) => fs.readFileSync(path, "utf8");

const memberships = source("packages/platform-core/src/org/memberships.ts");
assert.match(memberships, /business:\s*5/);
assert.match(memberships, /ownedActiveOrganisations\.length >= limit/);

const inviteRoute = source("src/app/api/v1/org/team/invite/route.ts");
assert.match(inviteRoute, /maxUsersForTier\(tier\)/);
assert.match(inviteRoute, /status:\s*\{ in: \["active", "invited"\] \}/);

const inviteClaim = source("packages/platform-core/src/org/team-invites.ts");
assert.match(inviteClaim, /older reserved invite|reserved invite/i);
assert.match(inviteClaim, /occupiedSeats > maxUsers/);
assert.match(inviteClaim, /occupiedSeats >= maxUsers/);

const industryGuard = source("packages/platform-core/src/billing/industry-integration-entitlement.ts");
assert.match(industryGuard, /tier !== "business" && tier !== "enterprise"/);
assert.match(industryGuard, /appInstallation\.findFirst/);
assert.match(industryGuard, /industry_integration_plan_required/);
assert.match(industryGuard, /industry_app_required/);

for (const path of [
  "src/app/api/connectors/domain/connect/route.ts",
  "src/app/api/connectors/domain/callback/route.ts",
  "src/app/api/v1/connectors/corelogic/address-match/route.ts",
  "src/app/api/v1/properties/[id]/route.ts",
  "src/app/api/v1/re/reports/route.ts",
]) {
  assert.match(source(path), /checkIndustryIntegrationAccess\(/, `${path} must enforce specialist Industry entitlement`);
}

for (const path of [
  "packages/platform-core/src/properties/index.ts",
  "packages/platform-core/src/connectors/domain/publish-property.ts",
  "packages/platform-core/src/connectors/rea/publish-property.ts",
]) {
  assert.match(source(path), /checkOrgIndustryIntegrationEntitlement\(/, `${path} must enforce specialist Industry entitlement internally`);
}

for (const path of [
  "src/app/api/v1/connectors/domain/status/route.ts",
  "src/app/api/v1/connectors/rea/status/route.ts",
  "src/app/api/v1/connectors/corelogic/status/route.ts",
]) {
  const status = source(path);
  assert.match(status, /specialistEnabled/);
  assert.match(status, /entitlement:/);
}

console.log("pricing entitlement enforcement surfaces certified");
