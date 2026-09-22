import fs from "node:fs";
import assert from "node:assert/strict";

const plans = fs.readFileSync("src/lib/plans.ts", "utf8");
const invite = fs.readFileSync("src/app/api/v1/org/team/invite/route.ts", "utf8");
const memberships = fs.readFileSync("packages/platform-core/src/org/memberships.ts", "utf8");
const specialist = fs.readFileSync("src/lib/industry-integration-entitlement.ts", "utf8");
const reaActivate = fs.readFileSync("src/app/api/v1/connectors/rea/activate/route.ts", "utf8");
const corelogic = fs.readFileSync("src/app/api/v1/connectors/corelogic/address-match/route.ts", "utf8");
const reaPublish = fs.readFileSync("src/app/api/v1/properties/[id]/syndicate/rea/route.ts", "utf8");

assert.match(plans, /starter:\s*\{\s*maxUsers:\s*1,\s*maxActiveBusinesses:\s*1/);
assert.match(plans, /professional:\s*\{\s*maxUsers:\s*5,\s*maxActiveBusinesses:\s*1/);
assert.match(plans, /export const SCALE_MAX_USERS = 20;/);
assert.match(plans, /export const SCALE_MAX_BUSINESSES = 5;/);

assert.match(invite, /status:\s*\{\s*in:\s*\["active",\s*"invited"\]\s*\}/);
assert.match(invite, /occupiedSeats\s*>=\s*maxUsers/);
assert.match(invite, /code:\s*"plan_user_limit"/);

assert.match(memberships, /starter:\s*1/);
assert.match(memberships, /professional:\s*1/);
assert.match(memberships, /business:\s*5/);
assert.match(memberships, /ownedActiveOrganisations\.length\s*>=\s*limit/);
assert.match(memberships, /plan_business_limit/);

assert.match(specialist, /canUseIndustryIntegrations\(tier\)/);
assert.match(specialist, /profile\?\.purchasedApps/);
assert.match(specialist, /industryIdForAppOrTemplate\(key\)\s*===\s*requiredIndustryId/);
for (const source of [reaActivate, corelogic, reaPublish]) {
  assert.match(source, /checkSpecialistIndustryIntegrationEntitlement/);
  assert.match(source, /"property"/);
}

console.log("Server commercial entitlement regression checks passed");
