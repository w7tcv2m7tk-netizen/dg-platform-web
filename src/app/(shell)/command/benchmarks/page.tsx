import Link from "next/link";
import { getCommandBenchmarks } from "@dg/platform-core";

import { ScoreCell } from "@/components/command/tier-badge";

const METRIC_LABELS: Record<string, string> = {
  success_score: "Success Score™",
  conversion: "CRM activity",
  automation: "Acc/RE usage",
  website_health: "Connectors",
};

export default async function CommandBenchmarksPage() {
  const data = process.env.DATABASE_URL ? await getCommandBenchmarks() : null;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Benchmarking</h1>
        <p className="mt-1 text-sm text-slate-400">
          Anonymous cohort comparison — you vs average vs top decile.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        {!data ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Database not configured — benchmarks unavailable.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4">
              <p className="text-sm text-slate-300">
                {data.cohortLabel} · {data.cohortSize} organisation
                {data.cohortSize === 1 ? "" : "s"} · avg Success Score{" "}
                <ScoreCell score={data.averages.success_score} /> · top decile{" "}
                <ScoreCell score={data.topDecile.success_score} />
              </p>
            </div>

            <section className="space-y-4">
              {data.orgs.map((org) => (
                <article
                  key={org.organisationId}
                  className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {org.organisationName}
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Rank #{org.rank} · {org.percentile}th percentile · Score{" "}
                        <ScoreCell score={org.successScore} />
                      </p>
                    </div>
                    <Link
                      href={`/command/advisor?org=${org.organisationId}`}
                      className="text-sm text-sky-400 hover:underline"
                    >
                      Advise →
                    </Link>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="pb-2 pr-4 font-medium">Metric</th>
                          <th className="pb-2 pr-4 font-medium">You</th>
                          <th className="pb-2 pr-4 font-medium">Cohort avg</th>
                          <th className="pb-2 pr-4 font-medium">Top 10%</th>
                          <th className="pb-2 font-medium">Percentile</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {org.comparisons.map((row) => (
                          <tr key={row.metricId}>
                            <td className="py-2 pr-4 text-slate-300">
                              {METRIC_LABELS[row.metricId] ?? row.metricId}
                            </td>
                            <td className="py-2 pr-4 font-medium text-white">
                              {row.yourValue}
                            </td>
                            <td className="py-2 pr-4 text-slate-400">
                              {row.cohortAverage}
                            </td>
                            <td className="py-2 pr-4 text-slate-400">{row.topDecile}</td>
                            <td className="py-2 text-slate-300">
                              {row.percentile ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </main>
    </>
  );
}
