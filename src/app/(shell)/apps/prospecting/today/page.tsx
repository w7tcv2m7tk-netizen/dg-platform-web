import { notFound } from "next/navigation";
import { getDailyOpportunityBriefing, listGrowthProspects } from "@dg/platform-core";

import { ProspectingTodayActions } from "@/components/prospecting/ProspectingTodayActions";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export const dynamic = "force-dynamic";

export default async function ProspectingTodayPage() {
  const session = await getAuthorisedPlatformPageSession("prospecting.prospects.read");
  if (!session) notFound();

  if (!process.env.DATABASE_URL) {
    return (
      <>
        <header className="dg-page-header"><h1 className="text-2xl font-bold text-white">Prospecting Today</h1></header>
        <main className="dg-page-main"><p className="text-sm text-amber-200">Prospecting is temporarily unavailable.</p></main>
      </>
    );
  }

  const [briefing, prospects] = await Promise.all([
    getDailyOpportunityBriefing({ organisationId: session.organisationId, limit: 30 }),
    listGrowthProspects({ organisationId: session.organisationId, limit: 200 }),
  ]);
  const prospectById = new Map(prospects.map((p) => [p.id, p]));
  const rows = briefing.rows.map((row) => {
    const prospect = prospectById.get(row.prospectId);
    return {
      ...row,
      contactName: prospect?.contactName ?? null,
      industry: prospect?.industry ?? null,
      location: prospect?.location ?? null,
    };
  });

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">Next best action</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Prospecting Today</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          One mobile workflow from qualified prospect to conversation, follow-up and customer.
        </p>
      </header>
      <main className="dg-page-main space-y-5">
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Recommended" value={briefing.recommendedCount} />
          <Metric label="Contacted today" value={briefing.contactedToday} />
          <Metric label="Conversations" value={briefing.conversations} />
          <Metric label="Meetings" value={briefing.meetingsBooked} />
        </section>

        {rows.length === 0 ? (
          <section className="rounded-xl border border-dashed border-slate-700 p-6 text-center">
            <p className="font-semibold text-white">No prospects need action yet.</p>
            <a href="/apps/prospecting/discovery" className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white">
              Discover prospects
            </a>
          </section>
        ) : (
          <ProspectingTodayActions rows={rows} />
        )}
      </main>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}
