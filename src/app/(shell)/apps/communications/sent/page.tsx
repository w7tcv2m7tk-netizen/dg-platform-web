import Link from "next/link";
import { notFound } from "next/navigation";
import { listOrgCommunications } from "@dg/platform-core";

import { CommunicationsList } from "@/components/communications/CommunicationsList";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function CommunicationsSentPage() {
  const session = await getAuthorisedPlatformPageSession("communications.read");
  if (!session) notFound();

  const rows = process.env.DATABASE_URL
    ? await listOrgCommunications({
        organisationId: session.organisationId,
        filter: "sent",
        limit: 100,
      })
    : [];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/communications" className="text-sm text-sky-400 hover:underline">
          ← Communications
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Sent</h1>
        <p className="mt-1 text-sm text-slate-400">
          Outbound email recorded by DigitalGate (Compose, invites, system sends).
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <CommunicationsList
          rows={rows}
          empty={
            <>
              No sent emails recorded yet for {session.organisationName}. Send from{" "}
              <Link href="/apps/communications/compose" className="text-sky-400 hover:underline">
                Compose
              </Link>{" "}
              or a Founding / referral invite — Gmail/Outlook sent folders sync after Mailboxes
              connect.
            </>
          }
        />
      </main>
    </>
  );
}
