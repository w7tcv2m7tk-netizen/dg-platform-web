import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("website mutation routes require canonical organisation permissions", async () => {
  const checks = [
    ["src/app/api/v1/websites/route.ts", ["view", "create"]],
    ["src/app/api/v1/websites/[id]/route.ts", ["view", "edit", "delete"]],
    ["src/app/api/v1/websites/[id]/pages/route.ts", ["view", "edit"]],
    ["src/app/api/v1/websites/[id]/pages/[pageId]/route.ts", ["view", "edit"]],
    ["src/app/api/v1/websites/[id]/pagespeed/route.ts", ["edit"]],
    ["src/app/api/v1/websites/images/route.ts", ["view", "edit"]],
    ["src/app/api/v1/websites/images/[id]/route.ts", ["delete"]],
    ["src/lib/website-studio-preview.ts", ["view"]],
  ];

  for (const [path, actions] of checks) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(source, /canAccessWebsiteStudio/);
    for (const action of actions) {
      assert.match(source, new RegExp(`canAccessWebsiteStudio\\(session, ["']${action}["']\\)`));
    }
  }
});

test("Website Health keeps mutation controls off read-only sessions", async () => {
  const source = await readFile(
    new URL("../src/app/(shell)/apps/websites/health/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /canAccessWebsiteStudio\(session, ["']edit["']\)/);
  assert.match(source, /canEdit \? \(\s*<PageSpeedRefreshButton/);
  assert.match(source, /const action = canEdit \? healthActionHref/);
});

test("legacy migration health does not expose connector plumbing to customers", async () => {
  const source = await readFile(
    new URL("../src/components/websites/HealthCentreDashboard.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /connectorBaseUrl/);
  assert.doesNotMatch(source, /roerealty\.com\.au/);
  assert.doesNotMatch(source, /GET \/site\/health/);
  assert.doesNotMatch(source, /DG Platform plugin/);
  assert.doesNotMatch(source, /<dt[^>]*>Code:/);
  assert.match(source, /Check the migration connection and try again/);
});
