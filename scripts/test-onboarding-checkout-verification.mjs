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
const wizard = fs.readFileSync(
  path.join(root, "src/components/onboarding/Gen2OnboardingWizard.tsx"),
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
  /requestedCheckoutSuccess[\s\S]*getOrganisationBillingStatus\(session\.organisationId\)/,
  "checkout return UX must verify canonical billing state server-side",
);
assert.match(
  page,
  /checkoutConfirmed[\s\S]*billing\.hasStripeCustomer[\s\S]*VERIFIED_CHECKOUT_KINDS\.has\(billing\.kind\)/,
  "success UX must require a Stripe customer and verified billing kind",
);
assert.match(
  page,
  /checkoutStatus = checkoutConfirmed[\s\S]*\("success" as const\)/,
  "the wizard must only receive checkout success after server verification",
);
assert.match(
  page,
  /Confirming your subscription/,
  "unconfirmed Stripe returns must show a truthful pending state",
);

const checkoutFinalisation = wizard.slice(
  wizard.indexOf('if (checkoutStatus !== "success") return;'),
  wizard.indexOf("const save = useCallback"),
);
assert.match(
  checkoutFinalisation,
  /JSON\.stringify\(\{ markStepComplete: "stripe" \}\)/,
  "checkout finalisation must send only the server-owned Stripe completion request",
);
assert.doesNotMatch(
  checkoutFinalisation,
  /subscriptionActivatedAt|checklist:\s*\{\s*subscription/,
  "checkout finalisation must not submit browser-authored Stripe proof",
);
assert.match(
  checkoutFinalisation,
  /if \(!res\.ok \|\| !json\.data\?\.progress\)[\s\S]*setError\(/,
  "failed checkout finalisation must surface a customer-visible error",
);
assert.match(
  checkoutFinalisation,
  /catch[\s\S]*setError\(/,
  "network failure during checkout finalisation must surface a customer-visible error",
);

const implementationHandoff = wizard.slice(
  wizard.indexOf("async function completeImplementation"),
  wizard.indexOf("function toggleApp"),
);
assert.match(
  implementationHandoff,
  /const saved = await save\(/,
  "implementation handoff must retain the server save result",
);
assert.match(
  implementationHandoff,
  /if \(!saved\) return;[\s\S]*router\.push\("\/implementation"\)/,
  "implementation navigation must only occur after onboarding completion persists",
);

console.log("Onboarding checkout and implementation handoff regression tests passed");
