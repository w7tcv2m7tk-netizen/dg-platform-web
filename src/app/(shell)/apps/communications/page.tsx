import Link from "next/link";
import { summarizeOrgCommunications } from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function CommunicationsOverviewPage() {
  const { session } = await getPlatformPageContext();

  if (!session?.organisationId) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Communications</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">Sign in to continue.</p>
        </main>
      </>
    );
  }

  const summary = process.env.DATABASE_URL
    ? await summarizeOrgCommunications(session.organisationId)
    : {
        total: 0,
        byChannel: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        bySource: {} as Record<string, number>,
      };

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Communications</h1>
        <p className="mt-1 text-sm text-slate-400">
          Business communication layer for {session.organisationName} — who we contacted, what was
          said, why it was sent, and what happens next.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/apps/communications/history" className="text-sky-400 hover:underline">
            History
          </Link>
          <Link href="/apps/communications/compose" className="text-sky-400 hover:underline">
            Compose
          </Link>
          <Link href="/apps/communications/mailboxes" className="text-slate-500 hover:underline">
            Mailboxes
          </Link>
        </div>

        <section className="max-w-xl space-y-2">
          <p className="text-3xl font-semibold tabular-nums text-white">{summary.total}</p>
          <p className="text-sm text-slate-400">Communication records</p>
          {summary.total > 0 ? (
            <div className="mt-4 space-y-4 text-sm text-slate-400">
              <ul className="space-y-1">
                {Object.entries(summary.byChannel).map(([k, n]) => (
                  <li key={`ch-${k}`}>
                    Channel · {k}: {n}
                  </li>
                ))}
              </ul>
              <ul className="space-y-1">
                {Object.entries(summary.byStatus).map(([k, n]) => (
                  <li key={`st-${k}`}>
                    Status · {k}: {n}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No communications yet. Compose an email, or email a contact from CRM.
            </p>
          )}
        </section>

        <p className="max-w-xl text-xs text-slate-500">
          Not a Gmail clone. Google / Microsoft remain the mailbox. DigitalGate owns the
          communication record, CRM links, and history. Growth AI Communications (voice) plugs into
          the same model over time.
        </p>
      </main>
    </>
  );
}
