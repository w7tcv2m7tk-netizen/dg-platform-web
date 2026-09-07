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
const commandGrowthAudits = fs.readFileSync(
  "src/app/(shell)/command/growth-engine/audits/page.tsx",
  "utf8",
);
const commandGrowthProposals = fs.readFileSync(
  "src/app/(shell)/command/growth-engine/proposals/page.tsx",
  "utf8",
);
const prospectingAudits = fs.readFileSync(
  "src/app/(shell)/apps/prospecting/audits/page.tsx",
  "utf8",
);
const prospectingProposals = fs.readFileSync(
  "src/app/(shell)/apps/prospecting/proposals/page.tsx",
  "utf8",
);

test("Command Growth Engine redirects to canonical tenant Prospecting workspace", () => {
  assert.match(commandGrowth, /redirect\("\/apps\/prospecting"\)/);
  assert.doesNotMatch(commandGrowth, /getGrowthEngineSummary/);
  assert.doesNotMatch(commandGrowth, /getDailyOpportunityBriefing/);
  assert.doesNotMatch(commandGrowth, /getPlatformPageContext/);
});

test("Command Growth pipeline redirects to canonical tenant Prospecting pipeline", () => {
  assert.match(commandGrowthPipeline, /redirect\("\/apps\/prospecting\/pipeline"\)/);
  assert.doesNotMatch(commandGrowthPipeline, /listGrowthProspects/);
  assert.doesNotMatch(commandGrowthPipeline, /getPlatformPageContext/);
  assert.doesNotMatch(commandGrowthPipeline, /session\.organisationId/);
});

test("tenant audits and proposals live under Prospecting, with Command compatibility redirects only", () => {
  assert.match(commandGrowthAudits, /redirect\("\/apps\/prospecting\/audits"\)/);
  assert.match(commandGrowthProposals, /redirect\("\/apps\/prospecting\/proposals"\)/);
  assert.doesNotMatch(commandGrowthAudits, /listGrowthProspectAudits|getPlatformPageContext/);
  assert.doesNotMatch(commandGrowthProposals, /listGrowthProposalDrafts|getPlatformPageContext/);
  assert.match(prospectingAudits, /getPlatformPageContext/);
  assert.match(prospectingAudits, /organisationGrowthScope\(session\.organisationId\)/);
  assert.match(prospectingProposals, /getPlatformPageContext/);
  assert.match(prospectingProposals, /organisationGrowthScope\(session\.organisationId\)/);
  assert.doesNotMatch(prospectingAudits, /\/command\/growth-engine/);
  assert.doesNotMatch(prospectingProposals, /\/command\/growth-engine/);
});
