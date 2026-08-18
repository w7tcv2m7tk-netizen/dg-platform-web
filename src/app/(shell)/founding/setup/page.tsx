import { redirect } from "next/navigation";
import { claimFoundingInvite, getFoundingOnboarding } from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/org-apps";

export default async function FoundingSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const params = await searchParams;
  const { session } = await getPlatformPageContext();
  const invite = params.invite?.trim();
  if (!session) {
    const next = invite
      ? `/founding/setup?invite=${encodeURIComponent(invite)}`
      : "/founding/setup";
    redirect(`/login?redirect_url=${encodeURIComponent(next)}`);
  }

  if (invite) {
    await claimFoundingInvite({
      customerOrganisationId: session.organisationId,
      inviteToken: invite,
    });
  }

  const record = await getFoundingOnboarding(session.organisationId);
  const q = invite ? `?invite=${encodeURIComponent(invite)}` : "";
  if (!record?.agreementSignedAt) {
    redirect(`/founding/agreement${q}`);
  }
  redirect(`/onboarding${q}`);
}
