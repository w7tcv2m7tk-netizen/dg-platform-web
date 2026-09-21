import assert from "node:assert/strict";import fs from "node:fs";
const cb=fs.readFileSync("src/app/api/connectors/domain/callback/route.ts","utf8");assert.match(cb,/canUseIndustryIntegrations\(tier\)/);assert.match(cb,/appInstallation\.findFirst/);assert.match(cb,/Property \/ Real Estate Industry App/);
const inv=fs.readFileSync("src/app/api/v1/org/team/invite/route.ts","utf8");assert.match(inv,/tier === "business" \? "Scale"/);
console.log("Domain callback + Scale limit copy: ok");
