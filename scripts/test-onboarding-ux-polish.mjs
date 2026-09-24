import fs from "node:fs";
import assert from "node:assert/strict";

const journey = fs.readFileSync("src/components/onboarding/AdaptiveOnboardingJourney.tsx","utf8");
const pending = fs.readFileSync("src/components/onboarding/OnboardingCheckoutPending.tsx","utf8");

assert.match(journey, /function displayGrowthApp/);
assert.match(journey, /if\(id==="growth_suite"\)return"Growth Suite"/);
assert.match(journey, /selectedGroups\.map\(g=>`\$\{g\.name\} Industry App`\)/);
assert.match(journey, /templates\.map\(displayTemplate\)/);
assert.match(journey, /Subscription summary/);
assert.match(journey, /priceBreakdown\.map/);
assert.match(journey, /Card details are required to start the trial/);
assert.match(journey, /Start \$\{trialDays\}-day trial/);
assert.match(journey, /setAutosaveError\(responses\.some\(response=>!response\.ok\)\)/);
assert.match(journey, /Save interrupted — your previous progress is safe/);
assert.match(journey, /Step \{currentStageIndex\+1\} of \{STAGES\.length\}/);
assert.match(journey, /We couldn’t open secure payment setup\. Your setup is saved/);

assert.match(pending, /there is no need to restart onboarding or submit payment again/);
assert.match(pending, /href="\/support"/);
assert.match(pending, /Get help/);

console.log("onboarding UX polish regression checks passed");
