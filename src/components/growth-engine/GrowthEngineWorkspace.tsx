import Link from "next/link";
import type { DailyOpportunityBriefing, DailyOpportunityRow } from "@dg/platform-core";

import {
  ConvertProspectToOrgButton,
  CreateProposalQuoteButton,
  RunProspectAuditButton,
} from "@/components/command/GrowthEngineActions";
import {
  GrowthEngineCapabilityGrid,
  type GrowthCapabilityGroup,
} from "@/components/growth-engine/GrowthEngineCapabilityGrid";
import { GrowthEngineBetaStatus } from "@/components/growth-engine/GrowthEngineBetaStatus";

const GROWTH_LOOP = [
  "Discover",
  "Understand",
  "Score",
  "Engage",
  "Pipeline",
  "Convert",
] as const;

export type GrowthEngineSummaryLite = {
  totalProspects: number;
  engagementsThisWeek: number;
  byStage: Record<string, number>;
};

export type GrowthEngineWorkspaceProps = {
  /** Sales (tenant product) or Command Centre (DigitalGate GTM). */
  variant: "sales" | "command";
  briefing: DailyOpportunityBriefing | null;
  summary: GrowthEngineSummaryLite | null;
  /** Show collapsible beta honesty block (Command / operator). */
  showBetaStatus?: boolean;
  capabilityGroups: GrowthCapabilityGroup[];
  pipelineHref: string;
  discoveryHref: string;
  followUpsHref: string;
  auditsHref: string;
  reportsHref: string;
  /** Enable mutate actions (audit / propose / convert) — Command GTM. */
  enableActions?: boolean;
};

