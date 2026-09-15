import {
  claimFoundingInvite,
  emptyGen2Progress,
  getFoundingOnboarding,
  getGen2OnboardingProgress,
  getOrganisationBillingStatus,
} from "@dg/platform-core";

import { AdaptiveOnboardingJourney } from "@/components/onboarding/AdaptiveOnboardingJourney";
import { PlatformOperatorSetup } from "@/components/onboarding/PlatformOperatorSetup";
import { VipOnboardingExperience } from "@/components/onboarding/VipOnboardingExperience";
import { getPlatformPageContext } from "@/lib/org-apps";
import { getVipCustomerPreset } from "@/lib/onboarding/vip-customer-presets";

const VERIFIED_CHECKOUT_KINDS = new Set(["trial", "subscribed", "cancel_at_period_end"]);
const PLATFORM_OPERATOR_SLUG = "digitalgate";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ invite?: string; journey?: string; checkout?: string; review?: string }> }) {
  const params = await searchParams;
  const { session } = await getPlatformPageContext();
  const invite = params.invite?.trim();
  if (session && invite) await claimFoundingInvite({ customerOrganisationId: session.organisationId, inviteToken: invite });
  const foundingRecord = session ? await getFoundingOnboarding(session.organisationId) : null;
  const founding = Boolean(invite) || params.journey === "founding" || Boolean(foundingRecord?.inviteToken || foundingRecord?.opportunityId || foundingRecord?.agreementSignedAt);
  const progress = session ? await getGen2OnboardingProgress(session.organisationId) : null;

  if (!session) {
    const redirectParams = new URLSearchParams();
    if (invite) redirectParams.set("invite", invite);
    if (params.journey) redirectParams.set("journey", params.journey);
    if (params.checkout) redirectParams.set("checkout", params.checkout);
    if (params.review) redirectParams.set("review", params.review);
    const onboardingPath = redirectParams.toString() ? `/onboarding?${redirectParams}` : "/onboarding";
    return <main className="dg-page-main mx-auto max-w-lg px-6 py-16"><h1 className="text-2xl font-bold text-white">Welcome to DigitalGate</h1><p className="mt-3 text-sm leading-6 text-slate-400">Sign in to begin your private Business Operating Platform setup with Aida.</p><a href={`/login?redirect_url=${encodeURIComponent(onboardingPath)}`} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white">Sign in to continue</a></main>;
  }

  if (session.organisationSlug === PLATFORM_OPERATOR_SLUG) {
    return <VipOnboardingExperience businessName={session.organisationName} aidaWelcome="I’ll configure DigitalGate as the private Platform Operator rather than a customer industry workspace."><PlatformOperatorSetup businessName={session.organisationName} /></VipOnboardingExperience>;
  }

  const requestedCheckoutSuccess = params.checkout === "success";
  const billing = requestedCheckoutSuccess ? await getOrganisationBillingStatus(session.organisationId).catch(() => null) : null;
  const checkoutConfirmed = Boolean(
    billing && (billing.kind === "platform_exempt" || (billing.hasStripeCustomer && VERIFIED_CHECKOUT_KINDS.has(billing.kind))),
  );
  const checkoutPending = requestedCheckoutSuccess && !checkoutConfirmed;
  const checkoutStatus = checkoutConfirmed ? "success" as const : params.checkout === "cancelled" ? "cancelled" as const : null;
  if (checkoutPending) return <VipOnboardingExperience businessName={session.organisationName}><div className="mx-auto max-w-2xl rounded-3xl border border-violet-300/15 bg-white/[0.035] p-8 text-center"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Confirming your subscription</p><h1 className="mt-2 text-2xl font-bold text-white">Aida is preparing your setup</h1><p className="mt-3 text-sm leading-6 text-slate-300">DigitalGate is waiting for the verified billing update before continuing.</p><a href="/onboarding?checkout=success" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white">Check confirmation</a></div></VipOnboardingExperience>;

  const initialProgress = progress ?? emptyGen2Progress(founding);
  const reviewMode = params.review === "1" || params.review === "true";
  const preset = getVipCustomerPreset(session.organisationName);
  if (initialProgress.completedAt && !reviewMode) return <VipOnboardingExperience businessName={session.organisationName} aidaWelcome={`Your DigitalGate workspace for ${session.organisationName} is already configured.`} setupFocus={preset?.setupFocus}><section className="mx-auto max-w-2xl rounded-3xl border border-violet-300/15 bg-white/[0.035] p-8 text-center"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Setup complete</p><h2 className="mt-3 text-2xl font-semibold text-white">Your operating profile is saved</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/55">Reviewing setup updates configuration without resetting operational records.</p><div className="mt-6 flex justify-center gap-3"><a href="/onboarding?review=1" className="inline-flex min-h-11 items-center rounded-full bg-violet-600 px-5 text-sm font-semibold text-white">Review setup with Aida</a><a href="/dashboard" className="inline-flex min-h-11 items-center rounded-full border border-white/10 px-5 text-sm font-semibold text-white/75">Return to platform</a></div></section></VipOnboardingExperience>;

  return <VipOnboardingExperience businessName={session.organisationName} aidaWelcome={preset?.aidaWelcome} setupFocus={preset?.setupFocus}><AdaptiveOnboardingJourney initial={initialProgress} businessName={session.organisationName} aidaWelcome={preset?.aidaWelcome} setupFocus={preset?.setupFocus} recommendedTemplate={preset?.industryTemplate} checkoutStatus={checkoutStatus} founding={founding} reviewMode={reviewMode}/></VipOnboardingExperience>;
}
