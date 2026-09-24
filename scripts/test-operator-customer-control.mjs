import fs from "node:fs";
import assert from "node:assert/strict";

const helper = fs.readFileSync("packages/platform-core/src/command-centre/operator-customer-control.ts", "utf8");
const panel = fs.readFileSync("src/components/command/CustomerControlPanel.tsx", "utf8");
const page = fs.readFileSync("src/app/(shell)/command/clients/[orgId]/page.tsx", "utf8");

assert.match(helper, /getOrganisationBillingStatus/);
assert.match(helper, /getOrganisationCommercialOffer/);
assert.match(helper, /industryTemplates/);
assert.match(helper, /incompleteRequired/);
assert.match(helper, /no Stripe customer is linked/);
assert.match(panel, /Rehearse customer journey/);
assert.match(panel, /Open CRM \/ custom offer/);
assert.match(panel, /Revenue & billing/);
assert.match(page, /CustomerControlPanel/);

console.log("operator customer control regression checks passed");
