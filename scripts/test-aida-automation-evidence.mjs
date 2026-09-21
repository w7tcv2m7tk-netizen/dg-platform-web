import fs from "node:fs";
import assert from "node:assert/strict";

const business = fs.readFileSync("packages/platform-core/src/org/business-context.ts", "utf8");
const evidence = fs.readFileSync("packages/platform-core/src/ai/evidence-context.ts", "utf8");

assert.match(business, /organisationId: input\.organisationId[\s\S]*sourceApp: "automation"/, "Automation evidence must be organisation scoped");
assert.match(business, /automation\.run/);
assert.match(business, /automation\.run_partial/);
assert.match(business, /automationRecentRunCount: automationEvidence\.recentRunCount/);
assert.match(business, /automationLastRunAt: automationEvidence\.lastRunAt/);
assert.match(business, /automationEvidence && automationEvidence\.recentRunCount > 0/, "No observed executions must remain unavailable rather than becoming zero");

assert.match(evidence, /domain: "automation"/);
assert.match(evidence, /automation\.recent_runs/);
assert.match(evidence, /automation\.last_status/);
assert.match(evidence, /t\.automationLastRunAt \?\? at/);
assert.match(evidence, /t\.automationRecentRunCount == null \? "unavailable" : "live"/);
assert.match(evidence, /t\.automationLastRunStatus == null \? "unavailable" : "live"/);

console.log("Aida automation evidence regression checks passed");
