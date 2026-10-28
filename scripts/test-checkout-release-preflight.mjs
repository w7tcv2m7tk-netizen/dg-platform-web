import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { verifyCheckoutReleasePreflight } from "./verify-checkout-release-preflight.mjs";

const base = JSON.parse(readFileSync(new URL("../docs/commerce/release-1025/production-readonly-evidence.json", import.meta.url)));
const pending = JSON.parse(readFileSync(new URL("../docs/commerce/release-1025/production-readonly-evidence-26-pending.json", import.meta.url)));
const expected = {
  ...base,
  expectedLedgerCount: pending.expectedLedgerCount,
  certifiedHistoricalAdditions: [pending.certifiedAddition],
  historicalEntriesAbsentFromApplication: pending.historicalEntriesAbsentFromApplication,
};
const addition = () => ({
  id: "11111111-1111-4111-8111-111111111111",
  migration_name: pending.certifiedAddition.migration_name,
  checksum: pending.certifiedAddition.checksum,
  applied_steps_count: 0,
  started_at: "2026-10-27 05:32:21.743607+00",
  finished_at: "2026-10-27 05:32:21.743607+00",
  rolled_back_at: null,
  logs_null: false,
  logs_fingerprint: "d41d8cd98f00b204e9800998ecf8427e",
});
const observed26 = () => {
  const observed = structuredClone(expected);
  observed.ledger.push(addition());
  observed.ledger.reverse();
  return observed;
};

test("certified 26-entry historical baseline passes regardless of ledger order", () => {
  assert.deepEqual(verifyCheckoutReleasePreflight(observed26(), expected), {
    status: "PASS",
    finishedMigrations: 26,
    historicalBaseMigrations: 25,
    certifiedHistoricalAdditions: 1,
    checkoutBlocked: true,
    holdInactive: true,
    limitation: "Read-only capture parity only; fresh 26-row catalog/gate evidence and runtime routing/identity-specific exemptions require separate verification",
  });
});

test("historical 25-entry evidence is stale and never accepted as current", () => {
  assert.throws(() => verifyCheckoutReleasePreflight(structuredClone(base), expected), /stale 25-row capture/i);
});

for (const [label, alter] of [
  ["missing migration", e => {
    e.ledger = e.ledger.filter(row => row.migration_name !== "20260805_legacy_schema_baseline");
    e.ledger.push({ ...addition(), id: "22222222-2222-4222-8222-222222222222", migration_name: "unexpected_replacement" });
  }],
  ["unexpected migration", e => e.ledger.push({ ...addition(), id: "33333333-3333-4333-8333-333333333333", migration_name: "future_migration" })],
  ["incorrect checksum", e => { e.ledger.find(row => row.migration_name === pending.certifiedAddition.migration_name).checksum = "0".repeat(64); }],
  ["unfinished migration", e => { e.ledger.find(row => row.migration_name === pending.certifiedAddition.migration_name).finished_at = null; }],
  ["rolled-back migration", e => { e.ledger.find(row => row.migration_name === pending.certifiedAddition.migration_name).rolled_back_at = "2026-10-27 05:32:21.743607+00"; }],
  ["wrong target", e => { e.branchId = "other"; }],
  ["open checkout", e => { e.gate[0].blocked = false; }],
  ["active hold", e => { e.gate[0].subscription_webhooks_held = true; }],
  ["unexpected index", e => { e.indexes[0].indexdef += " WHERE false"; }],
  ["changed column default", e => { e.columns[0].column_default = "unexpected"; }],
  ["missing constraint", e => { e.constraints.pop(); }],
  ["exemption count changed", e => { e.subscriptionAggregates[0].exemptions = 5; }],
]) test(label + " fails closed", () => {
  const e = observed26();
  alter(e);
  assert.throws(() => verifyCheckoutReleasePreflight(e, expected));
});
