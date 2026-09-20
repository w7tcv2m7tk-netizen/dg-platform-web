import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/(shell)/apps/websites/health/page.tsx", "utf8");
const legacy = readFileSync("src/components/websites/HealthCentreDashboard.tsx", "utf8");

test("native Website Health is the default organisation-scoped path", () => {
  assert.ok(page.includes("listWebsitesWithPages(session.organisationId)"));
  assert.ok(page.includes("buildNativeWebsiteHealth"));
  assert.ok(page.includes('view === "wordpress"'));
});

test("legacy dashboard is explicitly WordPress migration-only", () => {
  assert.ok(legacy.includes("WordPress migration"));
  assert.equal(legacy.includes("connected migration site"), false);
});
