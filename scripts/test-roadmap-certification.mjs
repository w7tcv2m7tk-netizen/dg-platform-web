import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const catalogue = readFileSync("packages/platform-core/src/roadmap/index.ts", "utf8");
const reconciliation = readFileSync("packages/platform-core/src/roadmap/reconciliation.ts", "utf8");
const panel = readFileSync("src/components/platform/PlatformRoadmapV2Panel.tsx", "utf8");

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
