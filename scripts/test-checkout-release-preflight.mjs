import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { verifyCheckoutReleasePreflight } from "./verify-checkout-release-preflight.mjs";

const expected = JSON.parse(
  readFileSync(new URL("../docs/commerce/release-1025/production-readonly-evidence-26.json", import.meta.url))
);
const pending = JSON.parse(
  readFileSync(new URL("../docs/commerce/release-1025/production-readonly-evidence-26-pending.json", import.meta.url))
);

const addition = () => ({
  migration_name: expected.certifiedAddition.migration_name,
  checksum: expected.certifiedAddition.checksum,
  applied_steps_count: 1,
  started_at: expected.certifiedAddition.receiptStartedAt,
  finished_at: expected.certifiedAddition.receiptStartedAt,
  rolled_back_at: null,
  logs_null: true,
  logs_fingerprint: "d41d8cd98f00b204e9800998ecf8427e",
});

const observed26 = () => {
  const observed = structuredClone(expected);
  observed.ledger = [...expected.ledger, addition()];
  return observed;
};

test("certified 26-entry expected package passes", () => {
  const result = verifyCheckoutReleasePreflight(observed26(), expected);
  assert.equal(result.status, "PASS");
  assert.equal(result.finishedMigrations, 26);
  assert.equal(result.historicalBaseMigrations, 25);
  assert.equal(result.checkoutBlocked, true);
  assert.equal(result.holdInactive, true);
  assert.equal(result.gateRevision, 2);
});

test("pending descriptor is certified and points to the expected package", () => {
  assert.equal(pending.freshCapturePending, false);
  assert.equal(pending.certifiedEvidence, "production-readonly-evidence-26.json");
  assert.equal(pending.status, "CERTIFIED_26_ROW_OFFLINE_EXPECTED");
});

test("stale 25-row capture fails closed", () => {
  const observed = observed26();
  observed.ledger = structuredClone(expected.ledger);
  assert.throws(() => verifyCheckoutReleasePreflight(observed, expected), /exactly 26 migrations/i);
});

test("missing historical migration fails closed", () => {
  const observed = observed26();
  observed.ledger = observed.ledger.filter((row) => row.migration_name !== "20260805_legacy_schema_baseline");
  observed.ledger.push({ ...addition(), migration_name: "unexpected_replacement" });
  assert.throws(() => verifyCheckoutReleasePreflight(observed, expected));
});

test("unexpected migration fails closed", () => {
  const observed = observed26();
  observed.ledger.push({ ...addition(), migration_name: "future_migration" });
  assert.throws(() => verifyCheckoutReleasePreflight(observed, expected));
});

test("incorrect 26th checksum fails closed", () => {
  const observed = observed26();
  observed.ledger.find((row) => row.migration_name === expected.certifiedAddition.migration_name).checksum = "0".repeat(64);
  assert.throws(() => verifyCheckoutReleasePreflight(observed, expected));
});

test("unfinished 26th migration fails closed", () => {
  const observed = observed26();
  observed.ledger.find((row) => row.migration_name === expected.certifiedAddition.migration_name).finished_at = null;
  assert.throws(() => verifyCheckoutReleasePreflight(observed, expected));
});

test("rolled-back 26th migration fails closed", () => {
  const observed = observed26();
  observed.ledger.find((row) => row.migration_name === expected.certifiedAddition.migration_name).rolled_back_at = expected.certifiedAddition.receiptStartedAt;
  assert.throws(() => verifyCheckoutReleasePreflight(observed, expected));
});

test("26th timestamp outside the signed receipt window fails closed", () => {
  const observed = observed26();
  observed.ledger.find((row) => row.migration_name === expected.certifiedAddition.migration_name).finished_at = "2000-01-01 00:00:00+00";
  assert.throws(() => verifyCheckoutReleasePreflight(observed, expected));
});

test("wrong project/branch target fails closed", () => {
  const observed = observed26();
  observed.branchId = "other";
  assert.throws(() => verifyCheckoutReleasePreflight(observed, expected));
});

test("open checkout gate fails closed", () => {
  const observed = observed26();
  observed.gate[0].blocked = false;
  assert.throws(() => verifyCheckoutReleasePreflight(observed, expected));
});

test("active webhook hold fails closed", () => {
  const observed = observed26();
  observed.gate[0].subscription_webhooks_held = true;
  assert.throws(() => verifyCheckoutReleasePreflight(observed, expected));
});

test("incorrect gate revision fails closed", () => {
  const observed = observed26();
  observed.gate[0].revision = 1;
  assert.throws(() => verifyCheckoutReleasePreflight(observed, expected));
});

test("unexpected index fails closed", () => {
  const observed = observed26();
  observed.indexes[0].indexdef += " WHERE false";
  assert.throws(() => verifyCheckoutReleasePreflight(observed, expected));
});

test("changed column default fails closed", () => {
  const observed = observed26();
  observed.columns[0].column_default = "unexpected";
  assert.throws(() => verifyCheckoutReleasePreflight(observed, expected));
});

test("missing constraint fails closed", () => {
  const observed = observed26();
  observed.constraints.pop();
  assert.throws(() => verifyCheckoutReleasePreflight(observed, expected));
});

test("changed subscription/exemption aggregate fails closed", () => {
  const observed = observed26();
  observed.subscriptionAggregates[0].exemptions = 5;
  assert.throws(() => verifyCheckoutReleasePreflight(observed, expected));
});

test("unapproved expected evidence fails closed", () => {
  assert.throws(() => verifyCheckoutReleasePreflight(observed26(), { ...expected, certified: false }), /not certified/i);
});

test("pending expected evidence fails closed", () => {
  assert.throws(() => verifyCheckoutReleasePreflight(observed26(), { ...expected, freshCapturePending: true }), /pending/i);
});
