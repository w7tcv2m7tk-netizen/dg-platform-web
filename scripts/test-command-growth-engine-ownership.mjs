import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const commandGrowth = fs.readFileSync(
  "src/app/(shell)/command/growth-engine/page.tsx",
  "utf8",
);

test("Command Growth Engine redirects to canonical tenant Prospecting workspace", () => {
  assert.match(commandGrowth, /redirect\("\/apps\/prospecting"\)/);
  assert.doesNotMatch(commandGrowth, /getGrowthEngineSummary/);
  assert.doesNotMatch(commandGrowth, /getDailyOpportunityBriefing/);
  assert.doesNotMatch(commandGrowth, /getPlatformPageContext/);
});
