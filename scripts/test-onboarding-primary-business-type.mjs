import fs from "node:fs";
import assert from "node:assert/strict";

const journey = fs.readFileSync("src/components/onboarding/AdaptiveOnboardingJourney.tsx","utf8");
const state = fs.readFileSync("src/app/api/v1/onboarding/gen2/state/route.ts","utf8");
const route = fs.readFileSync("src/app/api/v1/onboarding/gen2/route.ts","utf8");
const banner = fs.readFileSync("src/components/onboarding/Gen2OnboardingChecklistBanner.tsx","utf8");

assert.match(journey, /Choose your primary business type/);
assert.match(journey, /Additional business-type Apps can be added after setup for \$29\/month each/);
assert.match(journey, /const siblings=new Set\(group\?\.subIndustries\.map/);
assert.match(journey, /current\.filter\(existing=>!siblings\.has\(existing\)\)/);
assert.match(journey, /selectedGroups\.map\(group=><span/);
assert.match(journey, /templates\.map\(id=><span/);

assert.match(state, /getOrganisationCommercialOffer/);
assert.match(state, /lockedTemplates\?: string\[\]/);
assert.match(state, /validTemplates\.reduce/);
assert.match(state, /new Map<string, string>\(\)/);
assert.match(state, /industryTemplates: offer\.industryTemplates/);

assert.match(route, /onePrimaryTemplatePerIndustry/);
assert.match(route, /safe\.industryTemplates = onePrimaryTemplatePerIndustry/);

assert.match(journey, /Enter a valid business email address/);
assert.match(journey, /Industry choices are locked to your accepted custom offer/);
assert.match(journey, /disabled=\{Boolean\(offer\)\}/);
assert.match(banner, /Setup saved · activation remaining/);
assert.match(banner, /Continue to activation/);
assert.match(banner, /Subscription confirmed/);
assert.match(banner, /Finish setup/);

console.log("onboarding primary business-type checks passed");
