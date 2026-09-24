import fs from "node:fs";
import assert from "node:assert/strict";

const intelligence = fs.readFileSync("packages/platform-core/src/command-centre/client-intelligence.ts","utf8");
const alerts = fs.readFileSync("packages/platform-core/src/command-centre/platform-alerts.ts","utf8");

assert.match(intelligence, /isLegacyDemoOrganisation/);
assert.match(intelligence, /isCanonicalDemoOrganisation/);
assert.match(intelligence, /return !isInternalOrg && !isDemoOrg/);
assert.doesNotMatch(alerts, /connectors-legacy-wp/);
assert.doesNotMatch(alerts, /legacy WordPress connector/);
assert.match(alerts, /Legacy WordPress connector state is retained in diagnostics only/);

console.log("customer intelligence demo and WP notice cleanup checks passed");
