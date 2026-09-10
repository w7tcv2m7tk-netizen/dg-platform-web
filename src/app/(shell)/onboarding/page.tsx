import {
  claimFoundingInvite,
  getFoundingOnboarding,
  getGen2OnboardingProgress,
  getOrganisationBillingStatus,
} from "@dg/platform-core";

import { Gen2OnboardingWizard } from "@/components/onboarding/Gen2OnboardingWizard";
import { getPlatformPageContext } from "@/lib/org-apps";

const VERIFIED_CHECKOUT_KINDS = new Set(["trial", "subscribed", "cancel_at_period_end"]);

/**
 * Canonical Gen 2 customer onboarding.
 * Founding 10 (post-agreement) and self-serve both use the same progressive journey.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{
    invite?: string;
    journey?: string;
    checkout?: string;
  }>;
}) {
  const params = await searchParams;
  const { session } = await getPlatformPageContext();
  const invite = params.invite?.trim();

  if (session && invite) {
    await claimFoundingInvite({
      customerOrganisationId: session.organisationId,
      inviteToken: invite,
    });
  }

  const foundingRecord = session
    ? await getFoundingOnboarding(session.organisationId)
    : null;
  const founding =
    Boolean(invite) ||
    params.journey === "founding" ||
    Boolean(
      foundingRecord?.inviteToken ||
        foundingRecord?.opportunityId ||
        foundingRecord?.agreementSignedAt,
    );

  const progress = session
    ? await getGen2OnboardingProgress(session.organisationId)
    : null;

  const requestedCheckoutSuccess = params.checkout === "success";
  const billing =
    session && requestedCheckoutSuccess
      ? await getOrganisationBillingStatus(session.organisationId)
      : null;
  const checkoutConfirmed = Boolean(
    billing &&
      billing.hasStripeCustomer &&
      VERIFIED_CHECKOUT_KINDS.has(billing.kind),
  );
  const checkoutPending = Boolean(session && requestedCheckoutSuccess && !checkoutConfirmed);
  const checkoutStatus = checkoutConfirmed
    ? ("success" as const)
    : params.checkout === "cancelled"
      ? ("cancelled" as const)
      : null;

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
        <h1 className="text-2xl font-bold text-white">Sign in to continue</h1>
        <p className="mt-2 text-sm text-slate-400">
          Gen 2 onboarding runs inside your DigitalGate organisation.
        </p>
        <a
          href={loginHref}
          className="mt-6 inline-block rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500"
        >
          Sign in
        </a>
      </main>
    );
  }

  return (
    <>
      {checkoutPending ? (
        <div className="dg-page-main mx-auto max-w-2xl px-4 pt-4 sm:px-6">
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            <p className="font-medium">Confirming your subscription…</p>
            <p className="mt-1 text-sky-200/90">
              Stripe returned successfully, but DigitalGate is still waiting for the verified billing update. Refresh this page in a moment; onboarding will only advance once the subscription is confirmed.
            </p>
            <a href="/onboarding?checkout=success" className="mt-2 inline-block font-medium text-sky-100 underline underline-offset-2">
              Refresh confirmation
            </a>
          </div>
        </div>
      ) : null}
      <Gen2OnboardingWizard
        initial={{
          ...(progress ?? {
            version: 1 as const,
            currentStep: "welcome" as const,
            completedSteps: [],
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            platformTier: "professional" as const,
            billingCadence: "monthly" as const,
            industryApps: [],
            premiumApps: [],
            checklist: {},
          }),
          founding: founding || progress?.founding,
        }}
        founding={founding}
        checkoutStatus={checkoutStatus}
      />
    </>
  );
}
