import fs from "node:fs";
import assert from "node:assert/strict";

const helper = fs.readFileSync("packages/platform-core/src/command-centre/operator-customer-control.ts", "utf8");
const panel = fs.readFileSync("src/components/command/CustomerControlPanel.tsx", "utf8");
const page = fs.readFileSync("src/app/(shell)/command/clients/[orgId]/page.tsx", "utf8");

assert.match(helper, /getOrganisationBillingStatus/, "customer control must use authoritative billing status");
assert.match(helper, /getOrganisationCommercialOffer/, "customer control must expose accepted custom offers");
assert.match(helper, /industryTemplates/, "customer control must carry Industry Templates");
assert.match(helper, /incompleteRequired/, "customer control must expose incomplete required activation work");
assert.match(helper, /no Stripe customer is linked/, "customer control must detect checkout\/provisioning mismatch");
assert.match(panel, /Rehearse customer journey/, "customer detail must expose operator rehearsal");
assert.match(panel, /Open CRM \/ custom offer/, "customer detail must link back to originating custom offer when known");
assert.match(panel, /Revenue & billing/, "customer detail must expose billing operations");
assert.match(page, /CustomerControlPanel/, "customer detail must render consolidated customer control");

console.log("operator customer control regression checks passed");
