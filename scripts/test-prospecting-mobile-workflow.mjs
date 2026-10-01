import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("src/app/(shell)/apps/prospecting/today/page.tsx", "utf8");
const actions = fs.readFileSync("src/components/prospecting/ProspectingTodayActions.tsx", "utf8");
const api = fs.readFileSync("src/app/api/v1/prospecting/prospects/[id]/call-outcome/route.ts", "utf8");
const discovery = fs.readFileSync("src/components/command/BusinessDiscoverySearch.tsx", "utf8");
const discoverySurface = fs.readFileSync("src/components/prospecting/ProspectingDiscoverySurface.tsx", "utf8");
const opportunityEngine = fs.readFileSync("packages/platform-core/src/command-centre/growth-engine/opportunity-engine.ts", "utf8");
const overview = fs.readFileSync("src/app/(shell)/apps/prospecting/page.tsx", "utf8");

assert.match(page, /Prospecting Today/);
assert.match(page, /Next best action/);
assert.match(actions, /Call brief/);
assert.match(actions, /Call now/);
assert.match(actions, /What happened\?/);
for (const outcome of ["no_answer", "interested", "follow_up", "not_interested", "wrong_contact"]) {
  assert.match(actions, new RegExp(outcome));
  assert.match(api, new RegExp(outcome));
}
assert.match(api, /organisationId: session\.organisationId/);
assert.match(api, /follow_up_due/);
assert.match(api, /followUpDraft/);
assert.match(discovery, /prospectBookHref/);
assert.match(discovery, /router\.push/);
assert.match(discoverySurface, /id="prospect-book"/);
console.log("Prospecting mobile workflow checks passed.");

assert.doesNotMatch(opportunityEngine, /"prospect_created",/);
assert.match(opportunityEngine, /input\.contactPhone \|\| input\.contactEmail/);
assert.match(overview, /\["prospect", "audit_created"\]/);
assert.match(today, /Research prospect/);
assert.match(today, /Enrich contact/);
