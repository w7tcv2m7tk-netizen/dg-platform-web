import assert from "node:assert/strict";
import fs from "node:fs";

const apps = fs.readFileSync("src/app/api/v1/org/apps/route.ts", "utf8");
const templates = fs.readFileSync("src/app/api/v1/org/industry/templates/route.ts", "utf8");
const authority = fs.readFileSync("packages/platform-core/src/industry/purchase-authority.ts", "utf8");
const apiGuard = fs.readFileSync("src/lib/platform-api.ts", "utf8");
const pageGuard = fs.readFileSync("src/components/industry/IndustryBetaAppLayout.tsx", "utf8");

assert.match(apps, /authorisedIndustryPurchaseIds\(canonicalSubscription, session\.organisationId\)/);
assert.match(apps, /authorisedPremiumPurchaseKeys\(canonicalSubscription, session\.organisationId\)/);
assert.doesNotMatch(apps, /settings\.profile\?\.purchased(?:Apps|Premium)/);
assert.match(apps, /industry_app_purchase_required/);
assert.match(apps, /paid_app_purchase_required/);
assert.match(apps, /body\.action === "apply_plan"/);
assert.match(apps, /body\.action === "toggle"/);
assert.match(apps, /body\.action === "set"/);

assert.match(templates, /verifiedPurchasedApps: canonicalIndustryApps/);
assert.match(templates, /industry_app_purchase_required/);
assert.match(templates, /!staffOrOperator/);
assert.doesNotMatch(templates, /verifiedPurchasedApps: settings\.profile/);
assert.match(authority, /authority\.organisationId !== organisationId/);
assert.match(authority, /trialEnd && authority\.trialEnd > now/);
assert.match(authority, /currentPeriodEnd && authority\.currentPeriodEnd > now/);
assert.match(apiGuard, /industryAppAccessDecision\(\{ authority: subscription, organisationId: session\.organisationId, appId/);
assert.match(apiGuard, /industry_app_purchase_required/);
assert.match(apiGuard, /industry_entitlement_unavailable/);
assert.match(pageGuard, /industryAppAccessDecision\(\{/);
assert.match(pageGuard, /if \(accessDecision === "allowed"\)/);

console.log("Industry purchase activation uses canonical subscription authority");
