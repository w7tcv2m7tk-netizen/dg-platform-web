import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(
  new URL("../src/components/accommodation/AccommodationDashboard.tsx", import.meta.url),
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
