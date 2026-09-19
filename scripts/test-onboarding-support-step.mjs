import fs from "node:fs";

const journey = fs.readFileSync("packages/platform-core/src/onboarding/gen2-journey.ts", "utf8");
const wizard = fs.readFileSync("src/components/onboarding/AdaptiveOnboardingJourney.tsx", "utf8");
const api = fs.readFileSync("src/app/api/v1/onboarding/gen2/route.ts", "utf8");

function expect(value, message) {
  if (!value) throw new Error(message);
}

expect(journey.includes('"apps", "support", "platform_preparation"'), "Support must follow Apps in the canonical journey");
expect(journey.includes('support: "Support"'), "Support must have a canonical step label");
expect(journey.includes('supportPlan?: Gen2SupportPlan'), "Support selection must persist in Gen2 progress");
expect(wizard.includes('id:"support", label:"Support", step:"support"'), "Adaptive onboarding must expose the Support stage");
expect(wizard.includes('go("support")'), "Apps must advance to Support");
expect(wizard.includes('mark("support"'), "Support must be completable");
expect(api.includes('clientProgress.supportPlan'), "API must accept the safe support plan field");
expect(api.includes('"self_managed", "guided", "managed", "custom"'), "API must whitelist canonical support plan IDs");

console.log("Onboarding Support step regression checks passed.");
