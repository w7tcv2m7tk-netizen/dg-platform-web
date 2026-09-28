import fs from "node:fs";
import assert from "node:assert/strict";

const dashboard = fs.readFileSync("src/app/(shell)/dashboard/page.tsx", "utf8");
const navigation = fs.readFileSync("packages/platform-core/src/apps/navigation.ts", "utf8");

assert.doesNotMatch(dashboard, /redirect\("\/command"\)/, "Business Overview must remain directly accessible to an operator");
assert.match(dashboard, /getPlatformOperatorContext/, "Business Overview may identify the platform operator to suppress customer-only onboarding chrome");
assert.match(dashboard, /platformSession && !operator[\s\S]*Gen2OnboardingChecklistBanner/, "customer onboarding banner must be hidden for the platform operator");
assert.match(dashboard, /BusinessOverviewDashboard/, "dashboard must continue to render Business Overview when explicitly opened");
assert.match(navigation, /businessNavItem\(foundingCustomerMode, options\?\.showCommandCentre === true\)/, "operator navigation must keep Business Overview accessible");
assert.match(navigation, /Command Centre/, "Command Centre must remain accessible to authorised operators");

console.log("operator Business Overview access checks passed");
