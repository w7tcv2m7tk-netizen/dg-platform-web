import assert from "node:assert/strict";
import fs from "node:fs";

const helper = fs.readFileSync("src/lib/specialist-industry-entitlement.ts", "utf8");
const routes = [
  ["CoreLogic", fs.readFileSync("src/app/api/v1/connectors/corelogic/address-match/route.ts", "utf8")],
  ["REA publish", fs.readFileSync("src/app/api/v1/properties/[id]/syndicate/rea/route.ts", "utf8")],
  ["Domain publish", fs.readFileSync("src/app/api/v1/properties/[id]/syndicate/domain/route.ts", "utf8")],
];

assert.match(helper, /canUseIndustryIntegrations\(tier\)/, "specialist integrations require Scale+");
assert.match(helper, /settings\.profile\?\.purchasedApps/, "specialist integrations require paid Industry purchase");
assert.match(helper, /industryIdForAppOrTemplate\(key\) === requiredIndustryId/, "purchase must match required Industry");
assert.match(helper, /appInstallation\.findFirst/, "specialist integrations require active Industry App");
assert.match(helper, /industry_app_purchase_required/, "missing purchase fails closed");
assert.match(helper, /industry_app_required/, "inactive app fails closed");

for (const [name, source] of routes) {
  assert.match(source, /specialistIndustryEntitlementBlock/, name + " uses central specialist entitlement");
  assert.match(source, /"property"/, name + " requires Property Industry");
}
console.log("specialist industry entitlement gates: ok");
