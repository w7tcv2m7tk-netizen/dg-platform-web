import assert from "node:assert/strict";
import fs from "node:fs";
for (const [name,path] of [["Domain connect","src/app/api/connectors/domain/connect/route.ts"],["Domain publish","src/app/api/v1/properties/[id]/syndicate/domain/route.ts"]]) {
  const s=fs.readFileSync(path,"utf8");
  assert.match(s,/specialistIndustryEntitlementBlock/,name+" uses central specialist entitlement");
  assert.match(s,/"property"/,name+" requires Property Industry");
}
console.log("Domain specialist entitlements: ok");
