import Link from "next/link";
import {
  GROWTH_ENGINE_STAGE_LABELS,
  getGrowthEngineSummary,
  getSalesCallRecommendations,
} from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import {
  ConvertProspectToOrgButton,
  CreateProposalQuoteButton,
} from "@/components/command/GrowthEngineActions";
import {
  GrowthEngineModuleGrid,
  GrowthEngineNav,
} from "@/components/command/GrowthEngineNav";

export default async function GrowthEngineHubPage() {
  const db = Boolean(process.env.DATABASE_URL);
  const [summary, callToday] = db
    ? await Promise.all([
        getGrowthEngineSummary(),
        getSalesCallRecommendations({ limit: 8, idleDays: 2 }),
      ])
    : [null, []];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Growth Engine™</h1>
        <p className="text-sm text-slate-400">
          Discover → audit → report → pipeline → proposal → client — Command Centre beta core
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="growth" />
        <GrowthEngineNav active="hub" />

        <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-4 py-4 text-sm text-sky-50">
          <p className="font-medium text-white">Closed beta — what pilots get</p>
          <p className="mt-1 text-sky-100/90">
            Send reports, work follow-ups, convert to a client org, then invite + Billing on that org.
            Growth MRR won stays $0 until Stripe attribution. Support/Audit Command modules redirect
            away (no vapor UI). Staff playbook:{" "}
            <code className="text-sky-200">docs/COMMAND-CENTRE-BETA.md</code>.
          </p>
        </div>

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

        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white">Call today</h2>
              <p className="mt-1 text-sm text-slate-400">
                Ranked from idle days, report views, and health scores — no invented metrics.
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
          ) : callToday.length === 0 ? (
            <p className="mt-4 text-sm text-emerald-200/90">
              No high-priority call targets right now.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {callToday.map((rec, index) => (
                <li
                  key={rec.prospectId}
                  className="flex flex-wrap items-start justify-between gap-3 border-t border-slate-800/80 pt-3 first:border-0 first:pt-0"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      <span className="mr-2 text-slate-500">{index + 1}.</span>
                      {rec.businessName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {GROWTH_ENGINE_STAGE_LABELS[rec.stage] ?? rec.stage}
                      {rec.businessHealthScore
                        ? ` · Health ${rec.businessHealthScore}`
                        : ""}
                      {rec.reportViewCount
                        ? ` · ${rec.reportViewCount} view${rec.reportViewCount === 1 ? "" : "s"}`
                        : ""}
                      {` · priority ${rec.priority}`}
                    </p>
                    <p className="mt-1 text-sm text-amber-100/90">{rec.reason}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <CreateProposalQuoteButton
                      prospectId={rec.prospectId}
                      label="Propose"
                    />
                    {(rec.stage === "proposal_sent" ||
                      rec.stage === "report_viewed" ||
                      rec.stage === "meeting_booked") && (
                      <ConvertProspectToOrgButton
                        prospectId={rec.prospectId}
                        label="Convert"
                      />
                    )}
                    <Link
                      href="/command/growth-engine/pipeline"
                      className="text-xs text-sky-400 hover:underline"
                    >
                      Pipeline →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-sm text-slate-400">
          Start with Discovery → run a presence Audit → generate an Opportunity Report → track on
          the Pipeline board.
        </p>

        <GrowthEngineModuleGrid />
      </main>
    </>
  );
}
