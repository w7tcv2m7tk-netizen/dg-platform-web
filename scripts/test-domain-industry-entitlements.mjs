import assert from "node:assert/strict";
import fs from "node:fs";
for (const [name,path] of [["Domain connect","src/app/api/connectors/domain/connect/route.ts"],["Domain publish","src/app/api/v1/properties/[id]/syndicate/domain/route.ts"]]) { const s=fs.readFileSync(path,"utf8"); assert.match(s,/canUseIndustryIntegrations\(tier\)/,name+" requires Scale+"); assert.match(s,/appInstallation\.findFirst/,name+" requires Industry App"); assert.match(s,/industry_app_required/,name+" fails closed"); }
console.log("Domain specialist entitlements: ok");
