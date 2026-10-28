/** Offline, fail-closed verification of a sanitised Stage 2C capture. Never connects. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const sortedByName = (rows) => [...rows].sort((a, b) => a.migration_name.localeCompare(b.migration_name));
const key = (parts) => parts.join("\u0000");
const sortBy = (rows, keyFn) => [...rows].sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
const indexKey = (row) => key([row.tablename, row.indexname, row.indexdef]);
const constraintKey = (row) => key([row.table_name, row.conname, row.definition]);
const columnKey = (row) => key([row.table_name, row.column_name, row.data_type, row.udt_name, row.column_default, row.is_nullable]);
const parseDbTimestamp = (value) => Date.parse(String(value).replace(" ", "T").replace(/\+00$/, "+00:00"));
const EXPECTED_PROJECT_ID = "gentle-sky-35028642";
const EXPECTED_BRANCH_ID = "br-old-shadow-a7ffezls";

function assertUnique(rows, keyFn, label) {
  assert.equal(new Set(rows.map(keyFn)).size, rows.length, `${label} contains duplicate or ambiguous entries`);
}

export function verifyCheckoutReleasePreflight(observed, expected) {
  assert.equal(expected.status, "CERTIFIED_26_ROW_OFFLINE_EXPECTED", "expected evidence is not certified");
  assert.equal(expected.certified, true, "expected evidence is not certified");
  assert.equal(expected.freshCapturePending, false, "fresh capture is still pending");
  assert.equal(expected.projectId, EXPECTED_PROJECT_ID, "expected project identity mismatch");
  assert.equal(expected.branchId, EXPECTED_BRANCH_ID, "expected branch identity mismatch");
  assert.equal(observed.projectId, EXPECTED_PROJECT_ID, "observed project identity mismatch");
  assert.equal(observed.branchId, EXPECTED_BRANCH_ID, "observed branch identity mismatch");
  assert.equal(expected.ledger.length, 25, "certified historical baseline must contain 25 entries");
  assert.equal(expected.expectedLedgerCount, 26, "certified baseline must explicitly include the 26th entry");
  assert.equal(observed.ledger.length, 26, "capture must contain exactly 26 migrations");
  assertUnique(observed.ledger, (row) => row.migration_name, "observed ledger");
  assertUnique(expected.ledger, (row) => row.migration_name, "expected ledger");

  const additionName = expected.certifiedAddition.migration_name;
  assert.match(additionName, /^[A-Za-z0-9_]+$/, "certified addition name is malformed");
  assert.match(expected.certifiedAddition.checksum, /^[0-9a-f]{64}$/, "certified addition checksum is malformed");
  assert.equal(expected.ledger.some((row) => row.migration_name === additionName), false, "certified addition is duplicated in the historical baseline");
  assert.deepEqual(expected.historicalEntriesAbsentFromApplication, [
    "20260805_legacy_schema_baseline",
    "20261020_aida_conversation_schema_alignment",
  ]);
  for (const historical of expected.historicalEntriesAbsentFromApplication) {
    assert.equal(expected.ledger.some((row) => row.migration_name === historical), true, `historical baseline missing ${historical}`);
  }
  assert.equal(observed.ledger.filter((row) => row.migration_name === additionName).length, 1, "certified 26th migration is missing or duplicated");
  const observedBase = sortedByName(observed.ledger.filter((row) => row.migration_name !== additionName));
  assert.equal(observedBase.length, 25, "historical 25-row baseline is missing or changed");
  assert.deepEqual(observedBase, sortedByName(expected.ledger), "historical 25-row baseline changed");

  const addition = observed.ledger.find((row) => row.migration_name === additionName);
  assert.equal(addition.checksum, expected.certifiedAddition.checksum, "certified 26th migration checksum changed");
  assert.ok(addition.finished_at, "certified 26th migration is unfinished");
  assert.equal(addition.rolled_back_at, expected.certifiedAddition.rolled_back_at, "certified 26th migration was rolled back");
  assert.ok(expected.certifiedAddition.receiptStartedAt, "certified receipt start timestamp is missing");
  assert.ok(expected.certifiedAddition.receiptFinishedAt, "certified receipt finish timestamp is missing");
  const finished = parseDbTimestamp(addition.finished_at);
  const receiptStarted = parseDbTimestamp(expected.certifiedAddition.receiptStartedAt);
  const receiptFinished = parseDbTimestamp(expected.certifiedAddition.receiptFinishedAt);
  assert.ok(
    Number.isFinite(finished) && finished >= receiptStarted && finished <= receiptFinished,
    "certified 26th migration timestamp is outside the signed receipt window"
  );

  assert.equal(observed.gate.length, 1, "gate must contain exactly one row");
  assert.deepEqual(observed.gate, expected.gate, "gate state changed");
  assert.equal(observed.gate[0].blocked, true);
  assert.equal(observed.gate[0].subscription_webhooks_held, false);
  assert.equal(observed.gate[0].revision, 2);

  for (const [name, keyFn, label] of [
    ["indexes", indexKey, "index"],
    ["constraints", constraintKey, "constraint"],
    ["columns", columnKey, "column"],
  ]) {
    assert.ok(Array.isArray(observed[name]), `observed ${name} is missing`);
    assert.ok(Array.isArray(expected[name]), `expected ${name} is missing`);
    assertUnique(observed[name], keyFn, `observed ${name}`);
    assertUnique(expected[name], keyFn, `expected ${name}`);
    assert.deepEqual(sortBy(observed[name], keyFn), sortBy(expected[name], keyFn), `${label} schema changed`);
  }

  assert.equal(observed.subscriptionAggregates?.[0]?.subscriptions, 6, "subscription aggregate changed");
  assert.equal(observed.subscriptionAggregates?.[0]?.exemptions, 6, "exemption aggregate changed");

  return {
    status: "PASS",
    finishedMigrations: 26,
    historicalBaseMigrations: 25,
    certifiedHistoricalAdditions: 1,
    checkoutBlocked: true,
    holdInactive: true,
    gateRevision: 2,
    limitations: expected.limitations,
    exactTwentySixthFinishedAt: "UNVERIFIED — signed receipts provide a completion window, not the exact ledger-row timestamp",
    auditSequence: expected.auditSequence,
    defaultPrivileges: expected.defaultPrivileges,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.equal(process.argv.length, 3, "Pass a sanitised capture path only");
    const expected = JSON.parse(readFileSync(new URL("../docs/commerce/release-1025/production-readonly-evidence-26.json", import.meta.url), "utf8"));
    const pending = JSON.parse(readFileSync(new URL("../docs/commerce/release-1025/production-readonly-evidence-26-pending.json", import.meta.url), "utf8"));
    if (pending.freshCapturePending !== false) throw new Error("fresh 26-row evidence is still pending");
    if (pending.certifiedEvidence !== "production-readonly-evidence-26.json") {
      throw new Error("pending descriptor does not point to the certified expected evidence");
    }
    console.log(JSON.stringify(verifyCheckoutReleasePreflight(JSON.parse(readFileSync(process.argv[2], "utf8")), expected)));
  } catch (error) {
    console.error(`STOP: ${error instanceof Error ? error.message : "preflight verification failed"}. No write authorised.`);
    process.exitCode = 1;
  }
}
