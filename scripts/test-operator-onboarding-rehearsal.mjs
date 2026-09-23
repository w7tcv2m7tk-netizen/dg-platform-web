import fs from "node:fs";
import assert from "node:assert/strict";

const journey = fs.readFileSync("src/components/onboarding/AdaptiveOnboardingJourney.tsx", "utf8");

assert.match(journey, /Customer rehearsal · Not saved/);
assert.match(
  journey,
  /if\(!loaded\|\|operatorTargetOrganisationId\)return;/,
  "operator rehearsal must not autosave customer state",
);
assert.match(
  journey,
  /if\(reviewMode&&operatorTargetOrganisationId\)[\s\S]{0,500}Rehearsal only — these changes are not saved to the customer/,
  "operator step progression must be local-only",
);
assert.match(
  journey,
  /Uploads are disabled in customer rehearsal mode/,
  "operator rehearsal must block brand uploads",
);
assert.match(
  journey,
  /Connected Services skipped in rehearsal/,
  "operator rehearsal must not navigate into the operator organisation's integrations",
);
assert.match(
  journey,
  /Finish rehearsal/,
  "operator rehearsal must provide a safe return to the customer record",
);
assert.doesNotMatch(
  journey,
  /Preview Stripe checkout/,
  "operator rehearsal must never initiate Stripe checkout",
);

assert.match(journey, /min-h-\[calc\(100dvh-7rem\)\]/, "Onboarding should use the mobile viewport efficiently");
assert.match(journey, /fixed inset-x-0 bottom-0 z-40/, "Mobile onboarding navigation should remain pinned to the bottom");
assert.match(journey, /safe-area-inset-bottom/, "Mobile onboarding navigation should respect the device safe area");
assert.match(journey, /sm:static/, "Desktop onboarding navigation should remain in normal document flow");

console.log("Operator onboarding rehearsal and mobile layout regression checks passed");
