import Link from "next/link";
import {
  GROWTH_ENGINE_STAGE_LABELS,
  getGrowthConversionSnapshot,
} from "@dg/platform-core";

import { CommandHonestyBanner } from "@/components/command/CommandHonestyBanner";
import { ConvertProspectToOrgButton } from "@/components/command/GrowthEngineActions";

export default async function GrowthConversionsPage() {
  const db = Boolean(process.env.DATABASE_URL);
  const snap = db ? await getGrowthConversionSnapshot({ days: 30 }) : null;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/growth-engine" className="text-sm text-sky-400 hover:underline">
          ← Prospecting
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Conversion Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Funnel counts from audits, reports, engagements, and wins — last 30 days.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandHonestyBanner compact />

        {!snap ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Configure DATABASE_URL to load conversion metrics.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Audits generated" value={snap.auditsGenerated} />
              <Stat label="Reports sent" value={snap.reportsSent} />
              <Stat label="Meetings booked" value={snap.meetingsBooked} />
              <Stat label="Won" value={snap.won} sub={`${snap.lost} lost`} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Email open rate"
                value={`${snap.emailOpenRatePercent}%`}
                sub="manual stage only — no open pixel yet"
              />
              <Stat
                label="Report view rate"
                value={`${snap.reportViewRatePercent}%`}
                sub="of reports sent (public link views)"
              />
              <Stat
                label="Conversion rate"
                value={`${snap.conversionRatePercent}%`}
                sub="won / decided (or audits)"
              />
              <Stat
                label="Avg sales cycle"
                value={snap.averageSalesCycleDays}
                sub="days (won deals)"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-amber-200/80">
                  Growth MRR won
                </p>
                <p className="mt-1 text-3xl font-semibold text-white">$0</p>
                <p className="mt-1 text-xs text-amber-100/70">
                  Locked at $0 until Growth → Stripe attribution (not Commerce MRR)
                </p>
              </div>
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-amber-200/80">
                  Revenue forecast
                </p>
                <p className="mt-1 text-3xl font-semibold text-white">$0</p>
                <p className="mt-1 text-xs text-amber-100/70">
                  Locked at $0 until Stripe attribution ships
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4">
              <p className="text-xs text-slate-400">{snap.mrrNote}</p>
              <p className="mt-2 text-sm text-slate-400">
                {snap.totalProspects} total prospects · {snap.proposalsSent} proposal_sent
                engagements in period · {snap.periodLabel}. Live Commerce MRR:{" "}
                <Link href="/command/revenue" className="text-sky-400 hover:underline">
                  Revenue
                </Link>
                .
              </p>
            </div>

            <section>
              <h2 className="text-lg font-semibold text-white">Pipeline mix</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(snap.byStage).map(([stage, count]) => (
                  <div
                    key={stage}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                  >
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                      {GROWTH_ENGINE_STAGE_LABELS[stage] ?? stage}
                    </p>
                    <p className="mt-0.5 text-xl font-semibold text-white">{count}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Recent wins / onboarding</h2>
              {snap.recentWins.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No won or onboarding prospects yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {snap.recentWins.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-white">{row.businessName}</p>
                        <p className="text-xs text-slate-500">
                          {GROWTH_ENGINE_STAGE_LABELS[row.stage] ?? row.stage}
                          {row.industry ? ` · ${row.industry}` : ""}
                          {row.convertedOrganisationId ? " · org linked" : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <ConvertProspectToOrgButton
                          prospectId={row.id}
                          convertedOrganisationId={row.convertedOrganisationId}
                        />
                        <span className="text-xs text-slate-500">
                          {new Date(row.updatedAt).toLocaleDateString("en-AU")}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-white">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}
