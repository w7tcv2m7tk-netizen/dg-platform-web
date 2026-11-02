import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { assertDemoResetTarget, demoMembershipRole } from "../packages/platform-core/src/demo/authority.ts";

const seed = readFileSync("packages/platform-core/src/demo/seed.ts", "utf8");
const demoRoute = readFileSync("src/app/(shell)/demo/page.tsx", "utf8");
const partnerRoute = readFileSync("src/app/(shell)/partner/demo/page.tsx", "utf8");
const resetRoute = readFileSync("src/app/api/v1/demo/reset/route.ts", "utf8");

test("customer and partner demo grants remain supported", () => {
  assert.equal(demoMembershipRole("customer"), "demo:customer");
  assert.equal(demoMembershipRole("partner"), "demo:partner");
});

test("the unused staff grant is explicitly rejected before any database work", () => {
  assert.throws(() => demoMembershipRole("staff"), /Unsupported demo access/);
  assert.doesNotMatch(seed, /access:\s*"customer"\s*\|\s*"partner"\s*\|\s*"staff"/);
  assert.doesNotMatch(seed, /input\.access === "staff"/);
  assert.doesNotMatch(seed, /"dg:staff"/);
  assert.match(seed, /const role = demoMembershipRole\(input\.access\)/);
});

test("demo routes can only request customer or partner access", () => {
  assert.match(demoRoute, /from === "partner" \? "partner" : "customer"/);
  assert.match(partnerRoute, /access: "partner"/);
  assert.match(resetRoute, /session\.role === "demo:customer"\s*\? "customer"/);
  for (const source of [demoRoute, partnerRoute, resetRoute]) {
    assert.doesNotMatch(source, /access:\s*"staff"/);
    assert.doesNotMatch(source, /dg:staff/);
  }
});

test("reset refuses a non-demo customer tenant", () => {
  assert.throws(() => assertDemoResetTarget({ name: "Customer Business", slug: "customer-business", status: "active", settings: {} }), /non-demo/);
  assert.doesNotThrow(() => assertDemoResetTarget({ name: "Harbour & Co (Demo)", slug: "harbour-and-co-demo", status: "demo" }));
  assert.match(seed, /assertDemoResetTarget\(ensured\)/);
});
