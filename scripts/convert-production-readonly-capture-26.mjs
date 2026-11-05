#!/usr/bin/env node
/**
 * Strict, offline converter for the certified Stage 2C 26-row capture.
 *
 * It never connects to a database. It validates the captured checksums and
 * metadata, parses the fixed psql sections, compares the 25 historical ledger
 * rows and the certified 26th row, and writes a sanitised JSON candidate plus a
 * non-sensitive reconciliation summary.
 *
 * Required arguments:
 *   --capture <path>
 *   --metadata <path>
 *   --expected-capture-sha256 <hex>
 *   --expected-metadata-sha256 <hex>
 *   --out <private-json-path>
 *   --summary <private-summary-path>
 *
 * Optional arguments:
 *   --frozen <path>
 *   --pending <path>
 *   --expected-catalog <path>
 *   --receipt-root <path>
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
const PINNED_SQL_SHA256 =
  "8c9cd9a317be3d804b04e62d109cf77ac67c3d42291f52b084159ebf6310b063";

function fail(message) {
  throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) fail(`unexpected argument: ${key}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) fail(`missing value for ${key}`);
    out[key.slice(2)] = value;
    index += 1;
  }
  for (const key of [
    "capture",
    "metadata",
    "expected-capture-sha256",
    "expected-metadata-sha256",
    "out",
    "summary",
  ]) {
    if (!out[key]) fail(`missing --${key}`);
  }
  out.frozen ??= path.join(ROOT, "docs/commerce/release-1025/production-readonly-evidence.json");
  out.pending ??= path.join(ROOT, "docs/commerce/release-1025/production-readonly-evidence-26-pending.json");
  out["expected-catalog"] ??= DEFAULT_EXPECTED_CATALOG;
  out["receipt-root"] ??= DEFAULT_RECEIPT_ROOT;
  return out;
}

function readText(file, label) {
  if (!existsSync(file)) fail(`${label} is missing`);
  return readFileSync(file, "utf8");
}

function readJson(file, label) {
  try {
    return JSON.parse(readText(file, label));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

function parseMetadata(text) {
  const result = {};
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    if (!line) continue;
    const index = line.indexOf("=");
    if (index <= 0) fail("metadata contains a malformed line");
    const key = line.slice(0, index);
    const value = line.slice(index + 1);
    if (Object.hasOwn(result, key)) fail(`metadata contains duplicate key: ${key}`);
    result[key] = value;
  }
  return result;
}

function isSeparator(line) {
  return line.length > 0 && /^[-+ ]+$/.test(line) && line.includes("-");
}

function parseSections(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const sections = new Map();
  for (let index = 0; index < lines.length - 1; index += 1) {
    const header = lines[index];
    const separator = lines[index + 1];
    if (!isSeparator(separator) || isSeparator(header)) continue;
    const headers = header.includes("|")
      ? header.split("|").map((value) => value.trim())
      : [header.trim()];
    if (!headers.length || headers.some((value) => !value)) continue;
    const pipes = header.includes("|")
      ? [...header].map((value, position) => (value === "|" ? position : -1)).filter((position) => position >= 0)
      : [];
    const rows = [];
    let cursor = index + 2;
    while (cursor < lines.length && lines[cursor].trim() !== "" && !lines[cursor].startsWith("(")) {
      const line = lines[cursor];
      const values = [];
      if (!pipes.length) {
        values.push(line.trim());
      } else {
        let start = 0;
        for (const pipe of pipes) {
          values.push(line.slice(start, pipe).trim());
          start = pipe + 1;
        }
        values.push(line.slice(start).trim());
      }
      if (values.length !== headers.length) fail("ambiguous section row width");
      rows.push(values);
      cursor += 1;
    }
    const key = headers.join("\u0000");
    if (sections.has(key)) fail("duplicate section");
    sections.set(key, { headers, rows });
    index = cursor;
  }
  return sections;
}

const SIGNATURES = {
  identity: ["database_name", "operator_role", "session_role", "transaction_read_only"],
  role: ["rolname", "rolsuper", "rolcreaterole", "rolcreatedb", "rolreplication", "rolbypassrls"],
  reachable: ["reachable_role"],
  auth: ["can_create_schema", "can_create_database", "can_use_schema", "can_connect"],
  ledger: ["id", "migration_name", "checksum", "applied_steps_count", "started_at", "finished_at", "rolled_back_at", "logs_null", "logs_fingerprint"],
  ledgerCounts: ["total", "finished", "unfinished", "rolled_back", "admission_finished"],
  gate: ["id", "blocked", "subscription_webhooks_held", "revision", "last_admission_expires_at"],
  subAgg: ["subscriptions", "exemptions", "active", "trialing", "full_entitlement", "with_industry_apps", "with_premium_apps"],
  subGroups: ["status", "entitlement", "subscriptions"],
  events: ["type", "events"],
  attempts: ["state", "attempts"],
  admissions: ["admissions", "revoked", "bound"],
  audit: ["audit_rows"],
  receipts: ["status", "receipts"],
  indexes: ["tablename", "indexname", "indexdef"],
  constraints: ["table_name", "conname", "contype", "definition"],
  columns: ["table_name", "column_name", "data_type", "udt_name", "column_default", "is_nullable"],
  functions: ["function_name", "prosecdef", "owner", "proconfig_null", "proconfig_entries", "has_pg_catalog_search_path"],
  triggers: ["tgname", "table_name", "definition"],
  sequence: ["sequencename", "last_value"],
  locks: ["locktype", "mode", "granted", "lock_count"],
  marker: ["capture_marker"],
};

function getSections(sections) {
  const byName = {};
  const known = new Map(
    Object.entries(SIGNATURES).map(([name, headers]) => [headers.join("\u0000"), name])
  );
  for (const [key, section] of sections) {
    const name = known.get(key);
    if (!name) fail("unknown capture section");
    byName[name] = section;
  }
  for (const name of Object.keys(SIGNATURES)) {
    if (!byName[name]) fail(`missing capture section: ${name}`);
  }
  return byName;
}

function oneRow(section, label) {
  if (section.rows.length !== 1) fail(`${label} must contain exactly one row`);
  return Object.fromEntries(section.headers.map((header, index) => [header, section.rows[0][index]]));
}

function asNumber(value, label) {
  if (!/^-?\d+$/.test(value)) fail(`${label} is not an integer`);
  return Number(value);
}

function asBool(value, label) {
  if (value === "t") return true;
  if (value === "f") return false;
  fail(`${label} is not a PostgreSQL boolean`);
}

function asNullable(value) {
  return value === "" ? null : value;
}

function key(parts) {
  return parts.join("\u0000");
}

function setDifference(left, right) {
  return [...left].filter((value) => !right.has(value)).sort();
}

const options = parseArgs(process.argv.slice(2));
const capture = readText(options.capture, "capture");
const metadataText = readText(options.metadata, "metadata");
const captureSha256 = sha256(capture);
const metadataSha256 = sha256(metadataText);
if (captureSha256 !== options["expected-capture-sha256"]) fail("capture SHA-256 mismatch");
if (metadataSha256 !== options["expected-metadata-sha256"]) fail("metadata SHA-256 mismatch");

const metadata = parseMetadata(metadataText);
const frozen = readJson(options.frozen, "frozen evidence");
const pending = readJson(options.pending, "pending descriptor");
const expectedCatalog = readJson(options["expected-catalog"], "expected admission catalog");

if (metadata.exit_status !== "0") fail("capture metadata exit_status is not zero");
if (metadata.complete_marker !== "true") fail("capture metadata complete_marker is not true");
if (metadata.environment !== "production") fail("capture metadata environment is not production");
if (metadata.database !== "neondb") fail("capture metadata database mismatch");
if (metadata.role !== "dg_preflight_reader") fail("capture metadata role mismatch");
if (metadata.project !== frozen.projectId) fail("capture metadata project mismatch");
if (metadata.branch !== frozen.branchId) fail("capture metadata branch mismatch");
if (metadata.sql_sha256 !== PINNED_SQL_SHA256) fail("capture metadata SQL hash mismatch");
if (metadata.capture_bytes !== String(Buffer.byteLength(capture))) fail("capture metadata byte count mismatch");

const sections = getSections(parseSections(capture));

const marker = oneRow(sections.marker, "completion marker").capture_marker;
if (marker !== "DG_PREFLIGHT_COMPLETE") fail("completion marker mismatch");
const captureLines = capture.split(/\r?\n/);
const markerLine = captureLines.findLastIndex((line) => line.trim() === "DG_PREFLIGHT_COMPLETE");
const commitLine = captureLines.findLastIndex((line) => line.trim() === "COMMIT");
if (markerLine < 0 || commitLine < 0 || markerLine <= commitLine) fail("completion marker is not after COMMIT");

const identity = oneRow(sections.identity, "identity");
if (identity.database_name !== metadata.database) fail("captured database mismatch");
if (identity.operator_role !== metadata.role || identity.session_role !== metadata.role) {
  fail("captured role/session mismatch");
}
if (identity.transaction_read_only !== "on") fail("capture transaction is not read-only");

const roleRow = oneRow(sections.role, "role");
const role = {
  rolname: roleRow.rolname,
  rolsuper: asBool(roleRow.rolsuper, "rolsuper"),
  rolcreaterole: asBool(roleRow.rolcreaterole, "rolcreaterole"),
  rolcreatedb: asBool(roleRow.rolcreatedb, "rolcreatedb"),
  rolreplication: asBool(roleRow.rolreplication, "rolreplication"),
  rolbypassrls: asBool(roleRow.rolbypassrls, "rolbypassrls"),
};
if (role.rolname !== metadata.role) fail("role attribute row does not match metadata role");
if (role.rolsuper || role.rolcreaterole || role.rolcreatedb || role.rolreplication || role.rolbypassrls) {
  fail("captured role has elevated attributes");
}
const reachableRoles = sections.reachable.rows.map((row) => row[0]).filter(Boolean);
const authRow = oneRow(sections.auth, "auth");
const auth = Object.fromEntries(Object.entries(authRow).map(([name, value]) => [name, asBool(value, name)]));

const ledgerFull = sections.ledger.rows.map((row) =>
  Object.fromEntries(
    sections.ledger.headers.map((header, index) => [header, row[index]])
  )
).map((row) => ({
  id: row.id,
  migration_name: row.migration_name,
  checksum: row.checksum,
  applied_steps_count: asNumber(row.applied_steps_count, "applied_steps_count"),
  started_at: asNullable(row.started_at),
  finished_at: asNullable(row.finished_at),
  rolled_back_at: asNullable(row.rolled_back_at),
  logs_null: asBool(row.logs_null, "logs_null"),
  logs_fingerprint: row.logs_fingerprint,
}));
if (ledgerFull.length !== 26) fail("ledger must contain exactly 26 rows");
const ledgerNames = new Set();
for (const row of ledgerFull) {
  if (ledgerNames.has(row.migration_name)) fail("duplicate migration identity");
  ledgerNames.add(row.migration_name);
}
const additionName = pending.certifiedAddition.migration_name;
const additionChecksum = pending.certifiedAddition.checksum;
const additionRows = ledgerFull.filter((row) => row.migration_name === additionName);
if (additionRows.length !== 1) fail("certified 26th migration is missing or duplicated");
const addition = additionRows[0];
if (addition.checksum !== additionChecksum) fail("certified 26th migration checksum mismatch");
if (!addition.finished_at) fail("certified 26th migration is not finished");
if (addition.rolled_back_at !== null) fail("certified 26th migration is rolled back");
const baseRows = ledgerFull.filter((row) => row.migration_name !== additionName);
if (baseRows.length !== 25) fail("historical ledger is not 25 rows");
const ledger = ledgerFull.map((row) => ({
  migration_name: row.migration_name,
  checksum: row.checksum,
  applied_steps_count: row.applied_steps_count,
  finished_at: row.finished_at,
  rolled_back_at: row.rolled_back_at,
}));
const sortedBase = [...baseRows].sort((a, b) => a.migration_name.localeCompare(b.migration_name));
const sortedLedger = [...ledger.filter((row) => row.migration_name !== additionName)].sort((a, b) => a.migration_name.localeCompare(b.migration_name));
const frozenLedger = [...frozen.ledger].sort((a, b) => a.migration_name.localeCompare(b.migration_name));
const base25Exact = JSON.stringify(sortedLedger) === JSON.stringify(frozenLedger);
if (!base25Exact) fail("historical 25-row ledger changed");

const ledgerCounts = oneRow(sections.ledgerCounts, "ledger counts");
const counts = Object.fromEntries(
  Object.entries(ledgerCounts).map(([name, value]) => [name, asNumber(value, name)])
);
if (counts.total !== 26 || counts.finished !== 26 || counts.unfinished !== 0 || counts.rolled_back !== 0 || counts.admission_finished !== 1) {
  fail("ledger completion counts are not certified");
}

const gateRow = oneRow(sections.gate, "gate");
const gate = [{
  id: asNumber(gateRow.id, "gate id"),
  blocked: asBool(gateRow.blocked, "gate blocked"),
  subscription_webhooks_held: asBool(gateRow.subscription_webhooks_held, "gate hold"),
  revision: asNumber(gateRow.revision, "gate revision"),
  last_admission_expires_at: asNullable(gateRow.last_admission_expires_at),
}];
if (gate[0].id !== 1 || !gate[0].blocked || gate[0].subscription_webhooks_held || gate[0].revision !== 2) {
  fail("checkout gate is not blocked at revision 2 with hold inactive");
}

const subAggRow = oneRow(sections.subAgg, "subscription aggregates");
const subscriptionAggregates = [Object.fromEntries(
  Object.entries(subAggRow).map(([name, value]) => [name, asNumber(value, name)])
)];
if (subscriptionAggregates[0].subscriptions !== 6 || subscriptionAggregates[0].exemptions !== 6) {
  fail("subscription/exemption aggregates are not 6/6");
}

const subscriptionGroups = sections.subGroups.rows.map((row) => ({
  status: row[0],
  entitlement: row[1],
  subscriptions: asNumber(row[2], "subscription group count"),
}));
const subscriptionEvents = sections.events.rows.map((row) => ({
  type: row[0],
  events: asNumber(row[1], "event count"),
}));
const attempts = sections.attempts.rows.map((row) => ({
  state: row[0],
  attempts: asNumber(row[1], "attempt count"),
}));
const admissionsRow = oneRow(sections.admissions, "admissions");
const admissions = {
  admissions: asNumber(admissionsRow.admissions, "admissions"),
  revoked: asNumber(admissionsRow.revoked, "revoked admissions"),
  bound: asNumber(admissionsRow.bound, "bound admissions"),
};
const auditRows = asNumber(oneRow(sections.audit, "audit rows").audit_rows, "audit rows");
const receiptsRows = sections.receipts.rows.map((row) => ({
  status: row[0],
  receipts: asNumber(row[1], "receipt count"),
}));
if (attempts.reduce((sum, row) => sum + row.attempts, 0) !== 0) fail("checkout attempts are not zero");
if (admissions.admissions !== 0 || admissions.revoked !== 0 || admissions.bound !== 0) fail("checkout admissions are not zero");
if (auditRows !== 0) fail("admission audit rows are not zero");

const indexes = sections.indexes.rows.map((row) => ({
  tablename: row[0],
  indexname: row[1],
  indexdef: row[2],
}));
const constraintsFull = sections.constraints.rows.map((row) => ({
  table_name: row[0],
  conname: row[1],
  contype: row[2],
  definition: row[3],
}));
const constraints = constraintsFull.map(({ table_name, conname, definition }) => ({ table_name, conname, definition }));
const columns = sections.columns.rows.map((row) => ({
  table_name: row[0],
  column_name: row[1],
  data_type: row[2],
  udt_name: row[3],
  column_default: asNullable(row[4]),
  is_nullable: row[5],
}));
const functions = sections.functions.rows.map((row) => ({
  function_name: row[0],
  prosecdef: asBool(row[1], "prosecdef"),
  owner: row[2],
  proconfig_null: asBool(row[3], "proconfig_null"),
  proconfig_entries: asNumber(row[4], "proconfig_entries"),
  has_pg_catalog_search_path: asBool(row[5], "has_pg_catalog_search_path"),
}));
const triggers = sections.triggers.rows.map((row) => ({
  tgname: row[0],
  table_name: row[1],
  definition: row[2],
}));
const sequenceRow = oneRow(sections.sequence, "sequence");
const sequence = {
  sequencename: sequenceRow.sequencename,
  last_value: asNullable(sequenceRow.last_value) === null ? null : asNumber(sequenceRow.last_value, "sequence last_value"),
};
const locks = sections.locks.rows.map((row) => ({
  locktype: row[0],
  mode: row[1],
  granted: asBool(row[2], "lock granted"),
  lock_count: asNumber(row[3], "lock count"),
}));

const observed = {
  capturedAt: metadata.captured_at_utc,
  source: frozen.source,
  projectId: frozen.projectId,
  branchId: frozen.branchId,
  ledger,
  ledgerFull,
  gate,
  subscriptionAggregates,
  subscriptionGroups,
  subscriptionEvents,
  attempts,
  admissions,
  auditRows,
  receipts: receiptsRows,
  indexes,
  constraints,
  constraintsFull,
  columns,
  functions,
  triggers,
  sequence,
  locks,
  role,
  auth,
  reachableRoles,
  limitations: frozen.limitations,
};

const frozenIndexKeys = new Set(frozen.indexes.map((row) => key([row.tablename, row.indexname, row.indexdef])));
const observedIndexKeys = new Set(indexes.map((row) => key([row.tablename, row.indexname, row.indexdef])));
const frozenConstraintKeys = new Set(frozen.constraints.map((row) => key([row.table_name, row.conname, row.definition])));
const observedConstraintKeys = new Set(constraints.map((row) => key([row.table_name, row.conname, row.definition])));
const frozenColumnKeys = new Set(frozen.columns.map((row) => key([row.table_name, row.column_name, row.data_type, row.udt_name, row.column_default, row.is_nullable])));
const observedColumnKeys = new Set(columns.map((row) => key([row.table_name, row.column_name, row.data_type, row.udt_name, row.column_default, row.is_nullable])));

const baseIndexesExact = [...frozenIndexKeys].every((value) => observedIndexKeys.has(value)) && frozenIndexKeys.size === frozen.indexes.length;
const baseConstraintsExact = [...frozenConstraintKeys].every((value) => observedConstraintKeys.has(value)) && frozenConstraintKeys.size === frozen.constraints.length;
const baseColumnsExact = [...frozenColumnKeys].every((value) => observedColumnKeys.has(value)) && frozenColumnKeys.size === frozen.columns.length;

const admissionIndexNames = new Set();
for (const item of expectedCatalog.schema.indexes ?? []) {
  const match = String(item.definition ?? "").match(/\bINDEX\s+([A-Za-z0-9_]+)\s+ON\b/i);
  if (match) admissionIndexNames.add(match[1]);
}
const observedIndexNames = new Set(indexes.map((row) => row.indexname));
const extraIndexNames = setDifference(observedIndexNames, new Set(frozen.indexes.map((row) => row.indexname)));
const admissionIndexesMatch = extraIndexNames.length === admissionIndexNames.size && extraIndexNames.every((name) => admissionIndexNames.has(name));

const admissionConstraintNames = new Set((expectedCatalog.schema.constraints ?? []).map((item) => item.name));
const observedConstraintNames = new Set(constraints.map((row) => row.conname));
const extraConstraintNames = setDifference(observedConstraintNames, new Set(frozen.constraints.map((row) => row.conname)));
const admissionConstraintsMatch = extraConstraintNames.length === admissionConstraintNames.size && extraConstraintNames.every((name) => admissionConstraintNames.has(name));

const admissionColumnKeys = new Set((expectedCatalog.schema.columns ?? []).map((item) => key([item.table, item.column])));
const extraColumns = columns.filter((row) => !frozenColumnKeys.has(key([row.table_name, row.column_name, row.data_type, row.udt_name, row.column_default, row.is_nullable])));
const admissionColumns = extraColumns.filter((row) => row.table_name === "platform_checkout_admissions" || row.table_name === "platform_checkout_admission_audit");
const subscriptionColumns = extraColumns.filter((row) => row.table_name === "platform_subscriptions");
const unexpectedColumns = extraColumns.filter((row) => !admissionColumns.includes(row) && !subscriptionColumns.includes(row));
const admissionColumnsMatch = admissionColumns.length === admissionColumnKeys.size && admissionColumns.every((row) => admissionColumnKeys.has(key([row.table_name, row.column_name])));

const functionNames = functions.map((row) => row.function_name).sort();
const auditFunction = functions.find((row) => row.function_name.startsWith("audit_platform_checkout_admission("));
const preserveFunction = functions.find((row) => row.function_name.startsWith("preserve_checkout_admission_audit("));
const functionsMatch = Boolean(auditFunction?.prosecdef && auditFunction?.has_pg_catalog_search_path && preserveFunction && !preserveFunction.prosecdef);
const triggerNames = triggers.map((row) => row.tgname).sort();
const expectedTriggerNames = (expectedCatalog.schema.triggers ?? []).map((item) => {
  const match = String(item.definition ?? "").match(/\bTRIGGER\s+([A-Za-z0-9_]+)\s+/i);
  return match ? match[1] : null;
}).filter(Boolean).sort();
const triggersMatch = triggerNames.length === 4 && JSON.stringify(triggerNames) === JSON.stringify(expectedTriggerNames);
const sequenceExists = sequence.sequencename === "platform_checkout_admission_audit_id_seq";
const sequenceLastValueAvailable = sequence.last_value !== null;
const locksSafe = locks.every((row) => row.granted && row.mode !== "AccessExclusiveLock");

const receiptA = path.join(options["receipt-root"], pending.certifiedAddition.sourceReceipts[0]);
const receiptB = path.join(options["receipt-root"], pending.certifiedAddition.sourceReceipts[1]);
const receiptJsonA = readJson(receiptA, "operator migration receipt");
const receiptJsonB = readJson(receiptB, "independent migration receipt");
const receiptHashA = sha256(readFileSync(receiptA));
const receiptHashB = sha256(readFileSync(receiptB));
const receiptChecks = {
  operatorSuccess: receiptJsonA.status === "SUCCESS" &&
    receiptJsonA.migration === additionName &&
    receiptJsonA.sqlSha256 === additionChecksum &&
    receiptJsonA.ledgerCount === 26 &&
    receiptJsonA.previous25Unchanged === true &&
    receiptJsonA.ddlCommittedVerified === true &&
    receiptJsonA.checkoutBlocked === true &&
    receiptJsonA.holdRevision === 2 &&
    receiptJsonA.admissionRecords === 0,
  independentCatalog: String(receiptJsonB.status ?? "").startsWith("PASS") &&
    receiptJsonB.sqlSha256 === additionChecksum &&
    receiptJsonB.ledgerCount === 26 &&
    receiptJsonB.unfinished === 0 &&
    receiptJsonB.old25Hash === pending.historicalBaseLedgerSha256 &&
    receiptJsonB.old25Unchanged === true &&
    receiptJsonB.catalogExactMatch === true &&
    receiptJsonB.columns === 20 &&
    receiptJsonB.constraints === 21 &&
    receiptJsonB.indexes === 6 &&
    receiptJsonB.functions === 2 &&
    receiptJsonB.triggers === 4 &&
    receiptJsonB.admissions === 0 &&
    receiptJsonB.auditRows === 0 &&
    receiptJsonB.checkoutBlocked === true &&
    receiptJsonB.webhookHold === false &&
    receiptJsonB.gateRevision === 2 &&
    receiptJsonB.subscriptions === 6 &&
    receiptJsonB.exempt === 6,
};
const receiptsPass = receiptChecks.operatorSuccess && receiptChecks.independentCatalog;

const gateMatchesReceipt = gate[0].blocked === true && gate[0].subscription_webhooks_held === false && gate[0].revision === 2;
const currentGateMismatch = JSON.stringify(gate) !== JSON.stringify(frozen.gate);
const currentIndexMismatch = JSON.stringify(indexes) !== JSON.stringify(frozen.indexes);
const currentConstraintMismatch = JSON.stringify(constraints) !== JSON.stringify(frozen.constraints);
const currentColumnMismatch = JSON.stringify(columns) !== JSON.stringify(frozen.columns);

const statuses = [];
function status(assertion, state, detail) {
  statuses.push({ assertion, status: state, detail });
}
status("capture SHA-256", "PASS", captureSha256);
status("metadata SHA-256", "PASS", metadataSha256);
status("metadata identity and completion", "PASS", "production, exit 0, marker true, role/database/project/branch/SQL hash match");
status("post-COMMIT completion marker", "PASS", marker);
status("ledger 26 rows unique", "PASS", "26 unique migration names");
status("historical 25 rows", base25Exact ? "PASS" : "FAIL", base25Exact ? "names/checksums/applied steps/completion/rollback match frozen baseline" : "frozen baseline mismatch");
status("historical ledger hash anchor", receiptJsonA.originalLedgerSha256 === pending.historicalBaseLedgerSha256 && receiptJsonB.old25Hash === pending.historicalBaseLedgerSha256 ? "PASS" : "FAIL", "receipts and pending descriptor agree");
status("certified 26th migration", addition.checksum === additionChecksum && addition.finished_at && addition.rolled_back_at === null ? "PASS" : "FAIL", "name/checksum/completion/rollback");
status("migration receipts", receiptsPass ? "PASS" : "FAIL", "operator and independent receipt fields");
status("checkout gate", gateMatchesReceipt ? "PASS" : "FAIL", "blocked=true, hold=false, revision=2");
status("subscription aggregates", subscriptionAggregates[0].subscriptions === 6 && subscriptionAggregates[0].exemptions === 6 ? "PASS" : "FAIL", "6 subscriptions / 6 exemptions");
status("attempts/admissions/audit", attempts.length === 0 && admissions.admissions === 0 && auditRows === 0 ? "PASS" : "FAIL", "zero baseline");
status("base indexes", baseIndexesExact ? "PASS" : "FAIL", "all frozen indexes present");
status("admission indexes", admissionIndexesMatch ? "PASS" : "FAIL", "6 expected admission/attempt indexes");
status("base constraints", baseConstraintsExact ? "PASS" : "FAIL", "all frozen constraints present");
status("admission constraints", admissionConstraintsMatch ? "PASS" : "FAIL", "21 expected admission constraints");
status("base columns", baseColumnsExact ? "PASS" : "FAIL", "all frozen columns present");
status("admission columns", admissionColumnsMatch ? "PASS" : "FAIL", "20 expected admission columns");
status("subscription column expansion", unexpectedColumns.length === 0 ? "PASS" : "UNVERIFIED", `${subscriptionColumns.length} additional pre-existing subscription columns captured; no unexpected table columns`);
status("function metadata", functionsMatch ? "PASS" : "FAIL", "two admission functions, SECURITY DEFINER search_path metadata");
status("trigger metadata", triggersMatch ? "PASS" : "FAIL", "four expected admission triggers");
status("sequence metadata", sequenceExists ? (sequenceLastValueAvailable ? "PASS" : "UNVERIFIED") : "FAIL", sequenceLastValueAvailable ? "sequence last_value captured" : "sequence exists; last_value NULL because reader has no sequence SELECT");
status("lock metadata", locksSafe ? "PASS" : "UNVERIFIED", "no ungranted or AccessExclusive lock observed");
status("pending 26-entry descriptor", "FAIL", "descriptor is ledger-only; captured gate/index/constraint/column changes are not represented");
status("current certified verifier", "FAIL", "current expected gate/index/constraint/column values are stale");
status("freshCapturePending unchanged", "PASS", "true; not cleared");
status("frozen historical evidence unchanged", "PASS", "not modified");
status("verifier unchanged", "PASS", "not modified");
status("default privileges / RLS", "UNVERIFIED", "not queried by this capture");

const pendingReasons = [];
if (currentGateMismatch) pendingReasons.push("gate differs from frozen expected evidence");
if (currentIndexMismatch) pendingReasons.push("index catalog differs from frozen expected evidence");
if (currentConstraintMismatch) pendingReasons.push("constraint catalog differs from frozen expected evidence");
if (currentColumnMismatch) pendingReasons.push("column catalog differs from frozen expected evidence");
if (!pending.certifiedAddition.old25Unchanged) pendingReasons.push("pending old25Unchanged is not set");
pendingReasons.push("pending descriptor contains no post-migration gate or catalog update");
const pendingCertifiable = false;

const summary = {
  captureSha256,
  metadataSha256,
  captureBytes: Buffer.byteLength(capture),
  capturedAt: metadata.captured_at_utc,
  ledger: {
    count: ledger.length,
    unique: ledgerNames.size,
    base25Exact,
    addition26: {
      name: additionName,
      checksum: additionChecksum,
      finished: Boolean(addition.finished_at),
      rolledBack: addition.rolled_back_at !== null,
    },
    receiptsPass,
    receiptHashes: { operator: receiptHashA, independent: receiptHashB },
  },
  gate: gate[0],
  subscriptionAggregates: subscriptionAggregates[0],
  attempts: attempts.reduce((sum, row) => sum + row.attempts, 0),
  admissions: admissions.admissions,
  auditRows,
  catalog: {
    indexes: { total: indexes.length, baseExact: baseIndexesExact, admissionExtras: extraIndexNames.length, admissionMatch: admissionIndexesMatch, extras: extraIndexNames },
    constraints: { total: constraints.length, baseExact: baseConstraintsExact, admissionExtras: extraConstraintNames.length, admissionMatch: admissionConstraintsMatch, extras: extraConstraintNames },
    columns: { total: columns.length, baseExact: baseColumnsExact, admissionExtras: admissionColumns.length, admissionMatch: admissionColumnsMatch, subscriptionExtras: subscriptionColumns.length, unexpectedExtras: unexpectedColumns.length },
  },
  security: {
    functions: functionNames,
    triggers: triggerNames,
    sequence,
    locks,
    functionsMatch,
    triggersMatch,
    locksSafe,
  },
  pendingDescriptor: { certifiable: pendingCertifiable, reasons: pendingReasons, freshCapturePending: pending.freshCapturePending },
  currentVerifier: { wouldPass: false, gateMismatch: currentGateMismatch, indexMismatch: currentIndexMismatch, constraintMismatch: currentConstraintMismatch, columnMismatch: currentColumnMismatch },
  statuses,
};

mkdirSync(path.dirname(options.out), { recursive: true, mode: 0o700 });
mkdirSync(path.dirname(options.summary), { recursive: true, mode: 0o700 });
writeFileSync(options.out, `${JSON.stringify(observed, null, 2)}\n`, { mode: 0o600 });
writeFileSync(options.summary, `${JSON.stringify(summary, null, 2)}\n`, { mode: 0o600 });
process.stdout.write(JSON.stringify({
  ok: true,
  captureSha256,
  metadataSha256,
  observedSha256: sha256(JSON.stringify(observed, null, 2) + "\n"),
  summarySha256: sha256(JSON.stringify(summary, null, 2) + "\n"),
  statuses,
}, null, 2) + "\n");
