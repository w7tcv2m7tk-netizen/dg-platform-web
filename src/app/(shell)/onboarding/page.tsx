import {
  claimFoundingInvite,
  emptyGen2Progress,
  getFoundingOnboarding,
  getGen2OnboardingProgress,
  getOrganisationBillingStatus,
  sessionHasFeature,
} from "@dg/platform-core";

import { Gen2OnboardingWizard } from "@/components/onboarding/Gen2OnboardingWizard";
import { VipIndustryProfileSetup } from "@/components/onboarding/VipIndustryProfileSetup";
import { VipOnboardingExperience } from "@/components/onboarding/VipOnboardingExperience";
import { VipPlatformSetupPanel } from "@/components/onboarding/VipPlatformSetupPanel";
import { VipSetupIntro } from "@/components/onboarding/VipSetupIntro";
import { getPlatformPageContext } from "@/lib/org-apps";
import { getVipCustomerPreset } from "@/lib/onboarding/vip-customer-presets";

const VERIFIED_CHECKOUT_KINDS = new Set(["trial", "subscribed", "cancel_at_period_end"]);

/** Canonical Gen 2 customer setup, deliberately presented before the normal platform experience. */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; journey?: string; checkout?: string }>;
}) {
  const params = await searchParams;
  const { session } = await getPlatformPageContext();
  const invite = params.invite?.trim();

  if (session && invite) {
    await claimFoundingInvite({ customerOrganisationId: session.organisationId, inviteToken: invite });
  }

  const foundingRecord = session ? await getFoundingOnboarding(session.organisationId) : null;
  const founding = Boolean(invite) || params.journey === "founding" || Boolean(
    foundingRecord?.inviteToken || foundingRecord?.opportunityId || foundingRecord?.agreementSignedAt,
  );
  const progress = session ? await getGen2OnboardingProgress(session.organisationId) : null;

  if (!session) {
    const redirectParams = new URLSearchParams();
    if (invite) redirectParams.set("invite", invite);
    if (params.journey) redirectParams.set("journey", params.journey);
    if (params.checkout) redirectParams.set("checkout", params.checkout);
    const query = redirectParams.toString();
    const onboardingPath = query ? `/onboarding?${query}` : "/onboarding";
    const loginHref = `/login?redirect_url=${encodeURIComponent(onboardingPath)}`;
    return (
      <main className="dg-page-main mx-auto max-w-lg px-6 py-16">
        <h1 className="text-2xl font-bold text-white">Welcome to DigitalGate</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Sign in to begin your private Business Operations Platform setup with Aida.</p>
        <a href={loginHref} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500">Sign in to continue</a>
      </main>
    );
  }

  const requestedCheckoutSuccess = params.checkout === "success";
  const billing = requestedCheckoutSuccess ? await getOrganisationBillingStatus(session.organisationId).catch(() => null) : null;
  const checkoutConfirmed = Boolean(billing && billing.hasStripeCustomer && VERIFIED_CHECKOUT_KINDS.has(billing.kind));
  const checkoutPending = requestedCheckoutSuccess && !checkoutConfirmed;
  const checkoutStatus = checkoutConfirmed ? ("success" as const) : params.checkout === "cancelled" ? ("cancelled" as const) : null;

  if (checkoutPending) {
    return (
      <VipOnboardingExperience businessName={session.organisationName}>
        <div className="p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Confirming your subscription</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Aida is preparing your setup</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">Your checkout returned successfully. DigitalGate is waiting for Stripe’s verified billing update before I continue preparing your platform.</p>
          <a href="/onboarding?checkout=success" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500">Check confirmation</a>
        </div>
      </VipOnboardingExperience>
    );
  }

  const initialProgress = progress ?? emptyGen2Progress(founding);
  const vipPreset = getVipCustomerPreset(session.organisationName);
  const canImportContacts = sessionHasFeature(session, "crm.contacts.import");

  return (
    <VipOnboardingExperience
      businessName={session.organisationName}
      aidaWelcome={vipPreset?.aidaWelcome}
      setupFocus={vipPreset?.setupFocus}
    >
      {initialProgress.currentStep === "welcome" ? <VipSetupIntro /> : null}
      <Gen2OnboardingWizard
        initial={initialProgress}
        founding={founding}
        checkoutStatus={checkoutStatus}
      />
      <VipIndustryProfileSetup
        initial={initialProgress}
        recommendedTemplate={vipPreset?.industryTemplate}
      />
      <VipPlatformSetupPanel
        initial={initialProgress}
        canImportContacts={canImportContacts}
        setupFocus={vipPreset?.setupFocus}
      />
    </VipOnboardingExperience>
  );
}
