import Link from "next/link";
import { listOrgCommunications } from "@dg/platform-core";

import { CommunicationsList } from "@/components/communications/CommunicationsList";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function CommunicationsSentPage() {
  const { session } = await getPlatformPageContext();

  if (!session?.organisationId) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Sent</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">Sign in to continue.</p>
        </main>
      </>
    );
  }

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
