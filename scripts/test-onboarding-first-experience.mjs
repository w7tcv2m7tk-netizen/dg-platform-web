import fs from "node:fs";
import assert from "node:assert/strict";

const route = fs.readFileSync("src/app/api/v1/onboarding/gen2/route.ts", "utf8");
const journey = fs.readFileSync("src/components/onboarding/AdaptiveOnboardingJourney.tsx", "utf8");

const patchStart = route.indexOf("export async function PATCH");
const postStart = route.indexOf("export async function POST");
assert.ok(patchStart >= 0 && postStart > patchStart);
const patch = route.slice(patchStart, postStart);
const post = route.slice(postStart);
assert.doesNotMatch(patch, /rejectDemoLiveAction/, "safe onboarding progress must work in demo organisations");
assert.match(post, /rejectDemoLiveAction/, "billing/live activation must remain demo-protected");
assert.match(journey, /grid-cols-\[1fr_auto_1fr\]/, "save status row must use symmetric columns");
assert.match(journey, /col-start-2 text-center/, "save status must occupy the true centre column");
assert.match(journey, /mx-auto h-52 w-auto object-contain/, "Aida welcome artwork remains centred");
assert.match(journey, /\$\{card\} text-center/, "welcome content remains centred");

console.log("onboarding first-experience regression checks passed");

