import assert from "node:assert/strict";
import fs from "node:fs";

const authority=fs.readFileSync("packages/platform-core/src/access/platform-authority.ts","utf8");
const paid=fs.readFileSync("packages/platform-core/src/billing/paid-apps.ts","utf8");
const overview=fs.readFileSync("src/components/overview/DigitalPerformanceStrip.tsx","utf8");
const nav=fs.readFileSync("packages/platform-core/src/apps/navigation.ts","utf8");

assert.match(authority,/DG_COMMAND_CENTRE_ORG_IDS/);
assert.match(authority,/role === "owner"/);
assert.doesNotMatch(authority,/organisation.*slug/i);
for (const id of ["advertising","marketing","prospecting","ai-visibility","seo","automation","analytics","social","reviews"]) {
  assert.ok(paid.includes(`"${id}"`), `Growth Suite mapping missing ${id}`);
  assert.ok(overview.includes(`"${id}"`), `Overview missing ${id}`);
}
assert.match(nav,/platformNetworkNavItem\(showCommandCentre\)/);
assert.match(nav,/const commandCentre = getCommandCentreNavItem\(\)/);
assert.match(nav,/label: options\?\.showCommandCentre[\s\S]*PLATFORM_CONFIG_NAV_SECTION_LABEL/);
console.log("tenant access policy invariants passed");
