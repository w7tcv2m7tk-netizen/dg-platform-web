import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Business Overview does not mount the Getting Started banner", async () => {
  const [page, dashboard] = await Promise.all([
    readFile("src/app/(shell)/dashboard/page.tsx", "utf8"),
    readFile("src/components/overview/BusinessOverviewDashboard.tsx", "utf8"),
  ]);

  const overviewMount = page.slice(page.indexOf("<BusinessOverviewDashboard"));
  assert.doesNotMatch(overviewMount, /workspaceSetup/);
  assert.doesNotMatch(overviewMount, /Gen2OnboardingChecklistBanner/);
  assert.doesNotMatch(dashboard, /workspaceSetup/);
  assert.doesNotMatch(dashboard, /Getting started/i);
  assert.match(page, /foundingCustomerMode[\s\S]*Gen2OnboardingChecklistBanner/);
});
