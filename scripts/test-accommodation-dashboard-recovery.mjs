import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(
  new URL("../src/components/accommodation/AccommodationDashboard.tsx", import.meta.url),
  "utf8",
);
const checkIns = readFileSync(
  new URL("../src/app/(shell)/apps/accommodation/check-ins/page.tsx", import.meta.url),
  "utf8",
);

test("accommodation load failures do not masquerade as empty onboarding", () => {
  assert.match(dashboard, /Accommodation is temporarily unavailable/);
  assert.match(dashboard, /not changed by this loading error/);
  assert.doesNotMatch(dashboard, /WordPress/);
});

test("accommodation dashboard customer actions meet the native touch target floor", () => {
  assert.match(dashboard, /min-h-11/);
  assert.match(dashboard, /Open units/);
  assert.match(dashboard, /Open bookings/);
});

test("check-in windows use the organisation timezone instead of a Brisbane label", () => {
  assert.match(checkIns, /select: \{ timezone: true \}/);
  assert.match(checkIns, /accToday\(organisationTimeZone\)/);
  assert.match(checkIns, /local date/);
  assert.doesNotMatch(checkIns, /\{today\} Brisbane/);
});

test("check-in guest actions meet the native touch target floor", () => {
  assert.match(checkIns, /min-h-11/);
  assert.match(checkIns, /Email guest/);
  assert.match(checkIns, /Call/);
});
