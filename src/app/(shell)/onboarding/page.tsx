import {
  claimFoundingInvite,
  emptyGen2Progress,
  getFoundingOnboarding,
  getGen2OnboardingProgress,
  getOrganisationBillingStatus,
} from "@dg/platform-core";

import { AdaptiveOnboardingJourney } from "@/components/onboarding/AdaptiveOnboardingJourney";
import { OnboardingCheckoutPending } from "@/components/onboarding/OnboardingCheckoutPending";
import { FirstOrganisationOnboardingStart } from "@/components/onboarding/FirstOrganisationOnboardingStart";
import { PlatformOperatorSetup } from "@/components/onboarding/PlatformOperatorSetup";
import { VipOnboardingExperience } from "@/components/onboarding/VipOnboardingExperience";
import { getPlatformPageContext } from "@/lib/org-apps";
import { getPlatformOperatorContext } from "@/lib/platform-operator";
import { getVipCustomerPreset } from "@/lib/onboarding/vip-customer-presets";

const VERIFIED_CHECKOUT_KINDS = new Set(["trial", "subscribed", "cancel_at_period_end"]);
const PLATFORM_OPERATOR_SLUG = "digitalgate";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ invite?: string; journey?: string; checkout?: string; review?: string; operatorOrg?: string }> }) {
  const params = await searchParams;
  const { session } = await getPlatformPageContext();
  const invite = params.invite?.trim();
  if (session && invite) await claimFoundingInvite({ customerOrganisationId: session.organisationId, inviteToken: invite });
  const foundingRecord = session ? await getFoundingOnboarding(session.organisationId) : null;
  const founding = Boolean(invite) || params.journey === "founding" || Boolean(foundingRecord?.inviteToken || foundingRecord?.opportunityId || foundingRecord?.agreementSignedAt);
  const progress = session ? await getGen2OnboardingProgress(session.organisationId) : null;

  if (!session) {
    const { clerkUserId, portal } = await getPlatformPageContext();
    if (clerkUserId) {
      return <FirstOrganisationOnboardingStart initialBusinessName={portal?.org_name ?? ""} />;
    }
    const redirectParams = new URLSearchParams();
    if (invite) redirectParams.set("invite", invite);
    if (params.journey) redirectParams.set("journey", params.journey);
    if (params.checkout) redirectParams.set("checkout", params.checkout);
    if (params.review) redirectParams.set("review", params.review);
    const onboardingPath = redirectParams.toString() ? `/onboarding?${redirectParams}` : "/onboarding";
    return <main className="dg-page-main mx-auto max-w-lg px-6 py-16"><h1 className="text-2xl font-bold text-white">Welcome to DigitalGate</h1><p className="mt-3 text-sm leading-6 text-slate-400">Sign in to start your 14-day free trial and set up your Business Operating Platform with Aida.</p><a href={`/login?redirect_url=${encodeURIComponent(onboardingPath)}`} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white">Start free trial →</a></main>;
  }

  const operatorTarget = params.operatorOrg?.trim();
  if (operatorTarget) {
    const operator = await getPlatformOperatorContext();
    if (!operator) {
      return <main className="dg-page-main mx-auto max-w-2xl px-6 py-16"><h1 className="text-2xl font-bold text-white">Operator access required</h1><p className="mt-3 text-sm text-slate-400">Customer onboarding inspection is restricted to DigitalGate platform operators.</p></main>;
    }
    return <><div className="sticky top-0 z-[100] flex flex-wrap items-center justify-between gap-3 border-b border-amber-400/25 bg-amber-950/95 px-4 py-3 text-sm shadow-xl backdrop-blur"><div><span className="font-semibold text-amber-100">Operator customer view</span><span className="ml-2 text-amber-200/70">Viewing customer onboarding · billing and completion actions disabled</span></div><a href={`/command/clients/${encodeURIComponent(operatorTarget)}`} className="inline-flex min-h-9 items-center rounded-full border border-amber-300/30 bg-amber-400/10 px-4 font-semibold text-amber-100 hover:bg-amber-400/20">Exit customer view</a></div><VipOnboardingExperience businessName="Customer organisation" aidaWelcome="Operator customer view is active. You are inspecting this customer’s saved onboarding state."><AdaptiveOnboardingJourney initial={emptyGen2Progress(false)} businessName="Customer organisation" reviewMode operatorTargetOrganisationId={operatorTarget} /></VipOnboardingExperience></>;
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
  if (checkoutPending) return <VipOnboardingExperience businessName={session.organisationName}><OnboardingCheckoutPending /></VipOnboardingExperience>;

  const initialProgress = progress ?? emptyGen2Progress(founding);
  const reviewMode = params.review === "1" || params.review === "true";
  const preset = getVipCustomerPreset(session.organisationName);
  if (initialProgress.completedAt && !reviewMode) return <VipOnboardingExperience businessName={session.organisationName} aidaWelcome={`Your DigitalGate workspace for ${session.organisationName} is already configured.`} setupFocus={preset?.setupFocus}><section className="mx-auto max-w-2xl rounded-3xl border border-violet-300/15 bg-white/[0.035] p-8 text-center"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Setup complete</p><h2 className="mt-3 text-2xl font-semibold text-white">Your operating profile is saved</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/55">Reviewing setup updates configuration without resetting operational records.</p><div className="mt-6 flex justify-center gap-3"><a href="/onboarding?review=1" className="inline-flex min-h-11 items-center rounded-full bg-violet-600 px-5 text-sm font-semibold text-white">Review setup with Aida</a><a href="/dashboard" className="inline-flex min-h-11 items-center rounded-full border border-white/10 px-5 text-sm font-semibold text-white/75">Return to platform</a></div></section></VipOnboardingExperience>;

  return <VipOnboardingExperience businessName={session.organisationName} aidaWelcome={preset?.aidaWelcome} setupFocus={preset?.setupFocus}><AdaptiveOnboardingJourney initial={initialProgress} businessName={session.organisationName} aidaWelcome={preset?.aidaWelcome} setupFocus={preset?.setupFocus} recommendedTemplate={preset?.industryTemplate} checkoutStatus={checkoutStatus} founding={founding} reviewMode={reviewMode}/></VipOnboardingExperience>;
}
