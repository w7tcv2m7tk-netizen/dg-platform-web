import Link from "next/link";
import { notFound } from "next/navigation";
import { getDailyOpportunityBriefing, getGrowthEngineSummary, listGrowthProspects } from "@dg/platform-core";

import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export const dynamic = "force-dynamic";

function stageCount(byStage: Record<string, number>, stages: string[]) {
  return stages.reduce((sum, stage) => sum + (byStage[stage] ?? 0), 0);
}

export default async function ProspectingOverviewPage() {
  const session = await getAuthorisedPlatformPageSession("prospecting.prospects.read");
  if (!session) notFound();

  let summary: Awaited<ReturnType<typeof getGrowthEngineSummary>> | null = null;
  let briefing: Awaited<ReturnType<typeof getDailyOpportunityBriefing>> | null = null;
  let prospects: Awaited<ReturnType<typeof listGrowthProspects>> = [];
  let loadError: string | null = null;

  if (process.env.DATABASE_URL) {
    const [summaryResult, briefingResult, prospectsResult] = await Promise.allSettled([
      getGrowthEngineSummary(session.organisationId),
      getDailyOpportunityBriefing({ organisationId: session.organisationId, limit: 30 }),
      listGrowthProspects({ organisationId: session.organisationId, limit: 200 }),
    ]);
    if (summaryResult.status === "fulfilled") summary = summaryResult.value;
    if (briefingResult.status === "fulfilled") briefing = briefingResult.value;
    if (prospectsResult.status === "fulfilled") prospects = prospectsResult.value;
    if ([summaryResult, briefingResult, prospectsResult].some((r) => r.status === "rejected")) {
      loadError = "Some prospecting signals could not be loaded right now.";
    }
  } else {
    loadError = "Prospecting data is temporarily unavailable.";
  }

  const byStage = summary?.byStage ?? {};
  const qualified = stageCount(byStage, ["email_opened", "report_viewed", "follow_up_due", "meeting_booked", "proposal_sent"]);
  const converted = byStage.won ?? 0;
  const activeOpportunities = Math.max(0, (summary?.totalProspects ?? 0) - converted - (byStage.lost ?? 0));
  const researching = prospects.filter((p) => p.stage === "prospect").length;
  const followUps = byStage.follow_up_due ?? 0;
  const consultations = byStage.meeting_booked ?? 0;
  const ready = briefing?.recommendedCount ?? 0;
  const next = briefing?.rows?.[0] ?? null;

  return (
    <>
      <header className="dg-page-header">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/80">Growth Engine™</p>
        <h1 className="dg-page-title mt-1 text-white">Prospecting</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400 sm:text-base">Know who to work on next, why they matter and the action that moves them forward.</p>
      </header>

      <main className="dg-page-main space-y-6">
        {loadError ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <p>{loadError} DigitalGate has kept unavailable signals out of the workspace rather than estimating them.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/apps/prospecting" className="inline-flex min-h-11 items-center rounded-lg bg-amber-200 px-4 font-semibold text-slate-950">Try again</Link>
              <Link href="/dashboard/advisor" className="inline-flex min-h-11 items-center rounded-lg border border-amber-200/30 px-4 font-semibold text-amber-50">Get help</Link>
            </div>
          </div>
        ) : null}

        <section className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/[0.10] via-slate-950/70 to-slate-950/50 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Next best action</p>
              {next ? (
                <>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{next.businessName}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300">{next.recommendedActionLabel}. {next.approachHint}</p>
                  <p className="mt-2 text-xs text-slate-500">Opportunity Score™ {next.score} · {next.bandLabel}</p>
                </>
              ) : (
                <>
                  <h2 className="mt-2 text-xl font-semibold text-white">Build today’s prospect queue</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-400">There is no recommended prospect yet. Discover businesses and DigitalGate will research, qualify and prioritise the strongest opportunities.</p>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={next ? "/apps/prospecting/today" : "/apps/prospecting/discovery"} className="inline-flex min-h-11 items-center rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500">{next ? "Work next →" : "Discover prospects →"}</Link>
              <Link href="/apps/prospecting/today" className="inline-flex min-h-11 items-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 hover:border-violet-500/50">Work today</Link>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QueueCard label="Ready to contact" value={ready} href="/apps/prospecting/today" detail="Prioritised next actions" />
          <QueueCard label="Follow-ups due" value={followUps} href="/apps/prospecting/activity" detail="Calls, emails and tasks" />
          <QueueCard label="Researching" value={researching} href="/apps/prospecting/prospects" detail="Prospects being qualified" />
          <QueueCard label="Consultations" value={consultations} href="/apps/prospecting/pipeline" detail="Meetings in pipeline" />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/45 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pipeline health</p>
              <h2 className="mt-1 text-lg font-semibold text-white">From discovery to customer</h2>
            </div>
            <Link href="/apps/prospecting/pipeline" className="text-sm font-medium text-violet-300 hover:text-violet-200">Open pipeline →</Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Metric label="Prospects" value={summary?.totalProspects ?? 0} />
            <Metric label="Engaged · 7d" value={summary?.engagementsThisWeek ?? 0} />
            <Metric label="Qualified" value={qualified} />
            <Metric label="Opportunities" value={activeOpportunities} />
            <Metric label="Meetings" value={consultations} />
            <Metric label="Converted" value={converted} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <ActionCard eyebrow="Discover" title="Find the right businesses" body="Search by location, industry and business signals, then add worthwhile businesses to the prospect book." href="/apps/prospecting/discovery" action="Discover businesses" />
          <ActionCard eyebrow="Qualify" title="Research and score" body="Review evidence, AI research and Opportunity Score™ before spending time on outreach." href="/apps/prospecting/prospects" action="Open prospects" />
          <ActionCard eyebrow="Progress" title="Move the relationship forward" body="Prepare contact, record outcomes, follow up and progress qualified relationships towards consultation and conversion." href="/apps/prospecting/today" action="Work today" />
        </section>
      </main>
    </>
  );
}

function QueueCard({ label, value, href, detail }: { label: string; value: number; href: string; detail: string }) {
  return <Link href={href} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4 transition hover:border-violet-500/40 hover:bg-slate-900/60"><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums text-white">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></Link>;
}
function Metric({ label, value }: { label: string; value: number }) {
  return <div><p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums text-white">{value}</p></div>;
}
function ActionCard({ eyebrow, title, body, href, action }: { eyebrow: string; title: string; body: string; href: string; action: string }) {
  return <Link href={href} className="rounded-2xl border border-slate-800 bg-slate-950/35 p-5 transition hover:border-violet-500/35"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">{eyebrow}</p><h3 className="mt-2 font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{body}</p><p className="mt-4 text-sm font-medium text-violet-300">{action} →</p></Link>;
}
