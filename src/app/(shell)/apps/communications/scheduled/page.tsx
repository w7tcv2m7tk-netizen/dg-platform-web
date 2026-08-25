import Link from "next/link";
import { listOrgCommunications, processDueScheduledEmails } from "@dg/platform-core";

import { CommunicationsList } from "@/components/communications/CommunicationsList";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function CommunicationsScheduledPage() {
  const { session } = await getPlatformPageContext();

  if (!session?.organisationId) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Scheduled</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">Sign in to continue.</p>
        </main>
      </>
    );
  }

  if (process.env.DATABASE_URL) {
    // Hobby cron is daily — flush this org's due rows when the page is opened.
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
          Timed sends waiting to go out. Due items flush when you open this page (and via the daily
          cron).
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <CommunicationsList
          rows={rows}
          showScheduledAt
          empty={
            <>
              Nothing scheduled. Use{" "}
              <Link href="/apps/communications/compose" className="text-sky-400 hover:underline">
                Compose
              </Link>{" "}
              → Send later to queue an email.
            </>
          }
        />
      </main>
    </>
  );
}
