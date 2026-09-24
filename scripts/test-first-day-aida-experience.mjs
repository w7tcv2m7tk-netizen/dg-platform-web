import fs from "node:fs";
import assert from "node:assert/strict";

const banner = fs.readFileSync("src/components/onboarding/Gen2OnboardingChecklistBanner.tsx","utf8");
const handover = fs.readFileSync("src/components/onboarding/FirstLoginAidaHandover.tsx","utf8");

assert.match(banner, /getOrganisationGoals/);
assert.match(banner, /metricHref/);
assert.match(banner, /Move your top goal/);
assert.match(banner, /Review Business Brain/);
assert.match(banner, /href: "\/dashboard\/advisor"/);
assert.match(banner, /href: "\/dashboard\/brain"/);
assert.match(banner, /GROWTH_APP_CATALOGUE/);
assert.match(banner, /function industryName/);
assert.match(banner, /priorities=\{\[\.\.\.new Set\(priorities\)\]\.slice\(0, 4\)\}/);

assert.match(handover, /Aida · Your first day/);
assert.match(handover, /first three moves I’d make/);
assert.match(handover, /What I’ll keep an eye on/);
assert.match(handover, /Configured for you/);
assert.match(handover, /Move \{index \+ 1\}/);
assert.match(handover, /Show my Business Overview/);
assert.match(handover, /I couldn’t save that yet\. Please try again\./);
assert.match(handover, /if \(!res\.ok\)/);
assert.match(handover, /min-h-11/);

console.log("first-day Aida experience checks passed");
