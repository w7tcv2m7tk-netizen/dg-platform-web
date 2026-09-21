import assert from "node:assert/strict";
import fs from "node:fs";

const cb = fs.readFileSync("src/app/api/connectors/domain/callback/route.ts", "utf8");
assert.ok(cb.includes("canUseIndustryIntegrations(tier)"), "Domain callback must enforce Scale/Enterprise");
assert.ok(cb.includes("appInstallation.findFirst"), "Domain callback must require Industry App");
assert.ok(cb.includes("Property / Real Estate Industry App"), "Domain callback must name required Industry App");

const inv = fs.readFileSync("src/app/api/v1/org/team/invite/route.ts", "utf8");
assert.ok(inv.includes('tier === "business" ? "Scale"'), "Scale user-limit message must identify Scale");

console.log("Domain callback + Scale limit copy: ok");
