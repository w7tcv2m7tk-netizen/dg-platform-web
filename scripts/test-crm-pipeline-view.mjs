import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/app/(shell)/apps/crm/pipeline/page.tsx", "utf8");
const manifest = fs.readFileSync("packages/platform-core/src/apps/builtins/crm.ts", "utf8");

test("Pipeline reuses Opportunity read authority and tenant scope", () => {
  assert.match(page, /getAuthorisedPlatformPageSession\("crm\.opportunities\.read"\)/);
  assert.match(page, /organisationId: session\.organisationId/);
  assert.match(page, /listOpportunities/);
});

test("Pipeline is a view over canonical Opportunities, not a second CRM entity", () => {
  assert.match(page, /Pipeline is a workflow view of CRM Opportunities/);
  assert.doesNotMatch(manifest, /"Pipeline"\s*,\s*"Activity"/);
  assert.match(manifest, /reports: \[\{ id: "crm\.pipeline_summary"/);
});

test("CRM navigation exposes the derived Pipeline view", () => {
  assert.match(manifest, /path: "\/apps\/crm\/pipeline", label: "Pipeline"/);
  assert.match(manifest, /href: "\/apps\/crm\/pipeline", label: "Pipeline"/);
});