function formatAudCents(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function stageCount(byStage: Record<string, number>, stages: string[]) {
  return stages.reduce((sum, s) => sum + (byStage[s] ?? 0), 0);
}

function bandAccent(band: string) {
  if (band === "very_high" || band === "high") return "border-amber-500/35 bg-amber-500/5";
  if (band === "medium") return "border-sky-500/30 bg-sky-500/5";
  return "border-slate-700/80 bg-slate-950/50";
}

export function GrowthEngineWorkspace({
  variant,
  briefing,
  summary,
  showBetaStatus = false,
  capabilityGroups,
  pipelineHref,
  discoveryHref,
  followUpsHref,
  auditsHref,
  reportsHref,
  enableActions = false,
}: GrowthEngineWorkspaceProps) {
  const byStage = summary?.byStage ?? {};
  const qualified = stageCount(byStage, [
    "email_opened",
    "report_viewed",
    "follow_up_due",
    "meeting_booked",
    "proposal_sent",
  ]);
  const opportunities =
    (summary?.totalProspects ?? 0) - (byStage.won ?? 0) - (byStage.lost ?? 0);
  const meetings = byStage.meeting_booked ?? 0;
  const converted = byStage.won ?? 0;

  const spotlight = briefing?.rows.slice(0, 3) ?? [];

  return (
    <>
      <header className="dg-page-header">
        {variant === "sales" ? (
          <p className="text-sm text-sky-400">← Sales</p>
        ) : (
          <Link href="/command" className="text-sm text-sky-400 hover:underline">
            ← Command Centre
          </Link>
        )}
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Growth Engine™</h1>
        <p className="mt-3 max-w-2xl text-base text-slate-200">
          Turn business discovery into qualified opportunities and customers.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          DigitalGate finds potential customers, understands their business, identifies
          opportunities, recommends who to contact and helps move them through your pipeline.
        </p>
      </header>

      <main className="dg-page-main space-y-8">
        <section className="rounded-xl border border-slate-700/80 bg-gradient-to-br from-slate-950/80 to-slate-900/40 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">
            The Growth Loop
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-200">
            {GROWTH_LOOP.map((step, i) => (
              <span key={step} className="flex items-center gap-2">
                {i > 0 ? (
                  <span className="text-slate-600" aria-hidden>
                    →
                  </span>
                ) : null}
                <span className="rounded-md border border-slate-700/80 bg-slate-950/60 px-2.5 py-1 uppercase tracking-wide text-[11px] text-slate-300">
                  {step}
                </span>
              </span>
            ))}
          </div>
        </section>

        {showBetaStatus ? <GrowthEngineBetaStatus /> : null}

        {/* Daily Briefing — intelligence heart */}
        <section className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-5 py-6 space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">
              Daily Briefing
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
              {briefing?.greeting ?? "Good morning."}
            </h2>
            <p className="mt-2 text-sm text-slate-200">
              Here&apos;s who DigitalGate thinks you should speak to today.
            </p>
            {briefing && briefing.recommendedCount > 0 ? (
              <p className="mt-1 text-sm text-slate-400">{briefing.subhead}</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile label="Recommended" value={briefing?.recommendedCount ?? 0} />
            <MetricTile label="Contacted today" value={briefing?.contactedToday ?? 0} />
            <MetricTile label="Conversations" value={briefing?.conversations ?? 0} />
            <MetricTile label="Meetings booked" value={briefing?.meetingsBooked ?? 0} />
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <div className="rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Action queue</p>
              <p className="mt-0.5 font-semibold text-white">
                {briefing?.stillRequireAction ?? 0} due
              </p>
            </div>
            {briefing?.proposalPipelineCents != null ? (
              <div className="rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  Pipeline value
                </p>
                <p className="mt-0.5 font-semibold text-white">
                  {formatAudCents(briefing.proposalPipelineCents)}
                </p>
              </div>
            ) : null}
          </div>

          {spotlight.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-600/80 bg-slate-950/40 px-5 py-6">
              <p className="font-medium text-white">No active prospects to recommend yet</p>
              <p className="mt-2 max-w-xl text-sm text-slate-400">
                Discover businesses, run an audit, and DigitalGate will rank who deserves your
                attention today — by Opportunity Score™, not a cold call list.
              </p>
              <Link
                href={discoveryHref}
                className="mt-4 inline-flex rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
              >
                Open Discovery
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {spotlight.map((row, index) => (
                <RecommendationCard
                  key={row.prospectId}
                  row={row}
                  index={index}
                  pipelineHref={pipelineHref}
                  auditsHref={auditsHref}
                  reportsHref={reportsHref}
                  enableActions={enableActions}
                />
              ))}
            </div>
          )}
        </section>

        {/* Growth Pipeline snapshot */}
        <section className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Growth Pipeline
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">Operating snapshot</h2>
            </div>
            <Link href={pipelineHref} className="text-sm text-sky-400 hover:underline">
              Open pipeline →
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4 font-medium">Metric</th>
                  <th className="py-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                <SnapshotRow label="Prospects" value={summary?.totalProspects ?? 0} />
                <SnapshotRow label="Engaged · 7d" value={summary?.engagementsThisWeek ?? 0} />
                <SnapshotRow label="Qualified" value={qualified} />
                <SnapshotRow label="Opportunities" value={Math.max(0, opportunities)} />
                <SnapshotRow label="Meetings" value={meetings} />
                <SnapshotRow label="Converted" value={converted} />
              </tbody>
            </table>
          </div>
        </section>

        {/* Full daily recommended list */}
        {spotlight.length > 0 ? (
          <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Daily recommended
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">Who to speak to today</h2>
              </div>
              <Link href={followUpsHref} className="text-xs text-sky-400 hover:underline">
                Full follow-up queue →
              </Link>
            </div>
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Business</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {(briefing?.rows ?? []).map((row) => (
                    <tr key={row.prospectId} className="border-t border-slate-800/80">
                      <td className="px-3 py-2 text-slate-500">{row.rank}</td>
                      <td className="px-3 py-2 font-medium text-white">{row.businessName}</td>
                      <td className="px-3 py-2 text-slate-300">
                        {row.score} · {row.bandLabel}
                      </td>
                      <td className="px-3 py-2 text-amber-100/90">
                        {row.recommendedActionLabel}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={pipelineHref}
                          className="text-xs text-sky-400 hover:underline"
                        >
                          Pipeline
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Ranked by Prospect Opportunity Score from audits, engagement, and fit — not an
              autonomous AI SDR.
            </p>
          </section>
        ) : null}

        <GrowthEngineCapabilityGrid groups={capabilityGroups} />

        {variant === "sales" ? (
          <p className="text-xs text-slate-500">
            Growth Engine™ is the orchestration layer for discovery, scoring, pipeline and
            activity. CRM remains the underlying customer relationship record.
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            DigitalGate GTM acquisition — feeds Opportunity Engine™. Tenant Sales uses the same
            Growth Engine experience under Sales.
          </p>
        )}
      </main>
    </>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: number }) {
  return (
    <tr className="border-b border-slate-800/60">
      <td className="py-2.5 pr-4 text-slate-400">{label}</td>
      <td className="py-2.5 font-semibold text-white">{value}</td>
    </tr>
  );
}

function RecommendationCard({
  row,
  index,
  pipelineHref,
  auditsHref,
  reportsHref,
  enableActions,
}: {
  row: DailyOpportunityRow;
  index: number;
  pipelineHref: string;
  auditsHref: string;
  reportsHref: string;
  enableActions: boolean;
}) {
  const hot = row.band === "very_high" || row.band === "high";

  return (
    <article className={`rounded-xl border px-5 py-5 space-y-3 ${bandAccent(row.band)}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {index === 0 ? "Priority" : `Recommendation ${index + 1}`}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {hot ? <span aria-hidden>🔥 </span> : null}
            {row.businessName}
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            Opportunity Score™ {row.score} · {row.bandLabel}
          </p>
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Why now</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
          {row.reasons.slice(0, 5).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-slate-200">
        <span className="font-medium text-white">Recommended action</span>
        <br />
        {row.recommendedActionLabel}. {row.approachHint}
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          href={pipelineHref}
          className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500"
        >
          View prospect
        </Link>
        {enableActions ? (
          <>
            {!row.hasAudit ? (
              <RunProspectAuditButton prospectId={row.prospectId} label="Run audit" />
            ) : (
              <Link
                href={auditsHref}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-400"
              >
                View audit
              </Link>
            )}
            <Link
              href={reportsHref}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-400"
            >
              Open opportunity
            </Link>
            <CreateProposalQuoteButton prospectId={row.prospectId} label="Propose" />
            {(row.stage === "proposal_sent" ||
              row.stage === "report_viewed" ||
              row.stage === "meeting_booked") && (
              <ConvertProspectToOrgButton prospectId={row.prospectId} label="Convert" />
            )}
          </>
        ) : (
          <Link
            href={pipelineHref}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-400"
          >
            Open opportunity
          </Link>
        )}
      </div>
    </article>
  );
}
