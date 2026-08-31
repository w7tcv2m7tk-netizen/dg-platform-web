/**
 * P1 — Gen 2 onboarding decoupling static gate tests.
 * Complements (does not replace) authenticated walkthrough + WP-unavailable network gate.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("GEN2_ONBOARDING_STEPS includes team and systems in order", () => {
  const src = read("packages/platform-core/src/onboarding/gen2-journey.ts");
  const match = src.match(/export const GEN2_ONBOARDING_STEPS = \[([\s\S]*?)\] as const;/);
  assert.ok(match, "GEN2_ONBOARDING_STEPS missing");
  const steps = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.equal(steps.length, 14);
  assert.deepEqual(steps.slice(0, 7), [
    "welcome",
    "business_identity",
    "business_profile",
    "goals",
    "team",
    "systems",
    "plan",
  ]);
});

test("fetchPortalMe has no WordPress /portal/me fallback", () => {
  const src = read("src/lib/dg-api.ts");
  const start = src.indexOf("export async function fetchPortalMe");
  const end = src.indexOf("export type OnboardingPayload");
  assert.ok(start >= 0 && end > start, "fetchPortalMe block missing");
  const fn = src.slice(start, end);
  assert.doesNotMatch(fn, /\bfetch\s*\(/);
  assert.doesNotMatch(fn, /getApiBase\(\)/);
  assert.match(fn, /resolvePortalProfileFromNeon/);
});

test("pingApi does not OPTIONS WordPress onboarding", () => {
  const src = read("src/lib/dg-api.ts");
  const fn = src.slice(src.indexOf("export async function pingApi"));
  assert.doesNotMatch(fn, /\/onboarding/);
  assert.doesNotMatch(fn, /method:\s*"OPTIONS"/);
  assert.match(fn, /wordpress/);
});

test("ensureOrganisationOnboardingSync is a no-op", () => {
  const src = read("src/lib/org-onboarding-sync.ts");
  assert.doesNotMatch(src, /syncOrganisationFromPortal/);
  assert.match(src, /return null/);
});

test("PlatformShellLoader does not call ensureOrganisationOnboardingSync", () => {
  const src = read("src/components/PlatformShellLoader.tsx");
  assert.doesNotMatch(src, /ensureOrganisationOnboardingSync/);
});

test("POST /api/v1/org/profile is deprecated (no WP sync)", () => {
  const src = read("src/app/api/v1/org/profile/route.ts");
  assert.doesNotMatch(src, /fetchPortalMe/);
  assert.doesNotMatch(src, /syncOrganisationFromPortal/);
  assert.match(src, /410/);
});

test("dg-onboarding-sync webhook does not pull from WordPress", () => {
  const src = read("src/app/api/webhooks/dg-onboarding-sync/route.ts");
  assert.doesNotMatch(src, /fetchPortalMe/);
  assert.match(src, /portal payload/i);
});

test("getOnboardingUrl defaults to Gen 2 app route", () => {
  const src = read("src/lib/dg-api.ts");
  assert.match(src, /app\.digitalgate\.com\.au\/onboarding/);
  assert.doesNotMatch(src, /digitalgate\.com\.au\/onboarding\//);
});

test("Support chat points to Gen 2 onboarding route", () => {
  const src = read("src/components/support/SupportChatPanel.tsx");
  assert.match(src, /href="\/onboarding"/);
  assert.doesNotMatch(src, /digitalgate\.com\.au\/onboarding/);
});

test("dashboard pages removed live onboarding sync calls", () => {
  const pages = [
    "src/app/(shell)/dashboard/twin/page.tsx",
    "src/app/(shell)/dashboard/business/page.tsx",
    "src/app/(shell)/dashboard/goals/page.tsx",
  ];
  for (const page of pages) {
    const src = read(page);
    assert.doesNotMatch(src, /ensureOrganisationOnboardingSync/);
  }
});

test("/founding/setup enters Gen 2 onboarding", () => {
  const src = read("src/app/(shell)/founding/setup/page.tsx");
  assert.match(src, /\/onboarding/);
  assert.doesNotMatch(src, /FoundingOnboardingWizard/);
});
