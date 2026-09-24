import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync("packages/platform-core/src/command-centre/client-intelligence.ts", "utf8");

assert.match(source, /async function safeAggregateRows<T>/);
assert.match(source, /aggregate unavailable/);
assert.match(source, /safeAggregateRows\("open-opportunities"/);
assert.match(source, /safeAggregateRows\("leads-this-month"/);
assert.match(source, /safeAggregateRows\("activities-this-month"/);
assert.match(source, /safeAggregateRows\("active-subscriptions"/);
assert.match(source, /safeAggregateRows\("paid-invoices-month-to-date"/);

const guarded = [...source.matchAll(/safeAggregateRows\("/g)].length;
assert.ok(guarded >= 8, `expected at least 8 guarded aggregate queries, got ${guarded}`);

console.log("Client Intelligence aggregate resilience checks passed");
