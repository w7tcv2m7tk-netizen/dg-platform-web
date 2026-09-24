import fs from "node:fs";
import assert from "node:assert/strict";

const dashboard = fs.readFileSync("src/app/(shell)/dashboard/page.tsx", "utf8");
const navigation = fs.readFileSync("packages/platform-core/src/apps/navigation.ts", "utf8");

assert.match(dashboard, /requestedView !== "business"/, "operator dashboard should only redirect when explicit Business Overview was not requested");
assert.match(dashboard, /redirect\("\/command"\)/, "Command Centre must remain the operator default");
assert.match(navigation, /\/dashboard\?view=business/, "operator Business Overview must have an explicit accessible URL");
assert.match(navigation, /businessNavItem\(foundingCustomerMode, options\?\.showCommandCentre === true\)/, "operator navigation must use the explicit Business Overview route");

console.log("operator Business Overview access checks passed");
