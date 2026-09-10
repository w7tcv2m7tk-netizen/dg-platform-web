import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(
  path.join(root, "src/app/api/v1/onboarding/gen2/route.ts"),
  "utf8",
);
const page = fs.readFileSync(
  path.join(root, "src/app/(shell)/onboarding/page.tsx"),
  "utf8",
);

assert.match(
  route,
  /getOrganisationBillingStatus\(session\.organisationId\)/,
  "Stripe completion must be verified against canonical organisation billing state",
);
assert.match(
  route,
  /markStepComplete === "stripe"[\s\S]*billing\.hasStripeCustomer[\s\S]*VERIFIED_CHECKOUT_KINDS\.has\(billing\.kind\)/,
  "Stripe onboarding completion must require a Stripe customer and verified billing kind",
);
assert.match(
  route,
  /code: "checkout_not_confirmed"/,
  "unconfirmed checkout must fail closed with a stable error code",
);
assert.match(
  route,
  /safeClientProgress\(body\.progress\)/,
  "browser progress must pass through an explicit allowlist",
);
assert.doesNotMatch(
  route,
  /\.\.\.safeProgress/,
  "arbitrary residual browser progress must not be persisted",
);
assert.doesNotMatch(
  route,
  /currentStep:\s*isGen2OnboardingStep\(body\.currentStep\)/,
  "browser must not directly select persisted onboarding currentStep",
);

const helper = route.slice(
  route.indexOf("function safeClientProgress"),
  route.indexOf("export async function GET"),
);
for (const protectedField of [
  "subscriptionActivatedAt",
  "stripeCheckoutSessionId",
  "completedSteps",
  "completedAt",
  "currentStep",
  "founding",
]) {
  assert.equal(
    helper.includes(protectedField),
    false,
    `${protectedField} must remain server-owned`,
  );
}
assert.equal(
  helper.includes('"subscription"'),
  false,
  "subscription checklist proof must remain server-owned",
);
assert.equal(
  helper.includes('"connect_website"'),
  false,
  "website connection checklist proof must not be fabricated by the browser",
);
assert.match(
  route,
  /markStepComplete === "stripe"[\s\S]*subscriptionActivatedAt: new Date\(\)\.toISOString\(\)/,
  "activation timestamp must be generated server-side after verification",
);

assert.match(
  page,
  /params\.checkout === "success"[\s\S]*getOrganisationBillingStatus\(session\.organisationId\)/,
  "checkout return page must verify canonical billing before surfacing success",
);
assert.match(
  page,
  /billing\?\.hasStripeCustomer && VERIFIED_CHECKOUT_KINDS\.has\(billing\.kind\)/,
  "checkout return page must require the same verified Stripe billing kinds",
);
assert.match(
  page,
  /if \(checkoutVerified\)[\s\S]*checkoutStatus = "success"[\s\S]*checkoutPending = true/,
  "unverified successful returns must enter a pending state rather than impersonating activation",
);
assert.match(
  page,
  /if \(checkoutPending\)[\s\S]*Confirming subscription[\s\S]*Check confirmation/,
  "pending Stripe confirmation must show a truthful recovery path",
);

console.log("Onboarding checkout verification regression tests passed");
