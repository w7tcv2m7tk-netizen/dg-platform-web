import assert from "node:assert/strict";
import test from "node:test";

import {
  GOOGLE_PLACES_BUDGET_SCOPE_ENV,
  GOOGLE_PLACES_MONTHLY_LIMIT_ENV,
  GooglePlacesBudgetExhausted,
  googlePlacesUsageSnapshot,
  reserveGooglePlacesTextSearch,
} from "../packages/platform-core/src/business-discovery/google-budget.ts";

test("monthly allowance is atomic across concurrent reservations and retries", async () => {
  const scope = `budget-test-${process.pid}-${Date.now()}`;
  process.env[GOOGLE_PLACES_MONTHLY_LIMIT_ENV] = "2";
  process.env[GOOGLE_PLACES_BUDGET_SCOPE_ENV] = scope;

  const results = await Promise.allSettled(
    Array.from({ length: 16 }, () => reserveGooglePlacesTextSearch()),
  );
  const reserved = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter((result) => result.status === "rejected");

  assert.equal(reserved.length, 2);
  assert.equal(rejected.length, 14);
  assert.ok(rejected.every((result) => result.reason instanceof GooglePlacesBudgetExhausted));

  const snapshot = await googlePlacesUsageSnapshot();
  assert.equal(snapshot.available, true);
  assert.equal(snapshot.used, 2);
  assert.equal(snapshot.limit, 2);
  assert.equal(snapshot.remaining, 0);

  await assert.rejects(() => reserveGooglePlacesTextSearch(), GooglePlacesBudgetExhausted);
});
