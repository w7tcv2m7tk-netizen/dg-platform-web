/** Offline, fail-closed verification of a sanitised read-only capture. Never connects. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const sorted = (rows) => [...rows].sort((a, b) => a.migration_name.localeCompare(b.migration_name));

export function verifyCheckoutReleasePreflight(observed, expected) {
  assert.equal(observed.projectId, "gentle-sky-35028642");
  assert.equal(observed.branchId, "br-old-shadow-a7ffezls");

  const additions = expected.certifiedHistoricalAdditions ?? [];
  const expectedLedgerCount = expected.expectedLedgerCount ?? expected.ledger.length;
  assert.equal(expected.ledger.length, 25, "reviewed base ledger must contain 25 entries");
  assert.equal(expectedLedgerCount, 26, "expected baseline must explicitly include the certified 26th entry");
  assert.equal(additions.length, 1, "expected baseline must include exactly one certified historical addition");

  const addition = additions[0];
  assert.match(addition.migration_name, /^[A-Za-z0-9_]+$/);
  assert.match(addition.checksum, /^[0-9a-f]{64}$/);
  assert.equal(new Set(expected.ledger.map((row) => row.migration_name)).size, 25);
  assert.deepEqual(expected.historicalEntriesAbsentFromApplication, [
    "20260805_legacy_schema_baseline",
    "20261020_aida_conversation_schema_alignment",
  ]);
  for (const historical of expected.historicalEntriesAbsentFromApplication) {
    assert.equal(expected.ledger.some((row) => row.migration_name === historical), true, `base ledger missing ${historical}`);
  }
  assert.equal(expected.ledger.some((row) => row.migration_name === addition.migration_name), false);

  // A 25-row capture is the stale 23 October baseline. It is never current.
  if (observed.ledger.length === 25) assert.fail("stale 25-row capture; the certified baseline is 26 entries");
  assert.equal(observed.ledger.length, 26, "capture must contain exactly the 26 certified historical entries");
  assert.equal(new Set(observed.ledger.map((row) => row.migration_name)).size, 26, "duplicate migration identity");

  const baseNames = new Set(expected.ledger.map((row) => row.migration_name));
  const observedBase = observed.ledger.filter((row) => baseNames.has(row.migration_name));
  const observedAdditions = observed.ledger.filter((row) => row.migration_name === addition.migration_name);
  assert.equal(observedBase.length, 25, "one or more historical base migrations are missing");
  assert.equal(observedAdditions.length, 1, "certified historical addition is missing or duplicated");
  assert.deepEqual(sorted(observedBase), sorted(expected.ledger), "historical 25-row base changed");

  const added = observedAdditions[0];
  assert.equal(added.checksum, addition.checksum, "certified addition checksum changed");
  assert.ok(added.finished_at, "addition finished_at is missing");
  assert.equal(added.rolled_back_at, null, "addition was rolled back");
  for (const row of observed.ledger) {
    assert.ok(row.finished_at, `unfinished migration: ${row.migration_name}`);
    assert.equal(row.rolled_back_at, null, `rolled-back migration: ${row.migration_name}`);
  }

  assert.equal(observed.gate.length, 1);
  assert.deepEqual(observed.gate[0], expected.gate[0]);
  assert.equal(observed.gate[0].blocked, true);
  assert.equal(observed.gate[0].subscription_webhooks_held, false);
  assert.deepEqual(observed.indexes, expected.indexes);
  assert.deepEqual(observed.constraints, expected.constraints);
  assert.deepEqual(observed.columns, expected.columns);
  assert.equal(observed.subscriptionAggregates[0].subscriptions, 6);
  assert.equal(observed.subscriptionAggregates[0].exemptions, 6);

  return {
    status: "PASS",
    finishedMigrations: 26,
    historicalBaseMigrations: 25,
    certifiedHistoricalAdditions: 1,
    checkoutBlocked: true,
    holdInactive: true,
    limitation: "Read-only capture parity only; fresh 26-row catalog/gate evidence and runtime routing/identity-specific exemptions require separate verification",
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.equal(process.argv.length, 3, "Pass a sanitised capture path only");
    const base = JSON.parse(readFileSync(new URL("../docs/commerce/release-1025/production-readonly-evidence.json", import.meta.url), "utf8"));
    const pending = JSON.parse(readFileSync(new URL("../docs/commerce/release-1025/production-readonly-evidence-26-pending.json", import.meta.url), "utf8"));
    if (pending.freshCapturePending) {
      throw new Error("fresh 26-row expected evidence is pending; no current capture can be accepted");
    }
    const expected = {
      ...base,
      expectedLedgerCount: pending.expectedLedgerCount,
      certifiedHistoricalAdditions: [pending.certifiedAddition],
      historicalEntriesAbsentFromApplication: pending.historicalEntriesAbsentFromApplication,
    };
    console.log(JSON.stringify(verifyCheckoutReleasePreflight(JSON.parse(readFileSync(process.argv[2], "utf8")), expected)));
  } catch (error) {
    console.error(`STOP: ${error instanceof Error ? error.message : "preflight verification failed"}. No write authorised.`);
    process.exitCode = 1;
  }
}
