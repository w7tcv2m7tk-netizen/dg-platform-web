import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  claimFoundingInvite,
  getFoundingOnboarding,
  getOrganisationBusinessProfile,
} from "@dg/platform-core";

import { FoundingAgreementForm } from "@/components/founding/FoundingAgreementForm";
import { getPlatformPageContext } from "@/lib/org-apps";

export default async function FoundingAgreementPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const params = await searchParams;
  const { session } = await getPlatformPageContext();
  if (!session) redirect("/login");

  const invite = params.invite?.trim();
  if (invite) {
    await claimFoundingInvite({
      customerOrganisationId: session.organisationId,
      inviteToken: invite,
    });
  }

  const [record, profile] = await Promise.all([
    getFoundingOnboarding(session.organisationId),
    getOrganisationBusinessProfile(session.organisationId),
  ]);

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
          />
        </Suspense>
      </main>
    </>
  );
}
