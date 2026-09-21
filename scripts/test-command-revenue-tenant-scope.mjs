import fs from "node:fs";
import assert from "node:assert/strict";

const overview = fs.readFileSync(
  "packages/platform-core/src/command-centre/overview.ts",
  "utf8",
);

assert.match(
  overview,
  /commerceSubscription\.count\(\{[\s\S]*?organisationId:\s*operatorOrganisationId[\s\S]*?status:\s*"active"/,
  "Command active subscriptions must be scoped to the DigitalGate operator organisation",
);
assert.match(
  overview,
  /commerceSubscription\.aggregate\(\{[\s\S]*?organisationId:\s*operatorOrganisationId[\s\S]*?interval:\s*"month"/,
  "Command MRR must be scoped to the DigitalGate operator organisation",
);
assert.match(
  overview,
  /commerceInvoice\.aggregate\(\{[\s\S]*?organisationId:\s*operatorOrganisationId[\s\S]*?status:\s*"paid"[\s\S]*?paidAt:\s*\{\s*gte:\s*monthStart/,
  "Command invoiced MTD must be scoped to the DigitalGate operator organisation",
);

console.log("Command revenue tenant-scope regression checks passed");
