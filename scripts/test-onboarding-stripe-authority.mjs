import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const route = readFileSync(
  path.join(__dirname, "../src/app/api/v1/onboarding/gen2/route.ts"),
  "utf8",
);

describe("Gen 2 onboarding Stripe authority", () => {
  it("requires authoritative platform billing before completing the Stripe step", () => {
    assert.match(route, /getPlatformSubscriptionStrict\(session\.organisationId\)/);
    assert.match(route, /\["TRIALING", "ACTIVE"\]\.includes\(subscription\.status\)/);
    assert.match(route, /markGen2SubscriptionActivated\(/);
    assert.match(route, /subscription_not_confirmed/);
  });

  it("does not spread arbitrary browser progress into persisted onboarding state", () => {
    assert.doesNotMatch(route, /\.\.\.\(typeof body\.progress/);
    assert.match(route, /safeProgressPatch\(body\.progress\)/);
    assert.doesNotMatch(route, /currentStep:\s*isGen2OnboardingStep\(body\.currentStep\)/);
  });

  it("keeps subscription proof fields out of the browser progress allowlist", () => {
    const helper = route.slice(
      route.indexOf("function safeProgressPatch"),
      route.indexOf("export async function GET"),
    );
    assert.doesNotMatch(helper, /subscriptionActivatedAt/);
    assert.doesNotMatch(helper, /stripeCheckoutSessionId/);
    assert.doesNotMatch(helper, /completedSteps/);
    assert.doesNotMatch(helper, /subscription["']/);
  });
});
