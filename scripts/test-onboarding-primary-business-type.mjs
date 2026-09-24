import fs from "node:fs";
import assert from "node:assert/strict";

const journey = fs.readFileSync("src/components/onboarding/AdaptiveOnboardingJourney.tsx","utf8");
const state = fs.readFileSync("src/app/api/v1/onboarding/gen2/state/route.ts","utf8");
const route = fs.readFileSync("src/app/api/v1/onboarding/gen2/route.ts","utf8");

assert.match(journey, /Choose your primary business type/);
assert.match(journey, /Additional business-type Apps can be added after setup for \$29\/month each/);
assert.match(journey, /const siblings=new Set\(group\?\.subIndustries\.map/);
assert.match(journey, /current\.filter\(existing=>!siblings\.has\(existing\)\)/);
assert.match(journey, /selectedGroups\.map\(group=><span/);
assert.match(journey, /templates\.map\(id=><span/);

assert.match(state, /getOrganisationCommercialOffer/);
assert.match(state, /lockedTemplates\?: string\[\]/);
assert.match(state, /new Map<string, string>\(\)\.values/);
assert.match(state, /industryTemplates: offer\.industryTemplates/);

assert.match(route, /onePrimaryTemplatePerIndustry/);
assert.match(route, /safe\.industryTemplates = onePrimaryTemplatePerIndustry/);

console.log("onboarding primary business-type checks passed");
