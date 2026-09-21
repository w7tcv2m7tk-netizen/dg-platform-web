import assert from "node:assert/strict";
import fs from "node:fs";

const corelogic = fs.readFileSync("src/app/api/v1/connectors/corelogic/address-match/route.ts", "utf8");
const rea = fs.readFileSync("src/app/api/v1/properties/[id]/syndicate/rea/route.ts", "utf8");
for (const [name, source] of [["CoreLogic", corelogic], ["REA publish", rea]]) {
  assert.match(source, /canUseIndustryIntegrations\(tier\)/, name + " must require Scale+");
  assert.match(source, /appInstallation\.findFirst/, name + " must require an active Industry App");
  assert.match(source, /property.*real-estate|real-estate.*property/s, name + " must use Property\/Real Estate entitlement");
  assert.match(source, /industry_app_required/, name + " must fail closed without the Industry App");
}
console.log("specialist industry entitlement gates: ok");
