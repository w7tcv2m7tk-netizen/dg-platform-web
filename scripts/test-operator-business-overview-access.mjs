import fs from "node:fs";
import assert from "node:assert/strict";

const dashboard = fs.readFileSync("src/app/(shell)/dashboard/page.tsx", "utf8");
const navigation = fs.readFileSync("packages/platform-core/src/apps/navigation.ts", "utf8");

assert.doesNotMatch(dashboard, /redirect\("\/command"\)/, "tenant dashboard must not silently redirect an operator-capable customer session to Command Centre");
assert.doesNotMatch(dashboard, /getPlatformOperatorContext/, "Business Summary landing must be tenant-context driven, not operator-context driven");
assert.match(dashboard, /BusinessOverviewDashboard/, "dashboard must continue to render Business Overview");
assert.match(navigation, /businessNavItem\(foundingCustomerMode, options\?\.showCommandCentre === true\)/, "operator navigation must keep Business Overview accessible");
assert.match(navigation, /Command Centre/, "Command Centre must remain explicitly accessible to authorised operators");

console.log("operator Business Overview access checks passed");
