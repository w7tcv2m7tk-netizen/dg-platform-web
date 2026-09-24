import fs from "node:fs";
import assert from "node:assert/strict";

const demoTypes = fs.readFileSync("packages/platform-core/src/demo/types.ts", "utf8");
const memberships = fs.readFileSync("packages/platform-core/src/org/memberships.ts", "utf8");
const intelligence = fs.readFileSync("packages/platform-core/src/command-centre/client-intelligence.ts", "utf8");

assert.match(demoTypes, /DEMO_ORG_SLUG = "harbour-and-co-demo"/, "Harbour & Co must remain the canonical demo");
assert.match(demoTypes, /DigitalGate Demo Business/, "legacy DigitalGate Demo Business must be explicitly recognised");
assert.match(memberships, /isLegacyDemoOrganisation/, "legacy demo memberships must be hidden from session organisation lists");
assert.match(intelligence, /isCanonicalDemoOrganisation/, "demo tenants must be excluded from real customer intelligence");
assert.match(intelligence, /return !isInternalOrg && !isDemoOrg/, "demo tenant must not be ranked as a customer");

console.log("canonical demo organisation regression checks passed");
