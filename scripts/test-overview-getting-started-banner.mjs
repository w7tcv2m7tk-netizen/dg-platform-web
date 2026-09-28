import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Business Overview hides Getting Started for the platform operator", async () => {
  const [page, dashboard] = await Promise.all([
    readFile("src/app/(shell)/dashboard/page.tsx", "utf8"),
    readFile("src/components/overview/BusinessOverviewDashboard.tsx", "utf8"),
  ]);

  assert.match(page, /getPlatformOperatorContext/);
  assert.match(page, /platformSession && !operator[\s\S]*Gen2OnboardingChecklistBanner/);
  assert.doesNotMatch(dashboard, /Getting started/i);
});

test("default sign-in resolves operators to Command Centre", async () => {
  const [routes, landing] = await Promise.all([
    readFile("src/lib/auth-routes.ts", "utf8"),
    readFile("src/app/post-login/page.tsx", "utf8"),
  ]);

  assert.match(routes, /AUTH_AFTER_SIGN_IN_URL = "\/post-login"/);
  assert.match(landing, /getPlatformOperatorContext/);
  assert.match(landing, /operator \? "\/command" : "\/dashboard"/);
});
