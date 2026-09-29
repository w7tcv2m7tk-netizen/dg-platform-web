import fs from "node:fs";
import assert from "node:assert/strict";

const control = fs.readFileSync("packages/platform-core/src/command-centre/operator-customer-control.ts", "utf8");
const appsApi = fs.readFileSync("src/app/api/v1/command/clients/[orgId]/apps/route.ts", "utf8");
const appsPanel = fs.readFileSync("src/components/command/CustomerAppsSubscriptionPanel.tsx", "utf8");

assert.match(control, /stripeBackedTrial/);
assert.match(control, /subscriptionStatus\?\.toLowerCase\(\) === "trialing"/);
assert.match(control, /lifecycleLabel = "Awaiting subscription"/);
assert.doesNotMatch(control, /billing\?\.kind === "trial" \|\| billing\?\.kind === "founding_trial"/);
assert.match(appsApi, /commerciallyActivated/);
assert.match(appsApi, /stripeSubscriptionId/);
assert.match(appsPanel, /Selections below are pre-checkout and are not yet purchased entitlements/);
assert.doesNotMatch(appsPanel, /\$99\/mo Growth App/);

console.log("Operator commercial entitlement truth regression passed");
