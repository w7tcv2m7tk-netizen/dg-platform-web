/** Offline, fail-closed verification of a sanitised read-only capture. Never connects. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
export function verifyCheckoutReleasePreflight(observed, expected) {
  assert.equal(observed.projectId, "gentle-sky-35028642");
  assert.equal(observed.branchId, "br-old-shadow-a7ffezls");
  assert.equal(observed.ledger.length, 25);
  assert.equal(new Set(observed.ledger.map(row => row.migration_name)).size, 25);
  // Preserve complete microsecond timestamps and all original ledger fields.
  const sorted = rows => [...rows].sort((a, b) => a.migration_name.localeCompare(b.migration_name));
  assert.deepEqual(sorted(observed.ledger), sorted(expected.ledger));
  for (const row of observed.ledger) {
    assert.ok(row.finished_at);
    assert.equal(row.rolled_back_at, null);
  }
  assert.equal(observed.gate.length, 1);
  assert.deepEqual(observed.gate[0], expected.gate[0]);
  assert.equal(observed.gate[0].blocked, true);
  assert.equal(observed.gate[0].subscription_webhooks_held, false);
  assert.deepEqual(observed.indexes, expected.indexes);
  assert.deepEqual(observed.constraints, expected.constraints);
  assert.deepEqual(observed.columns, expected.columns);
  assert.equal(observed.subscriptionAggregates[0].exemptions, 6);
  return { status: "PASS", finishedMigrations: 25, checkoutBlocked: true, holdInactive: true,
    limitation: "Read-only capture parity only; runtime routing and identity-specific exemptions require separate verification" };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.equal(process.argv.length, 3, "Pass a sanitised capture path only");
    const expected = JSON.parse(readFileSync(new URL("../docs/commerce/release-1025/production-readonly-evidence.json", import.meta.url), "utf8"));
    console.log(JSON.stringify(verifyCheckoutReleasePreflight(JSON.parse(readFileSync(process.argv[2], "utf8")), expected)));
  } catch {
    console.error("STOP: read-only capture differs from reviewed release preconditions; review privately. No write authorised.");
    process.exitCode = 1;
  }
}
