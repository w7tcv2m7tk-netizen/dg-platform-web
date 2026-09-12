import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const signup = read("src/components/SignupForm.tsx");
const signupLayout = read("src/app/signup/(platform)/layout.tsx");
const planPicker = read("src/components/PlanPicker.tsx");
const onboarding = read("src/app/(shell)/onboarding/page.tsx");
const publicRoutes = read("src/lib/public-routes.ts");
const platformShellLoader = read("src/components/PlatformShellLoader.tsx");
const businessSetup = read("src/app/(shell)/dashboard/business-setup/page.tsx");

test("public signup stays outside the authenticated platform shell", () => {
  assert.match(signupLayout, /DigitalGateLogo/);
  assert.match(signupLayout, /min-h-screen/);
  assert.doesNotMatch(signupLayout, /PlatformShellLoader|AppShellLayout|Sidebar/);
});

test("public plan submission hands signed-out customers to account creation or login", () => {
  assert.match(signup, /href="\/signup\/account"/);
  assert.match(signup, /href="\/login"/);
  assert.doesNotMatch(signup, /href="\/dashboard\/business-setup"/);
  assert.match(signup, /Create account/);
  assert.match(signup, /Log in/);
});

test("signup completion actions meet the native touch-target floor", () => {
  const completion = signup.slice(signup.indexOf('if (step === "done")'));
  assert.match(completion, /href="\/signup\/account"[\s\S]{0,180}min-h-11/);
  assert.match(completion, /href="\/login"[\s\S]{0,180}min-h-11/);
});

test("public plan picker stays customer-facing and truthful about the next step", () => {
  assert.match(planPicker, /Continue to your details/);
  assert.match(planPicker, /guide you through account setup and billing/);
  assert.doesNotMatch(
    planPicker,
    /Preview-only|sidebar prefs|Stripe Checkout|create a billing customer|Paid path|Continue to checkout/i,
  );
});

test("public signup only offers launch-ready native industry groups", () => {
  assert.match(planPicker, /"property"/);
  assert.match(planPicker, /"hospitality-accommodation"/);
  assert.match(planPicker, /"services"/);
  assert.match(planPicker, /"finance"/);
  assert.match(planPicker, /SIGNUP_INDUSTRY_PLATFORMS\.map/);
  assert.doesNotMatch(planPicker, /"automotive"|"creator-media"|"health-wellness"|"professional"/);
});

test("plan picker controls meet the native touch-target floor", () => {
  assert.match(planPicker, /PLATFORM_TIERS\.map[\s\S]{0,600}min-h-11/);
  assert.match(planPicker, /SIGNUP_INDUSTRY_PLATFORMS\.map[\s\S]{0,700}min-h-11/);
  assert.match(planPicker, /PREMIUM_APPS\.map[\s\S]{0,650}min-h-11/);
  assert.match(planPicker, /ADDONS\.map[\s\S]{0,550}min-h-11/);
  assert.match(planPicker, /disabled=\{!platformTier\}[\s\S]{0,240}min-h-11/);
});

test("canonical onboarding remains native Gen 2 and organisation-aware", () => {
  assert.match(onboarding, /getPlatformPageContext/);
  assert.match(onboarding, /getGen2OnboardingProgress/);
  assert.match(onboarding, /claimFoundingInvite/);
  assert.match(onboarding, /getOrganisationBillingStatus/);
  assert.match(onboarding, /Gen2OnboardingWizard/);
  assert.doesNotMatch(onboarding, /WordPress|wp-json|DG_WP_|fetchPortalMe/i);
});

test("new-account onboarding can reach its own signed-out handoff", () => {
  assert.match(publicRoutes, /["']\/onboarding["']/);
  assert.doesNotMatch(publicRoutes, /["']\/onboarding\(\.\*\)["']/);
  assert.match(onboarding, /if \(!session\)/);
  assert.match(onboarding, /redirect_url/);
  assert.match(onboarding, /Sign in to continue/);
});

test("signed-out onboarding recovery does not render authenticated app chrome", () => {
  assert.match(platformShellLoader, /if \(!session\)\s*{[\s\S]{0,120}return <>\{children\}<\/>;/);
  assert.match(platformShellLoader, /<PlatformShell/);
});

test("onboarding sign-in and billing recovery meet the native touch-target floor", () => {
  assert.match(onboarding, /Sign in[\s\S]{0,900}min-h-11|className="[^"]*min-h-11[^"]*"[\s\S]{0,300}>\s*Sign in/);
  assert.match(onboarding, /className="[^"]*min-h-11[^"]*"[\s\S]{0,300}>\s*Check confirmation/);
});

test("Start Your Business stays customer-facing rather than exposing implementation internals", () => {
  assert.match(businessSetup, /Start Your Business/);
  assert.match(businessSetup, /ABN lookup/);
  assert.match(businessSetup, /Business Profile/);
  assert.match(businessSetup, /official registration process/);
  assert.doesNotMatch(
    businessSetup,
    /\.env(?:\.local)?|ABN_LOOKUP_GUID|ABR_GUID|ASIC_CONNECTOR_STATUS|currentBusinessSetupPhase|getAsicConnectorLifecycle|docs\/foundations|\bVercel\b|\bPhase \{/i,
  );
});

test("Start Your Business provides accessible recovery and continuation paths", () => {
  assert.match(businessSetup, /href="\/support\/help"/);
  assert.match(businessSetup, /href="\/support"/);
  assert.match(businessSetup, /href="\/dashboard\/business"/);
  assert.match(businessSetup, /min-h-11/);
});
