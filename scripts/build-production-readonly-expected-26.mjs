#!/usr/bin/env node
/**
 * Build the reviewed, offline-only Stage 2C 26-row expected-evidence package.
 *
 * Expected values are derived from:
 *   - the unchanged frozen 25-row evidence;
 *   - the signed operator and independent migration receipts;
 *   - the approved admission expected-catalog;
 *   - the approved Prisma migration source for platform_subscriptions.
 *
 * The protected observed capture is used only with --check-observed to prove
 * parity; it is never used to derive expected values.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOME = os.homedir();
const DEFAULT_RECEIPT_ROOT = path.join(HOME, "Developer", "DigitalGate");
const DEFAULT_EXPECTED_CATALOG = path.join(
  DEFAULT_RECEIPT_ROOT,
  "Verification/Checkout-Certification-20261018/admission-production-operator-checks-20261027/owner-assisted-terminal/expected-catalog.json"
);
const FROZEN = path.join(ROOT, "docs/commerce/release-1025/production-readonly-evidence.json");
const PENDING = path.join(ROOT, "docs/commerce/release-1025/production-readonly-evidence-26-pending.json");
const OUTPUT = path.join(ROOT, "docs/commerce/release-1025/production-readonly-evidence-26.json");

function fail(message) {
  throw new Error(message);
}
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
function readJson(file, label) {
  if (!existsSync(file)) fail(`${label} is missing`);
  return JSON.parse(readFileSync(file, "utf8"));
}
function normalizeTimestamp(value) {
  if (!value) fail("receipt finished timestamp is missing");
  return value.replace("T", " ").replace("+00:00", "+00");
}
function parseDbTimestamp(value) {
  return Date.parse(value.replace(" ", "T").replace(/\+00$/, "+00:00"));
}
function admissionColumn(item) {
  const map = {
    bigint: ["bigint", "int8"],
    text: ["text", "text"],
    jsonb: ["jsonb", "jsonb"],
    "timestamp(6) with time zone": ["timestamp with time zone", "timestamptz"],
  };
  const mapped = map[item.type];
  if (!mapped) fail(`unmapped admission column type: ${item.type}`);
  return {
    table_name: item.table,
    column_name: item.column,
    data_type: mapped[0],
    udt_name: mapped[1],
    column_default: item.default,
    is_nullable: item.notnull ? "NO" : "YES",
  };
}
function admissionIndex(item) {
  const match = String(item.definition ?? "").match(/^CREATE (?:UNIQUE )?INDEX\s+(\S+)\s+ON\s+public\.(\S+)\s+USING\b/);
  if (!match) fail("unmapped admission index definition");
  return { tablename: match[2], indexname: match[1], indexdef: item.definition };
}
function admissionConstraint(item) {
  const table = item.name.startsWith("platform_checkout_admission_audit_")
    ? "platform_checkout_admission_audit"
    : item.name.startsWith("platform_checkout_admissions_") || item.name.startsWith("admission_")
      ? "platform_checkout_admissions"
      : null;
  if (!table) fail(`unmapped admission constraint: ${item.name}`);
  return { table_name: table, conname: item.name, definition: item.definition };
}

// Approved migration source:
// packages/database/prisma/migrations/20260826_platform_subscription_lifecycle/migration.sql
// packages/database/prisma/migrations/20261018_platform_subscription_app_entitlements/migration.sql
// Column order follows the Prisma PlatformSubscription model / migration order.
const subscriptionColumns = [
  ["id", "text", "text", null, "NO"],
  ["organisation_id", "text", "text", null, "NO"],
  ["status", "text", "text", "'TRIALING'::text", "NO"],
  ["entitlement", "text", "text", "'FULL'::text", "NO"],
  ["plan_tier", "text", "text", null, "YES"],
  ["stripe_customer_id", "text", "text", null, "YES"],
  ["stripe_subscription_id", "text", "text", null, "YES"],
  ["stripe_status", "text", "text", null, "YES"],
  ["trial_start", "timestamp without time zone", "timestamp", null, "YES"],
  ["trial_end", "timestamp without time zone", "timestamp", null, "YES"],
  ["current_period_start", "timestamp without time zone", "timestamp", null, "YES"],
  ["current_period_end", "timestamp without time zone", "timestamp", null, "YES"],
  ["cancel_at_period_end", "boolean", "bool", "false", "NO"],
  ["payment_failed_at", "timestamp without time zone", "timestamp", null, "YES"],
  ["grace_period_ends_at", "timestamp without time zone", "timestamp", null, "YES"],
  ["restricted_at", "timestamp without time zone", "timestamp", null, "YES"],
  ["suspended_at", "timestamp without time zone", "timestamp", null, "YES"],
  ["cancelled_at", "timestamp without time zone", "timestamp", null, "YES"],
  ["retention_ends_at", "timestamp without time zone", "timestamp", null, "YES"],
  ["founding_customer", "boolean", "bool", "false", "NO"],
  ["platform_exempt", "boolean", "bool", "false", "NO"],
  ["day3_reminder_at", "timestamp without time zone", "timestamp", null, "YES"],
  ["day7_reminder_at", "timestamp without time zone", "timestamp", null, "YES"],
  ["created_at", "timestamp without time zone", "timestamp", "CURRENT_TIMESTAMP", "NO"],
  ["updated_at", "timestamp without time zone", "timestamp", "CURRENT_TIMESTAMP", "NO"],
  ["industry_apps", "ARRAY", "_text", "ARRAY[]::text[]", "NO"],
  ["premium_apps", "ARRAY", "_text", "ARRAY[]::text[]", "NO"],
].map(([column_name, data_type, udt_name, column_default, is_nullable]) => ({
  table_name: "platform_subscriptions",
  column_name,
  data_type,
  udt_name,
  column_default,
  is_nullable,
}));

function sortByTableAndKey(rows, tableKey, valueKey) {
  return [...rows].sort((left, right) =>
    `${left[tableKey]}\u0000${left[valueKey]}`.localeCompare(`${right[tableKey]}\u0000${right[valueKey]}`)
  );
}

function main() {
  const frozen = readJson(FROZEN, "frozen historical evidence");
  const pending = readJson(PENDING, "pending descriptor");
  const catalog = readJson(DEFAULT_EXPECTED_CATALOG, "approved admission catalog");
  const receiptRoot = process.env.DG_RECEIPT_ROOT || DEFAULT_RECEIPT_ROOT;
  const operatorReceipt = readJson(
    path.join(receiptRoot, pending.certifiedAddition.sourceReceipts[0]),
    "operator migration receipt"
  );
  const independentReceipt = readJson(
    path.join(receiptRoot, pending.certifiedAddition.sourceReceipts[1]),
    "independent migration receipt"
  );
  if (operatorReceipt.status !== "SUCCESS" || operatorReceipt.sqlSha256 !== pending.certifiedAddition.checksum) {
    fail("operator receipt does not certify the approved 26th migration");
  }
  if (!String(independentReceipt.status ?? "").startsWith("PASS") || independentReceipt.sqlSha256 !== pending.certifiedAddition.checksum) {
    fail("independent receipt does not certify the approved 26th migration");
  }
  if (independentReceipt.old25Hash !== pending.historicalBaseLedgerSha256 || independentReceipt.old25Unchanged !== true) {
    fail("independent receipt does not certify the historical 25-row baseline");
  }
  if (independentReceipt.gateRevision !== 2 || independentReceipt.checkoutBlocked !== true || independentReceipt.webhookHold !== false) {
    fail("independent receipt does not certify gate revision 2");
  }

  const ledger = frozen.ledger.map((row) => ({
    migration_name: row.migration_name,
    checksum: row.checksum,
    applied_steps_count: row.applied_steps_count,
    finished_at: row.finished_at,
    rolled_back_at: row.rolled_back_at,
  }));
  const certifiedAddition = {
    migration_name: pending.certifiedAddition.migration_name,
    checksum: pending.certifiedAddition.checksum,
    // Exact ledger-row timestamp is not present in the signed receipts. The
    // pending descriptor records it as unavailable; the signed receipt window
    // is used instead. The capture observation is not promoted to authority.
    finished_at: null,
    receiptStartedAt: normalizeTimestamp(operatorReceipt.startedAt),
    receiptFinishedAt: normalizeTimestamp(operatorReceipt.finishedAt),
    rolled_back_at: null,
    finished_at_note:
      "Exact ledger-row timestamp is not present in the signed receipts; the observed value is checked within the signed receipt window and is not promoted to expected authority.",
  };

  const expectedGate = [{
    id: 1,
    blocked: true,
    subscription_webhooks_held: false,
    revision: 2,
    // Historical frozen value plus zero admissions in both signed receipts.
    last_admission_expires_at: frozen.gate[0].last_admission_expires_at,
  }];

  const indexes = [
    ...frozen.indexes,
    ...(catalog.schema.indexes ?? []).map(admissionIndex),
  ].sort((left, right) => `${left.tablename}\u0000${left.indexname}`.localeCompare(`${right.tablename}\u0000${right.indexname}`));

  const constraints = [
    ...frozen.constraints,
    ...(catalog.schema.constraints ?? []).map(admissionConstraint),
  ].sort((left, right) => `${left.table_name}\u0000${left.conname}`.localeCompare(`${right.table_name}\u0000${right.conname}`));

  const baseColumns = frozen.columns.filter((row) => row.table_name !== "platform_subscriptions");
  const columns = sortByTableAndKey(
    [...baseColumns, ...subscriptionColumns, ...(catalog.schema.columns ?? []).map(admissionColumn)],
    "table_name",
    "column_name"
  );

  const expected = {
    status: "CERTIFIED_26_ROW_OFFLINE_EXPECTED",
    certified: true,
    freshCapturePending: false,
    certifiedAt: "2026-10-28T00:00:00.000Z",
    source:
      "Frozen 25-row historical evidence + signed operator/independent 26th-migration receipts + approved admission catalog + approved Prisma migration source",
    projectId: frozen.projectId,
    branchId: frozen.branchId,
    expectedLedgerCount: 26,
    baseLedgerCount: 25,
    historicalEntriesAbsentFromApplication: pending.historicalEntriesAbsentFromApplication,
    ledger,
    certifiedAddition,
    gate: expectedGate,
    subscriptionAggregates: frozen.subscriptionAggregates,
    indexes,
    constraints,
    columns,
    auditSequence: {
      source: "approved admission expected-catalog + independent operator receipt",
      last_value: catalog.sequence_state?.last_value ?? null,
      is_called: catalog.sequence_state?.is_called ?? null,
      readerCaptureVisibility:
        "UNVERIFIED_IN_READER_CAPTURE: dg_preflight_reader has no sequence SELECT; observed last_value is NULL",
    },
    admissionSecurity: {
      relation_settings: catalog.relation_settings,
      source: "approved admission expected-catalog + independent receipt catalogExactMatch",
    },
    defaultPrivileges: {
      status: "UNVERIFIED",
      impact:
        "No pg_default_acl capture exists in the Stage 2C evidence. This does not establish default privileges for future objects.",
    },
    limitations:
      "Offline Stage 2C certification only. Default ACL absence is unverified. The exact 26th ledger-row finished_at is unverified; the signed receipt window is used and the capture value is not promoted to authority. The reader capture cannot expose audit sequence last_value; the independently signed expected-catalog and receipt establish it. Production deployment, runtime identity, credentials and checkout remain out of scope.",
  };

  assert.equal(expected.ledger.length, 25);
  assert.equal(expected.expectedLedgerCount, 26);
  assert.equal(expected.gate.length, 1);
  assert.equal(new Set(indexes.map((row) => `${row.tablename}\u0000${row.indexname}`)).size, indexes.length);
  assert.equal(new Set(constraints.map((row) => `${row.table_name}\u0000${row.conname}`)).size, constraints.length);
  assert.equal(new Set(columns.map((row) => `${row.table_name}\u0000${row.column_name}`)).size, columns.length);
  assert.equal(indexes.length, 12);
  assert.equal(constraints.length, 45);
  assert.equal(columns.length, 71);

  writeFileSync(OUTPUT, `${JSON.stringify(expected, null, 2)}\n`);

  const checkPath = process.argv.includes("--check-observed")
    ? process.argv[process.argv.indexOf("--check-observed") + 1]
    : null;
  if (checkPath) {
    const observed = readJson(checkPath, "observed capture");
    const observedBase = observed.ledger
      .filter((row) => row.migration_name !== certifiedAddition.migration_name)
      .sort((left, right) => left.migration_name.localeCompare(right.migration_name));
    const expectedBase = [...ledger].sort((left, right) => left.migration_name.localeCompare(right.migration_name));
    assert.deepEqual(observedBase, expectedBase, "observed historical ledger differs from expected");
    const observedAddition = observed.ledger.find((row) => row.migration_name === certifiedAddition.migration_name);
    assert.ok(observedAddition, "observed certified 26th migration is missing");
    assert.equal(observedAddition.checksum, certifiedAddition.checksum);
    assert.equal(observedAddition.rolled_back_at, certifiedAddition.rolled_back_at);
    assert.ok(observedAddition.finished_at, "observed certified migration has no finished timestamp");
    const observedFinished = parseDbTimestamp(observedAddition.finished_at);
    const receiptStarted = parseDbTimestamp(certifiedAddition.receiptStartedAt);
    const receiptFinished = parseDbTimestamp(certifiedAddition.receiptFinishedAt);
    assert.ok(
      Number.isFinite(observedFinished) && observedFinished >= receiptStarted && observedFinished <= receiptFinished,
      "observed certified migration timestamp is outside the signed receipt window"
    );
    assert.deepEqual(observed.gate, expected.gate, "observed gate differs from expected");
    assert.deepEqual(
      sortByTableAndKey(observed.indexes, "tablename", "indexname"),
      sortByTableAndKey(expected.indexes, "tablename", "indexname"),
      "observed indexes differ from expected"
    );
    assert.deepEqual(
      sortByTableAndKey(observed.constraints, "table_name", "conname"),
      sortByTableAndKey(expected.constraints, "table_name", "conname"),
      "observed constraints differ from expected"
    );
    assert.deepEqual(
      sortByTableAndKey(observed.columns, "table_name", "column_name"),
      sortByTableAndKey(expected.columns, "table_name", "column_name"),
      "observed columns differ from expected"
    );
    assert.equal(observed.subscriptionAggregates[0].subscriptions, 6);
    assert.equal(observed.subscriptionAggregates[0].exemptions, 6);
  }

  console.log(JSON.stringify({
    ok: true,
    output: path.relative(ROOT, OUTPUT),
    sha256: sha256(readFileSync(OUTPUT)),
    ledger: { base: ledger.length, total: expected.expectedLedgerCount },
    indexes: indexes.length,
    constraints: constraints.length,
    columns: columns.length,
    observedParity: Boolean(checkPath),
    auditSequence: expected.auditSequence,
    defaultPrivileges: expected.defaultPrivileges,
  }, null, 2));
}

main();
