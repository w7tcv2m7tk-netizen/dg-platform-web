import assert from "node:assert/strict";
import test from "node:test";

import {
  GOOGLE_PLACES_MONTHLY_LIMIT_ENV,
  googlePlacesBudgetScope,
  googlePlacesMonthKey,
  googlePlacesMonthlyLimit,
} from "../packages/platform-core/src/business-discovery/google-budget.ts";

test("month key is UTC and resets at month boundary", () => {
  assert.equal(googlePlacesMonthKey(Date.parse("2026-11-30T23:59:59Z")), "2026-11");
  assert.equal(googlePlacesMonthKey(Date.parse("2026-12-01T00:00:00Z")), "2026-12");
});

test("monthly limit defaults to 250 and clamps invalid values", () => {
  delete process.env[GOOGLE_PLACES_MONTHLY_LIMIT_ENV];
  assert.equal(googlePlacesMonthlyLimit(), 250);
  process.env[GOOGLE_PLACES_MONTHLY_LIMIT_ENV] = "100";
  assert.equal(googlePlacesMonthlyLimit(), 100);
  process.env[GOOGLE_PLACES_MONTHLY_LIMIT_ENV] = "0";
  assert.equal(googlePlacesMonthlyLimit(), 250);
  process.env[GOOGLE_PLACES_MONTHLY_LIMIT_ENV] = "501";
  assert.equal(googlePlacesMonthlyLimit(), 250);
  delete process.env[GOOGLE_PLACES_MONTHLY_LIMIT_ENV];
});

test("budget scope is explicit and environment-aware", () => {
  const old = process.env.GOOGLE_PLACES_BUDGET_SCOPE;
  process.env.GOOGLE_PLACES_BUDGET_SCOPE = "preview";
  assert.equal(googlePlacesBudgetScope(), "preview");
  if (old === undefined) delete process.env.GOOGLE_PLACES_BUDGET_SCOPE;
  else process.env.GOOGLE_PLACES_BUDGET_SCOPE = old;
});
