import fs from "node:fs";
import assert from "node:assert/strict";

const demoTypes = fs.readFileSync("packages/platform-core/src/demo/types.ts", "utf8");
const memberships = fs.readFileSync("packages/platform-core/src/org/memberships.ts", "utf8");
const intelligence = fs.readFileSync("packages/platform-core/src/command-centre/client-intelligence.ts", "utf8");
const manager = fs.readFileSync("src/components/platform/IndustryBusinessTypeManager.tsx", "utf8");
const catalogue = fs.readFileSync("src/app/(shell)/dashboard/apps/catalogue/page.tsx", "utf8");
const toggle = fs.readFileSync("src/components/platform/AppInstallToggle.tsx", "utf8");

assert.match(demoTypes, /DEMO_ORG_SLUG = "harbour-and-co-demo"/, "Harbour & Co must remain the canonical demo tenant");
assert.match(demoTypes, /DigitalGate Demo Business/, "legacy DigitalGate demo tenant must be explicitly recognised");
assert.match(memberships, /isLegacyDemoOrganisation/, "legacy demo memberships must stay out of the organisation switcher");
assert.match(intelligence, /isCanonicalDemoOrganisation/, "demo tenants must be excluded from real customer intelligence");

assert.match(manager, /Industry App is a parent platform/, "Industry management must explain parent Industry Apps");
assert.match(manager, /Sub-industry App/, "Industry management must label child Apps distinctly");
assert.match(manager, /\$149\/month/, "parent Industry App pricing must be visible");
assert.match(manager, /\+\$29\/month each additional/, "additional child pricing must be visible");
assert.match(catalogue, /IndustryBusinessTypeManager/, "customer catalogue must use the hierarchical Industry manager");
assert.match(toggle, /Industry runtimes are shared implementation engines/, "raw Industry runtime apps must not be directly toggleable");

console.log("launch preflight demo and Industry taxonomy checks passed");
