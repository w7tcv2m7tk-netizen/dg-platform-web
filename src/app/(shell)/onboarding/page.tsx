import {
  claimFoundingInvite,
  getFoundingOnboarding,
  getGen2OnboardingProgress,
} from "@dg/platform-core";

import { Gen2OnboardingWizard } from "@/components/onboarding/Gen2OnboardingWizard";
import { getPlatformPageContext } from "@/lib/org-apps";

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

  const checkoutStatus =
    params.checkout === "success"
      ? ("success" as const)
      : params.checkout === "cancelled"
        ? ("cancelled" as const)
        : null;

  if (!session) {
    return (
      <main className="dg-page-main mx-auto max-w-lg px-6 py-16">
        <h1 className="text-2xl font-bold text-white">Sign in to continue</h1>
        <p className="mt-2 text-sm text-slate-400">
          Gen 2 onboarding runs inside your DigitalGate organisation.
        </p>
        <a
          href="/login?redirect_url=/onboarding"
          className="mt-6 inline-block rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500"
        >
          Sign in
        </a>
      </main>
    );
  }

  return (
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
  );
}
