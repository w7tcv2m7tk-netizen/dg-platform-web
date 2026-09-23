import fs from "node:fs";
import assert from "node:assert/strict";

const health = fs.readFileSync("packages/platform-core/src/connectors/framework/health.ts", "utf8");
const connectedServices = fs.readFileSync("src/app/(shell)/dashboard/settings/connected-services/page.tsx", "utf8");

assert.match(health, /if \(connectorId === "meta"\)[\s\S]*selectedPageIds[\s\S]*no Facebook Page has been assigned/);
assert.match(health, /if \(connectorId === "linkedin"\)[\s\S]*selectedOrganizationUrn[\s\S]*no company Page has been assigned/);
assert.match(health, /status: "degraded"/);

console.log("Social connector assignment health regression checks passed");
