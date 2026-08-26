import Link from "next/link";
import {
  GROWTH_ENGINE_STAGE_LABELS,
  getDailyOpportunityBriefing,
  getGrowthEngineSummary,
} from "@dg/platform-core";

import {
  ConvertProspectToOrgButton,
  CreateProposalQuoteButton,
  RunProspectAuditButton,
} from "@/components/command/GrowthEngineActions";
import { CommandHonestyBanner } from "@/components/command/CommandHonestyBanner";
import {
  GrowthEngineModuleGrid,
} from "@/components/command/GrowthEngineNav";
import { getPlatformPageContext } from "@/lib/platform-page-context";

function formatAudCents(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function GrowthEngineHubPage() {
  const db = Boolean(process.env.DATABASE_URL);
  const { session } = await getPlatformPageContext();
  let summary: Awaited<ReturnType<typeof getGrowthEngineSummary>> | null = null;
  let briefing: Awaited<ReturnType<typeof getDailyOpportunityBriefing>> | null = null;
  if (db && session?.organisationId) {
    try {
      [summary, briefing] = await Promise.all([
        getGrowthEngineSummary(session.organisationId),
        getDailyOpportunityBriefing({
          organisationId: session.organisationId,
          limit: 20,
          staffName: "Ben",
        }),
      ]);
    } catch {
      summary = null;
      briefing = null;
    }
  }

  const top = briefing?.top ?? null;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Prospecting</h1>
        <p className="text-sm text-slate-400">
          Discover → audit → report → pipeline → client · feeds Opportunity Engine™
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-4 py-4 text-sm text-sky-50">
          <p className="font-medium text-white">Closed beta — what pilots get</p>
          <p className="mt-1 text-sky-100/90">
            Daily Briefing ranks who to speak to today from real pipeline + audit signals. Playbook:{" "}
            <code className="text-sky-200">docs/COMMAND-CENTRE-BETA.md</code>.
          </p>
        </div>
        <CommandHonestyBanner compact />

        {briefing ? (
          <section className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-sky-400">
                Prospect ranks · Daily Briefing
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">{briefing.greeting}</h2>
              <p className="mt-1 text-sm text-slate-200">{briefing.headline}</p>
              <p className="mt-1 text-sm text-slate-500">{briefing.subhead}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <BriefStat label="Recommended" value={briefing.recommendedCount} />
              <BriefStat label="Contacted today" value={briefing.contactedToday} />
              <BriefStat label="Conversations" value={briefing.conversations} />
              <BriefStat label="Meetings booked" value={briefing.meetingsBooked} />
            </div>
            <p className="text-sm text-slate-400">
              {briefing.stillRequireAction} prospect
              {briefing.stillRequireAction === 1 ? "" : "s"} still require action
              {briefing.proposalPipelineCents != null
                ? ` · Open proposals ${formatAudCents(briefing.proposalPipelineCents)}`
                : " · Proposal $ only shown when real quotes exist"}
            </p>
          </section>
        ) : null}

        {summary ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Prospects</p>
              <p className="mt-1 text-3xl font-bold text-white">{summary.totalProspects}</p>
            </div>
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Engagements (7d)</p>
              <p className="mt-1 text-3xl font-bold text-white">{summary.engagementsThisWeek}</p>
            </div>
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">In pipeline</p>
              <p className="mt-1 text-3xl font-bold text-white">
                {summary.totalProspects -
                  (summary.byStage.won ?? 0) -
                  (summary.byStage.lost ?? 0)}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4">
            <p className="text-amber-200">
              Set DATABASE_URL and run npm run db:push to enable Growth Engine.
            </p>
          </div>
        )}

        {top ? (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-5 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-200/90">
              Priority #1
            </p>
            <h2 className="text-lg font-semibold text-white">
              {top.businessName}{" "}
              <span className="text-slate-400 font-normal">
                · Opportunity Score {top.score}/100 ({top.bandLabel})
              </span>
            </h2>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Why contact them</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                {top.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-amber-100/90">
              <span className="font-medium text-white">Recommended: </span>
              {top.recommendedActionLabel}. {top.approachHint}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              {!top.hasAudit ? (
                <RunProspectAuditButton prospectId={top.prospectId} label="Run audit" />
              ) : (
                <Link
                  href="/command/growth-engine/audits"
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-sky-300 hover:bg-slate-700"
                >
                  View audits
                </Link>
              )}
              <Link
                href="/command/growth-engine/reports"
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-sky-300 hover:bg-slate-700"
              >
                Reports
              </Link>
              <CreateProposalQuoteButton prospectId={top.prospectId} label="Propose" />
              {(top.stage === "proposal_sent" ||
                top.stage === "report_viewed" ||
                top.stage === "meeting_booked") && (
                <ConvertProspectToOrgButton prospectId={top.prospectId} label="Convert" />
              )}
              <Link
                href="/command/growth-engine/pipeline"
                className="text-sm text-sky-400 hover:underline self-center"
              >
                Pipeline →
              </Link>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Daily recommended
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">Who to speak to today</h2>
              <p className="mt-1 text-sm text-slate-400">
                Ranked by Prospect Opportunity Score from audits, engagement, and fit — not an
                autonomous AI SDR. No invented MRR.
              </p>
            </div>
            <Link
              href="/command/growth-engine/follow-ups"
              className="text-xs text-sky-400 hover:underline"
            >
              Full follow-up queue →
            </Link>
          </div>
          {!db ? (
            <p className="mt-4 text-sm text-slate-500">Database required.</p>
          ) : !briefing || briefing.rows.length === 0 ? (
            <p className="mt-4 text-sm text-emerald-200/90">
              No recommended prospects — use Discovery to find businesses, then audit.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Rank</th>
                    <th className="px-3 py-2">Business</th>
                    <th className="px-3 py-2">Opportunity</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {briefing.rows.map((row) => (
                    <tr key={row.prospectId} className="border-t border-slate-800/80">
                      <td className="px-3 py-2 text-slate-500">{row.rank}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-white">{row.businessName}</p>
                        <p className="text-xs text-slate-500">
                          {GROWTH_ENGINE_STAGE_LABELS[row.stage] ?? row.stage}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-slate-300">{row.bandLabel}</td>
                      <td className="px-3 py-2 text-white">{row.score}</td>
                      <td className="px-3 py-2 text-amber-100/90">
                        {row.recommendedActionLabel}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {!row.hasAudit ? (
                            <RunProspectAuditButton
                              prospectId={row.prospectId}
                              label="Audit"
                            />
                          ) : null}
                          <CreateProposalQuoteButton
                            prospectId={row.prospectId}
                            label="Propose"
                          />
                          <Link
                            href="/command/growth-engine/pipeline"
                            className="text-xs text-sky-400 hover:underline self-center"
                          >
                            Pipeline
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="text-sm text-slate-400">
          Start with Discovery → run a presence Audit → Opportunity Report → Pipeline.
        </p>

        <GrowthEngineModuleGrid />
      </main>
    </>
  );
}

function BriefStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
