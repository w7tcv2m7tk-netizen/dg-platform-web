import fs from "node:fs";
import assert from "node:assert/strict";
const journey=fs.readFileSync("src/components/onboarding/AdaptiveOnboardingJourney.tsx","utf8");
for(const industry of ["property","finance","services","accommodation-hospitality","automotive","creator-media"]) assert.match(journey,new RegExp('["]?'+industry.replace("-","\\-")+'["]?:|["]'+industry+'["]:'),industry+" goal tailoring missing");
assert.match(journey,/onboardingGoalOptions\(primaryIndustry\)/);
assert.match(journey,/goalOptions\.map/);
assert.match(journey,/Based on your operating profile/);
assert.match(journey,/recommendations, workflows and dashboard/);
assert.doesNotMatch(journey,/\{GEN2_GOAL_OPTIONS\.map\(/,"raw global goal list must not drive the Goals screen");
console.log("industry-aware onboarding goal checks passed");

