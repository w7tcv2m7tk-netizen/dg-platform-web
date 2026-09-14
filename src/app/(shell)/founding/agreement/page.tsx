import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  applyFoundingCommercialOfferToCustomer,
  claimFoundingInvite,
  createOrganisationForUser,
  getFoundingOnboarding,
  getOrganisationBusinessProfile,
  getOrganisationCommercialOffer,
  getPublicFoundingInvitation,
} from "@dg/platform-core";

import { FoundingAgreementForm } from "@/components/founding/FoundingAgreementForm";
import { writeActiveOrganisationId } from "@/lib/active-org-cookie";
import { getPlatformPageContext } from "@/lib/org-apps";

export default async function FoundingAgreementPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const params = await searchParams;
  const invite = params.invite?.trim();
  const context = await getPlatformPageContext();
  const { session } = context;

  if (!session) {
    const returnTo = invite
      ? `/founding/agreement?invite=${encodeURIComponent(invite)}`
      : "/founding/agreement";

    // A newly authenticated Founding invitee has an identity but no tenant yet.
    // Provisioning here is explicit: the customer followed a valid personal invite
    // into the agreement flow. Without this step, /login sees the Clerk identity
    // and redirects back here while this page sees no membership and redirects to
    // /login, producing an endless blank-page redirect loop.
    if (invite && context.clerkUserId && context.email) {
      const invitation = await getPublicFoundingInvitation(invite);
      if (invitation && !invitation.withdrawn) {
        const created = await createOrganisationForUser({
          clerkUserId: context.clerkUserId,
          email: context.email,
          name: context.name,
          orgName: invitation.businessName,
          template: "default",
        });
        await writeActiveOrganisationId(created.organisationId);
        redirect(returnTo);
      }
    }

    redirect(`/login?redirect_url=${encodeURIComponent(returnTo)}`);
  }

  if (invite) {
    const claimed = await claimFoundingInvite({
      customerOrganisationId: session.organisationId,
      inviteToken: invite,
    });
    if (claimed?.opportunity) {
      await applyFoundingCommercialOfferToCustomer({
        customerOrganisationId: session.organisationId,
        opportunityMetadata: claimed.opportunity.metadata,
      });
    }
  }

  const [record, profile, currentOffer] = await Promise.all([
    getFoundingOnboarding(session.organisationId),
    getOrganisationBusinessProfile(session.organisationId),
    getOrganisationCommercialOffer(session.organisationId),
  ]);
  const commercialOffer = record?.commercialOfferSnapshot ?? currentOffer;

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
          Founding 10
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Founding Agreement</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Confirm commercial terms before onboarding. The legal agreement stays separate from
          configuring your platform.
        </p>
      </header>
      <main className="dg-page-main">
        <Suspense fallback={<div className="dg-card max-w-2xl text-slate-400">Loading agreement…</div>}>
          <FoundingAgreementForm
            businessName={
              record?.answers.legalName ||
              profile?.businessName ||
              session.organisationName
            }
            alreadySigned={Boolean(record?.agreementSignedAt)}
            commercialOffer={commercialOffer}
          />
        </Suspense>
      </main>
    </>
  );
}
