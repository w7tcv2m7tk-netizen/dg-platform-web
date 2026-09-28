import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("packages/platform-core/src/onboarding/gen2-progress.ts", "utf8");
assert.match(source, /normalisePaidAppKeys\(settings\.profile\?\.purchasedPremium\)/);
assert.match(source, /canonicalPremiumApps/);
assert.match(source, /paidAppIdsFromKeys\(purchasedPremium\)/);
assert.match(source, /premiumApps: canonicalPremiumApps/);
console.log("onboarding Growth entitlement synchronisation checks passed");
