import Link from "next/link";
import {
  getGrowthReports,
  healthTierDisplay,
  type GrowthReportPeriod,
} from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import { ScoreCell, TierBadge } from "@/components/command/tier-badge";

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

const PERIODS: Array<{ id: GrowthReportPeriod; label: string }> = [
  { id: "mtd", label: "Month to date" },
  { id: "last_30d", label: "Last 30 days" },
  { id: "last_7d", label: "Last 7 days" },
];

export default async function CommandReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const periodRaw = params.period ?? "mtd";
  const period = (["mtd", "last_30d", "last_7d"].includes(periodRaw)
    ? periodRaw
    : "mtd") as GrowthReportPeriod;

  const data = process.env.DATABASE_URL
    ? await getGrowthReports({ period })
    : null;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Growth Reports</h1>
        <p className="mt-1 text-sm text-slate-400">
          Period executive snapshots from Neon aggregates — leads, activity, listings, invoices.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="reports" />

        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p.id}
              href={`/command/reports?period=${p.id}`}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                period === p.id
                  ? "bg-sky-600 text-white"
                  : "border border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>

        {!data ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Database not configured — reports unavailable.
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-lg font-semibold text-white">
                Platform · {data.periodLabel}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Stat label="Orgs" value={data.platform.organisations} />
                <Stat label="New leads" value={data.platform.leadsNew} />
                <Stat label="Activities" value={data.platform.activities} />
                <Stat label="Open opps" value={data.platform.openOpportunities} />
                <Stat label="Invoices paid" value={data.platform.invoicePaidLabel} />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Per-client reports</h2>
              {data.reports.length === 0 ? (
                <p className="text-sm text-slate-500">No client reports for this period.</p>
              ) : (
                data.reports.map((report) => (
                  <article
                    key={report.organisationId}
                    className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          #{report.rank} · {report.organisationSlug}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-white">
                          {report.organisationName}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-sm text-slate-400">
                            Success Score{" "}
                            <ScoreCell score={report.successScore} />
                          </span>
                          <TierBadge tier={report.healthTier} />
                          <span className="text-xs text-slate-500">
                            {healthTierDisplay(report.healthTier)}
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/command/advisor?org=${report.organisationId}`}
                        className="text-sm text-sky-400 hover:underline"
                      >
                        Ask advisor →
                      </Link>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                      {report.highlights.map((h) => (
                        <div
                          key={h.label}
                          className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                        >
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">
                            {h.label}
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-white">{h.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-sky-400">
                        Recommended next step
                      </p>
                      <p className="mt-1 font-medium text-white">
                        {report.recommendedNextStep.label}
                      </p>
                      {report.recommendedNextStep.description ? (
                        <p className="mt-1 text-sm text-slate-400">
                          {report.recommendedNextStep.description}
                        </p>
                      ) : null}
                      {report.recommendedNextStep.href ? (
                        <Link
                          href={report.recommendedNextStep.href}
                          className="mt-2 inline-block text-sm text-sky-400 hover:underline"
                        >
                          Open →
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
