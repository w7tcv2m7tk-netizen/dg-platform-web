import assert from "node:assert/strict";
import fs from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
const nav=fs.readFileSync("packages/platform-core/src/apps/navigation.ts","utf8");
assert.match(nav,/const GROW_APP_ORDER = \[[\s\S]*"prospecting"[\s\S]*"marketing"[\s\S]*"advertising"[\s\S]*"ai-visibility"[\s\S]*"seo"[\s\S]*"social"[\s\S]*"reviews"[\s\S]*"automation"[\s\S]*"analytics"/);
assert.doesNotMatch(nav,/SIDEBAR_HIDDEN_APP_IDS = new Set\(\[\s*"marketing"/);
assert.match(nav,/platformAppsNavItem\(false\)/);
assert.doesNotMatch(nav,/platformMarketplaceNavItem\(\)/);
assert.doesNotMatch(nav,/platformNetworkNavItem\(showCommandCentre\)/);
assert.match(nav,/platformSettingsNavItem\(\)/);
console.log("customer sidebar canonical app checks passed");

// Execute the shared sidebar fallback with absent/present Marketing and Prospecting.
const sidebar = fs.readFileSync("src/components/SidebarNav.tsx", "utf8");
const source = ts.createSourceFile("SidebarNav.tsx", sidebar, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let initializer;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "growthSection") initializer = node.initializer.getText(source);
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(initializer);
const prospecting = { id: "prospecting", primaryHref: "/apps/prospecting", icon: "Search", enabled: true };
const marketing = { id: "marketing", primaryHref: "/apps/marketing", icon: "Megaphone", enabled: true };
const advertising = { id: "advertising", enabled: false };
for (const [apps, marketingApp, expected] of [
  [[prospecting, advertising], marketing, [prospecting, marketing, advertising]],
  [[prospecting, marketing, advertising], marketing, [prospecting, marketing, advertising]],
  [[advertising], marketing, [marketing, advertising]],
  [[prospecting, advertising], undefined, [prospecting, advertising]],
]) {
  const result = runInNewContext(`(${initializer})`, { ia: { grow: { id: "grow", apps } }, marketingApp });
  assert.equal(result.apps.length, expected.length);
  expected.forEach((app, index) => assert.equal(result.apps[index], app, "Preserve app objects and their route/icon/permission metadata"));
}
console.log("Growth fallback ordering and app metadata preservation passed");
