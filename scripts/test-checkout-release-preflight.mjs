import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { verifyCheckoutReleasePreflight } from "./verify-checkout-release-preflight.mjs";
const expected = JSON.parse(readFileSync(new URL("../docs/commerce/release-1025/production-readonly-evidence.json", import.meta.url)));
test("exact 25-row capture passes regardless of ledger order", () => {
 const observed = structuredClone(expected); observed.ledger.reverse();
 assert.equal(verifyCheckoutReleasePreflight(observed, expected).status, "PASS");
});
for (const [label, alter] of [
 ["wrong target", e => { e.branchId = "other"; }],
 ["missing migration", e => { e.ledger.pop(); }],
 ["extra migration", e => { e.ledger.push(e.ledger[0]); }],
 ["changed checksum", e => { e.ledger[0].checksum = "0".repeat(64); }],
 ["changed microsecond timestamp", e => { e.ledger[0].finished_at += "1"; }],
 ["unfinished entry", e => { e.ledger[0].finished_at = null; }],
 ["rolled back entry", e => { e.ledger[0].rolled_back_at = e.ledger[0].finished_at; }],
 ["open checkout", e => { e.gate[0].blocked = false; }],
 ["active hold", e => { e.gate[0].subscription_webhooks_held = true; }],
 ["unexpected index", e => { e.indexes[0].indexdef += " WHERE false"; }],
 ["changed column default", e => { e.columns[0].column_default = "unexpected"; }],
 ["missing constraint", e => { e.constraints.pop(); }],
 ["exemption count changed", e => { e.subscriptionAggregates[0].exemptions = 5; }],
]) test(label + " fails closed", () => { const e = structuredClone(expected); alter(e); assert.throws(() => verifyCheckoutReleasePreflight(e, expected)); });
