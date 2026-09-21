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

console.log("Operator onboarding rehearsal regression checks passed");
