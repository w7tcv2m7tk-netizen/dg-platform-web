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
import { VipOnboardingPager } from "@/components/onboarding/VipOnboardingPager";
import { VipPlatformSetupPanel } from "@/components/onboarding/VipPlatformSetupPanel";
import { getPlatformPageContext } from "@/lib/org-apps";
import { getVipCustomerPreset } from "@/lib/onboarding/vip-customer-presets";

const VERIFIED_CHECKOUT_KINDS = new Set(["trial", "subscribed", "cancel_at_period_end"]);

/** Canonical Gen 2 customer setup, deliberately presented before the normal platform experience. */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; journey?: string; checkout?: string; review?: string }>;
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
    if (params.review) redirectParams.set("review", params.review);
    const query = redirectParams.toString();
    const onboardingPath = query ? `/onboarding?${query}` : "/onboarding";
    const loginHref = `/login?redirect_url=${encodeURIComponent(onboardingPath)}`;
    return (
      <main className="dg-page-main mx-auto max-w-lg px-6 py-16">
        <h1 className="text-2xl font-bold text-white">Welcome to DigitalGate</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Sign in to begin your private Business Operations Platform setup with Aida.</p>
        <a href={loginHref} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500">Sign in to continue</a>
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
        <div className="mx-auto max-w-2xl rounded-3xl border border-violet-300/15 bg-white/[0.035] p-6 text-center sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Confirming your subscription</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Aida is preparing your setup</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">Your checkout returned successfully. DigitalGate is waiting for Stripe’s verified billing update before I continue preparing your platform.</p>
          <a href="/onboarding?checkout=success" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500">Check confirmation</a>
        </div>
      </VipOnboardingExperience>
    );
  }

  const initialProgress = progress ?? emptyGen2Progress(founding);
  const reviewMode = params.review === "1" || params.review === "true";
  const journeyProgress = reviewMode
    ? {
        ...initialProgress,
        currentStep: "welcome" as const,
        vipSetup: {
          ...initialProgress.vipSetup,
          version: 1 as const,
          rerunRequestedAt: new Date().toISOString(),
          appearance: initialProgress.vipSetup?.appearance ?? "system",
          timezone: initialProgress.vipSetup?.timezone ?? "Australia/Brisbane",
          locale: initialProgress.vipSetup?.locale ?? "en-AU",
          currency: initialProgress.vipSetup?.currency ?? "AUD",
        },
      }
    : initialProgress;
  const vipPreset = getVipCustomerPreset(session.organisationName);
  const canImportContacts = sessionHasFeature(session, "crm.contacts.import");

  if (initialProgress.completedAt && !reviewMode) {
    return (
      <VipOnboardingExperience
        businessName={session.organisationName}
        aidaWelcome={`Your DigitalGate workspace for ${session.organisationName} is already configured. You can review the setup at any time without deleting your operational data.`}
        setupFocus={vipPreset?.setupFocus}
      >
        <section className="mx-auto max-w-2xl rounded-3xl border border-violet-300/15 bg-white/[0.035] p-6 text-center shadow-2xl shadow-black/20 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Setup complete</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Review or refresh this organisation</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/55">
            Re-running setup updates this organisation&apos;s identity, business profile, Apps, operating profile, brand and Business Brain preferences. CRM records, bookings, contacts, documents and transactions are not reset.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href="/onboarding?review=1" className="inline-flex min-h-11 items-center rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500">
              Review setup with Aida
            </a>
            <a href="/" className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/75 hover:bg-white/[0.08]">
              Return to platform
            </a>
          </div>
        </section>
      </VipOnboardingExperience>
    );
  }

  return (
    <VipOnboardingExperience
      businessName={session.organisationName}
      aidaWelcome={vipPreset?.aidaWelcome}
      setupFocus={vipPreset?.setupFocus}
    >
      <VipOnboardingPager
        setup={
          <Gen2OnboardingWizard
            initial={journeyProgress}
            founding={founding}
            checkoutStatus={checkoutStatus}
          />
        }
        operatingProfile={
          <VipIndustryProfileSetup
            initial={journeyProgress}
            recommendedTemplate={vipPreset?.industryTemplate}
          />
        }
        platformPreparation={
          <VipPlatformSetupPanel
            initial={journeyProgress}
            canImportContacts={canImportContacts}
            setupFocus={vipPreset?.setupFocus}
          />
        }
      />
    </VipOnboardingExperience>
  );
}
