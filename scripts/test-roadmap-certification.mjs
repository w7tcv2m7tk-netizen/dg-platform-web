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
