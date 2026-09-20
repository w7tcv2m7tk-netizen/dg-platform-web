import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/(shell)/apps/websites/health/page.tsx", "utf8");
const legacy = readFileSync("src/components/websites/HealthCentreDashboard.tsx", "utf8");

test("native Website Health is the default organisation-scoped path", () => {
  assert.match(page, /listWebsitesWithPages\(session\.organisationId\)/);
  assert.match(page, /buildNativeWebsiteHealth/);
  assert.match(page, /view === "wordpress"/);
});

test("legacy dashboard is explicitly WordPress migration-only", () => {
  assert.match(legacy, /WordPress migration/);
  assert.doesNotMatch(legacy, /connected migration site/);
});
