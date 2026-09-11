import Link from "next/link";
import { notFound } from "next/navigation";
import {
  listOrgCommunications,
  processDueScheduledEmails,
  sessionHasFeature,
} from "@dg/platform-core";

import { CommunicationsList } from "@/components/communications/CommunicationsList";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function CommunicationsScheduledPage() {
  const session = await getAuthorisedPlatformPageSession("communications.read");
  if (!session) notFound();

  const canSendEmail = sessionHasFeature(session, "communications.email.send");

  if (process.env.DATABASE_URL && canSendEmail) {
    // Preserve delivery of records that were already queued before customer scheduling was disabled.
    await processDueScheduledEmails({
      organisationId: session.organisationId,
      limit: 25,
    }).catch(() => null);
  }

  const rows = process.env.DATABASE_URL
    ? await listOrgCommunications({
        organisationId: session.organisationId,
        filter: "scheduled",
        limit: 100,
      })
    : [];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/communications" className="text-sm text-sky-400 hover:underline">
          ← Communications
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Scheduled</h1>
        <p className="mt-1 text-sm text-slate-400">
          Emails already queued for later delivery. New manual scheduling is temporarily unavailable
          while reliable due-time delivery is being completed.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <CommunicationsList
          rows={rows}
          showScheduledAt
          empty={<>No emails are currently queued for later delivery.</>}
        />
      </main>
    </>
  );
}
