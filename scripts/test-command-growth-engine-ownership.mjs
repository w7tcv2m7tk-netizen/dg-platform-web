import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const commandGrowth = fs.readFileSync(
  "src/app/(shell)/command/growth-engine/page.tsx",
  "utf8",
);
const commandGrowthPipeline = fs.readFileSync(
  "src/app/(shell)/command/growth-engine/pipeline/page.tsx",
  "utf8",
);

test("Command Growth Engine redirects to canonical tenant Prospecting workspace", () => {
  assert.match(commandGrowth, /redirect\("\/apps\/prospecting"\)/);
  assert.doesNotMatch(commandGrowth, /getGrowthEngineSummary/);
  assert.doesNotMatch(commandGrowth, /getDailyOpportunityBriefing/);
  assert.doesNotMatch(commandGrowth, /getPlatformPageContext/);
});

test("Command Growth pipeline redirects to canonical tenant Prospecting pipeline", () => {
  // The prospect pipeline is tenant-scoped Prospecting; it must not be rebuilt
  // as a duplicate operator surface reading tenant Growth Engine data.
  assert.match(commandGrowthPipeline, /redirect\("\/apps\/prospecting\/pipeline"\)/);
  assert.doesNotMatch(commandGrowthPipeline, /listGrowthProspects/);
  assert.doesNotMatch(commandGrowthPipeline, /getPlatformPageContext/);
  assert.doesNotMatch(commandGrowthPipeline, /session\.organisationId/);
});
