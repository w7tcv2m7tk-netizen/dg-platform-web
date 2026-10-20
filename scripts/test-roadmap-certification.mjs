import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const catalogue = readFileSync("packages/platform-core/src/roadmap/index.ts", "utf8");
const reconciliation = readFileSync("packages/platform-core/src/roadmap/reconciliation.ts", "utf8");
const panel = readFileSync("src/components/platform/PlatformRoadmapV2Panel.tsx", "utf8");
const register = readFileSync("docs/ROADMAP.md", "utf8");
const guidance = readFileSync("AGENTS.md", "utf8");

test("roadmap catalogue is not presented as production certification authority", () => {
  assert.doesNotMatch(catalogue, /single source for progress UI/);
  assert.match(catalogue, /evidence-backed reconciliation layer/);
});

test("certified shipped-state corrections are explicit and auditable", () => {
  assert.match(reconciliation, /export const CERTIFIED_ROADMAP_STATUS/);
  assert.match(reconciliation, /certifiedRoadmapIds/);
  assert.match(reconciliation, /platform\.connector_google/);
  assert.match(reconciliation, /finance\.applications/);
  assert.match(reconciliation, /command\.revenue/);
});

test("Roadmap V2 renders reconciled rather than raw catalogue status", () => {
  assert.match(panel, /reconcileRoadmapItems/);
});

test("retired Founding programme does not inflate the live roadmap", () => {
  assert.match(reconciliation, /RETIRED_ROADMAP_IDS/);
  assert.match(reconciliation, /"founding\.pipeline"/);
  assert.match(reconciliation, /"founding\.invitation"/);
  assert.match(reconciliation, /"founding\.onboarding"/);
  assert.match(reconciliation, /"founding\.implementation"/);
  assert.match(reconciliation, /filter\(\(item\) => !RETIRED_ROADMAP_IDS\.has\(item\.id\)\)/);
});

test("roadmap progress is calculated from reconciled certified state", () => {
  assert.match(panel, /const all = reconcileRoadmapItems/);
  assert.match(panel, /percent\(selectedItems\)/);
  assert.match(panel, /categoryItems/);
});

test("existing register distinguishes delivery verification from approval and catalogue progress", () => {
  for (const state of ["COMPLETE AND VERIFIED", "IMPLEMENTED BUT UNVERIFIED", "IN PROGRESS", "APPROVED AND NOT STARTED", "BLOCKED", "AWAITING APPROVAL"]) {
    assert.ok(register.includes(state), `missing verification state: ${state}`);
  }
  assert.match(register, /Mocked Stripe tests must not be relabelled hosted Stripe test-mode E2E/);
  assert.match(register, /#1008 compatibility is already merged|#1008 compatibility is merged/);
  assert.match(register, /40\/40/);
  assert.match(register, /No new requirement is labelled \*\*APPROVED AND NOT STARTED\*\* without approval evidence/);
});

test("repository guidance requires requirement-linked evidence before task closure", () => {
  assert.match(guidance, /Every development task must reference its existing Roadmap requirement ID/);
  for (const field of ["Implementation reference", "Test commands", "Verification status", "Remaining work", "Blockers"]) assert.ok(guidance.includes(field));
  assert.match(guidance, /Implement only previously approved requirements/);
  assert.match(guidance, /Passing tests, merged/);
});

test("known billing and report release holds cannot display complete", () => {
  assert.match(reconciliation, /"detach\.portal_billing": "in_progress"/);
  assert.match(reconciliation, /"growth\.reports": "in_progress"/);
  assert.match(reconciliation, /"comms\.voice": "in_progress"/);
});
