import fs from "node:fs";
import assert from "node:assert/strict";

const onboarding = fs.readFileSync("src/components/onboarding/AdaptiveOnboardingJourney.tsx", "utf8");
const pricing = fs.readFileSync("src/lib/pricing-catalog.ts", "utf8");
const plans = fs.readFileSync("src/lib/plans.ts", "utf8");

assert.match(onboarding, /PLATFORM_TIER_CATALOG/);
assert.match(onboarding, /canonical\?\.users/);
assert.match(onboarding, /canonical\?\.features/);
assert.match(onboarding, /PLATFORM_TIER_CATALOG\.find\(t=>t\.key===p\.id\)/);

assert.match(
  pricing,
  /key:\s*"professional"[\s\S]*users:\s*"5 Users"/,
  "Growth must remain capped at 5 users in canonical pricing",
);
assert.match(
  pricing,
  /key:\s*"business"[\s\S]*users:\s*"Unlimited Users"/,
  "Scale must retain the 20-user cap in canonical pricing",
);
assert.match(
  pricing,
  /key:\s*"business"[\s\S]*Industry integrations & API access/,
  "Scale must retain specialist industry/API access",
);
assert.match(
  pricing,
  /key:\s*"business"[\s\S]*Up to 5 active businesses under one subscription account/,
  "Scale must retain the 5-business entitlement",
);

assert.match(
  plans,
  /business:\s*\{\s*maxUsers:\s*null,\s*maxActiveBusinesses:\s*SCALE_MAX_BUSINESSES\s*\}/,
  "Scale must retain unlimited users while remaining capped at 5 businesses",
);

assert.doesNotMatch(
  plans,
  /extra_users|Extra Users|\+\$29\/user/,
  "Canonical tier caps must not be bypassed by a legacy extra-user add-on",
);

console.log("Onboarding canonical plan differentiator regression checks passed");
