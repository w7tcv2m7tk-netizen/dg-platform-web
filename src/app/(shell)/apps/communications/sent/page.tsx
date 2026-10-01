import Link from "next/link";
import { SectionPageHeader } from "@/components/ui/SectionPageHeader";
import { notFound } from "next/navigation";
import { listOrgCommunications, sessionHasFeature } from "@dg/platform-core";

import { CommunicationsList } from "@/components/communications/CommunicationsList";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function CommunicationsSentPage() {
  const session = await getAuthorisedPlatformPageSession("communications.read");
  if (!session) notFound();

  const canSendEmail = sessionHasFeature(session, "communications.email.send");
  const rows = process.env.DATABASE_URL
    ? await listOrgCommunications({
        organisationId: session.organisationId,
        filter: "sent",
        limit: 100,
      })
    : [];

  return (
    <>
      <SectionPageHeader section="Communications" title="Sent" description="Outbound email recorded by DigitalGate, including manual and system sends." />
      <main className="dg-page-main space-y-6">
        <CommunicationsList
          rows={rows}
          empty={
            canSendEmail ? (
              <>
                No sent emails recorded yet for {session.organisationName}. Send your first email from{" "}
                <Link href="/apps/communications/compose" className="text-sky-400 hover:underline">
                  Compose
                </Link>
                .
              </>
            ) : (
              <>No sent emails recorded yet for {session.organisationName}.</>
            )
          }
        />
      </main>
    </>
  );
}
