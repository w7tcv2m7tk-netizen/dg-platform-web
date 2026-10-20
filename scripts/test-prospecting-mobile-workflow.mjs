import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("src/app/(shell)/apps/prospecting/today/page.tsx", "utf8");
const actions = fs.readFileSync("src/components/prospecting/ProspectingTodayActions.tsx", "utf8");
const api = fs.readFileSync("src/app/api/v1/prospecting/prospects/[id]/call-outcome/route.ts", "utf8");
const discovery = fs.readFileSync("src/components/command/BusinessDiscoverySearch.tsx", "utf8");
const discoverySurface = fs.readFileSync("src/components/prospecting/ProspectingDiscoverySurface.tsx", "utf8");
const opportunityEngine = fs.readFileSync("packages/platform-core/src/command-centre/growth-engine/opportunity-engine.ts", "utf8");
const overview = fs.readFileSync("src/app/(shell)/apps/prospecting/page.tsx", "utf8");

// The approved qualified-first workflow uses the shared header and staged call preparation.
// Labels changed in the merged native experience; do not restore the older UI to satisfy tests.
assert.match(page, /ProspectingPageHeader title="Today"/);
assert.match(page, /Your Daily Top 3/);
assert.match(page, /row\.stage === "qualified"/);
assert.match(page, /row\.stage === "audit_created"/);
assert.match(actions, /Prepare call/);
assert.match(actions, /Hide call brief/);
assert.match(actions, /const callHref = active\.contactPhone \? `tel:/);
assert.match(actions, /showBrief && callHref/);
assert.match(actions, /What happened\?/);
for (const outcome of ["no_answer", "interested", "follow_up", "not_interested", "wrong_contact"]) {
  assert.match(actions, new RegExp(outcome));
  assert.match(api, new RegExp(outcome));
}
assert.match(api, /organisationId: session\.organisationId/);
assert.match(api, /follow_up_due/);
assert.match(api, /followUpDraft/);
assert.match(discovery, /prospectBookHref/);
assert.match(discovery, /router\.refresh\(\)/);
assert.match(discovery, /setSelected\(new Set\(\)\)/);
assert.match(discoverySurface, /href="\/apps\/prospecting\/prospects"/);
console.log("Prospecting mobile workflow checks passed.");

assert.doesNotMatch(opportunityEngine, /"prospect_created",\s*\n\s*\],/);
assert.match(opportunityEngine, /input\.contactPhone \|\| input\.contactEmail/);
assert.match(overview, /\["prospect", "audit_created"\]/);
assert.match(actions, /const needsResearch = active\.stage !== "qualified"/);
assert.match(actions, /Review research/);
assert.match(actions, /\/apps\/prospecting\/prospects\/\$\{active\.prospectId\}/);
