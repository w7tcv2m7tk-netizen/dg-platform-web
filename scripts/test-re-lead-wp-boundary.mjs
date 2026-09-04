import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const leadsRoute = fs.readFileSync("src/app/api/v1/leads/route.ts", "utf8");
const leadService = fs.readFileSync("packages/platform-core/src/leads/index.ts", "utf8");
const migrationRoute = fs.readFileSync(
  "src/app/api/v1/migrations/wordpress/real-estate/leads/route.ts",
  "utf8",
);

test("normal leads API cannot invoke WordPress import", () => {
  assert.doesNotMatch(leadsRoute, /syncWordPressVendorLeads/);
  assert.doesNotMatch(leadsRoute, /syncWordPressBuyerLeads/);
  assert.doesNotMatch(leadsRoute, /sync_wordpress/);
  assert.doesNotMatch(leadsRoute, /wordpress-sync/);
});

test("lead stage changes never write back to WordPress", () => {
  assert.doesNotMatch(leadService, /maybeWriteBackLeadStageToWordPress/);
  assert.doesNotMatch(leadService, /re\.stage_writeback/);
  assert.doesNotMatch(leadService, /resolveOrgWordPressConnector/);
  assert.doesNotMatch(leadService, /\/leads\/(?:buyer|vendor)\//);
});

test("legacy lead import is explicit, one-way and settings-managed", () => {
  assert.match(migrationRoute, /syncWordPressVendorLeads/);
  assert.match(migrationRoute, /syncWordPressBuyerLeads/);
  assert.match(migrationRoute, /module:\s*["']settings["']/);
  assert.match(migrationRoute, /action:\s*["']manage["']/);
  assert.match(migrationRoute, /scope:\s*["']organisation["']/);
  assert.match(migrationRoute, /direction:\s*["']wordpress_to_gen2["']/);
  assert.match(migrationRoute, /migrationOnly:\s*true/);
});
