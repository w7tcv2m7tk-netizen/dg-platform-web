import {
  claimFoundingInvite,
  getFoundingOnboarding,
} from "@dg/platform-core";

import { FoundingOnboardingWizard } from "@/components/founding/FoundingOnboardingWizard";
import { SelfServeOnboardingHub } from "@/components/founding/SelfServeOnboardingHub";
import { getPlatformPageContext } from "@/lib/org-apps";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; journey?: string }>;
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

  const record = session
    ? await getFoundingOnboarding(session.organisationId)
    : null;
  const founding =
    Boolean(invite) ||
    params.journey === "founding" ||
    Boolean(record?.inviteToken || record?.opportunityId || record?.agreementSignedAt);

  if (founding && session) {
    return (
      <FoundingOnboardingWizard
        initial={record}
        inviteToken={invite || record?.inviteToken}
      />
    );
  }

  return <SelfServeOnboardingHub />;
}
