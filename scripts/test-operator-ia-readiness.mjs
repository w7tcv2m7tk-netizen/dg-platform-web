import fs from "node:fs";
import assert from "node:assert/strict";

const nav = fs.readFileSync("packages/platform-core/src/apps/navigation.ts", "utf8");
const sidebar = fs.readFileSync("src/components/SidebarNav.tsx", "utf8");
const home = fs.readFileSync("src/components/command/CommandOpsHome.tsx", "utf8");

const order = ["command-centre", "dg-commercial", "dg-customer-intelligence", "dg-product", "dg-delivery", "dg-partners", "dg-support"];
let cursor = -1;
for (const id of order) {
  const next = sidebar.indexOf(`"${id}"`, cursor + 1);
  assert.ok(next > cursor, `${id} must be in canonical operator order`);
  cursor = next;
}
assert.doesNotMatch(sidebar, /"dg-platform-intelligence": "Intelligence"/);
assert.match(nav, /"dg-product", "Platform"/);
assert.match(nav, /path: "\/command\/docs", label: "Docs"/);
assert.match(nav, /path: "\/command\/intelligence", label: "Ask Intelligence"/);
assert.match(nav, /trailingLinks: \[\]/);
assert.match(sidebar, /\/api\/v1\/command\/support\/count/);
assert.match(home, /Platform Progress/);
assert.match(home, /PlatformRoadmapBar/);
assert.match(home, /Customers & Acquisition/);
assert.match(home, /Platform, Delivery & Partners/);

console.log("Operator IA readiness regression passed");
