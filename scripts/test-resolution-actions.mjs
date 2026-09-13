import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const actionPath = new URL("../src/components/ui/ResolutionAction.tsx", import.meta.url);
const healthPath = new URL("../src/components/intelligence/BusinessHealthDashboard.tsx", import.meta.url);
const insightsPath = new URL("../src/components/intelligence/InsightsDashboard.tsx", import.meta.url);

const action = fs.readFileSync(actionPath, "utf8");
const health = fs.readFileSync(healthPath, "utf8");
const insights = fs.readFileSync(insightsPath, "utf8");

test("shared resolution action supports automatic, guided and manual remediation", () => {
  assert.match(action, /automatic/);
  assert.match(action, /guided/);
  assert.match(action, /manual/);
  assert.match(action, /Fix now/);
});

test("unmapped issues have a safe Advisor fallback instead of a dead end", () => {
  assert.match(action, /\/dashboard\/advisor/);
  assert.match(action, /Help me fix this/);
});

test("Business Health warnings and evidence gaps expose resolution actions", () => {
  assert.match(health, /ResolutionAction/);
  assert.match(health, /Improve coverage/);
  assert.match(health, /Improve this/);
  assert.match(health, /predictiveAlerts/);
});

test("Insights recommendations never end without a resolution path", () => {
  assert.match(insights, /ResolutionAction/);
  assert.match(insights, /Fix now/);
  assert.match(insights, /Get help fixing it/);
});
