import Link from "next/link";

import { BenchmarkCohortSelector } from "@/components/intelligence/BenchmarkCohortSelector";
import { IntelligenceHierarchy } from "@/components/intelligence/IntelligenceHierarchy";
import type { BusinessBenchmarksBundle } from "@dg/platform-core";

function scoreTone(score: number | null | undefined) {
  if (score == null) return "text-slate-400";
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-sky-400";
  if (score >= 45) return "text-amber-300";
  return "text-rose-400";
}

function CategoryPill({
  category,
  variant,
}: {
  category: BusinessBenchmarksBundle["strongest"][number];
  variant: "strong" | "gap";
}) {
  const dot =
    variant === "strong"
      ? "text-emerald-400"
      : (category.percentile ?? 100) < 45
        ? "text-rose-400"
        : "text-amber-400";
  const prefix = variant === "strong" ? "🟢" : (category.percentile ?? 100) < 45 ? "🔴" : "🟠";

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-950/40 px-4 py-3">
      <span className="text-sm text-slate-200">
        {prefix} {category.icon} {category.label}
      </span>
      <span className={`text-sm font-semibold ${dot}`}>
        {category.yourScore ?? "—"}
      </span>
    </div>
  );
}

function TrendRow({ trend }: { trend: BusinessBenchmarksBundle["trend"] }) {
  if (!trend.length) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-400">
      <span className="text-slate-500">Your position</span>
      {trend.map((point, index) => (
        <span key={`${point.label}-${index}`} className="inline-flex items-center gap-2">
          {index > 0 ? <span className="text-slate-600">→</span> : null}
          <span className="font-medium text-slate-300">{point.percentile}th</span>
        </span>
      ))}
    </div>
  );
}

export function BusinessBenchmarksDashboard({ data }: { data: BusinessBenchmarksBundle }) {
  return (
    <div className="space-y-6">
      {!data.scoresLive ? (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-200/90">
          Benchmark preview — connect your website, CRM, and review sources for live comparisons.{" "}
          <Link href="/dashboard/settings/connectors" className="underline hover:text-white">
            Connectors →
          </Link>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4">
        <BenchmarkCohortSelector options={data.cohortOptions} selectedId={data.cohortId} />
        <div className="mt-4 border-t border-slate-800/80 pt-4">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
            Benchmark group
          </p>
          <p className="mt-1 text-sm font-medium text-white">{data.cohortLabel}</p>
          <p className="mt-1 text-xs text-slate-500">{data.cohortDescription}</p>
          <p className="mt-3 text-xs text-slate-500">{data.dataSourceNote}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-slate-950/40 to-slate-950/40 px-6 py-6">
        <p className="text-xs font-medium uppercase tracking-widest text-sky-400/90">
          Your Benchmark Score™
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <p className="text-5xl font-bold text-white">
            {data.benchmarkScore ?? "—"}
            <span className="text-2xl font-normal text-slate-500"> / 100</span>
          </p>
          {data.overallPercentile != null ? (
            <p className="pb-1 text-sm text-slate-300">
              Better than {data.overallPercentile}% of comparable businesses
            </p>
          ) : null}
        </div>
        {data.percentileDelta90Days != null && data.percentileDelta90Days !== 0 ? (
          <p
            className={`mt-2 text-sm ${data.percentileDelta90Days > 0 ? "text-emerald-400" : "text-amber-300"}`}
          >
            {data.percentileDelta90Days > 0 ? "↑" : "↓"} {Math.abs(data.percentileDelta90Days)}{" "}
            points in the last 90 days
          </p>
        ) : null}
        <TrendRow trend={data.trend} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Your strongest areas
          </h2>
          {data.strongest.length ? (
            data.strongest.map((category) => (
              <CategoryPill key={category.id} category={category} variant="strong" />
            ))
          ) : (
            <p className="text-sm text-slate-500">
              Connect more data to surface your leading benchmark categories.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Biggest opportunities
          </h2>
          {data.opportunities.length ? (
            data.opportunities.map((category) => (
              <CategoryPill key={category.id} category={category} variant="gap" />
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No major gaps detected — keep momentum and watch benchmark trends.
            </p>
          )}
        </section>
      </div>

      {(data.digitalPresencePercentile != null || data.aiMaturityScore != null) && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.digitalPresencePercentile != null ? (
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
                Digital benchmark
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Your digital presence is stronger than{" "}
                <span className="font-semibold text-white">
                  {data.digitalPresencePercentile}%
                </span>{" "}
                of businesses in your benchmark group.
              </p>
              {data.digitalPresenceScore != null ? (
                <p className={`mt-2 text-2xl font-bold ${scoreTone(data.digitalPresenceScore)}`}>
                  {data.digitalPresenceScore}/100
                </p>
              ) : null}
            </div>
          ) : null}

          {data.aiMaturityScore != null ? (
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
                AI maturity benchmark
              </p>
              <p className={`mt-2 text-2xl font-bold ${scoreTone(data.aiMaturityScore)}`}>
                {data.aiMaturityScore}/100
              </p>
              {data.aiMaturityPercentile != null ? (
                <p className="mt-1 text-sm text-slate-400">
                  Ahead of {data.aiMaturityPercentile}% in your industry reference cohort
                </p>
              ) : null}
              {data.aiMaturityInsight ? (
                <p className="mt-2 text-sm text-slate-400">{data.aiMaturityInsight}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {data.operationalInsight ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-100/90">
          {data.operationalInsight}
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Benchmark comparison
        </h2>
        <p className="mt-1 text-sm text-slate-500">You vs similar businesses</p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-2 pr-4 font-medium">Metric</th>
                <th className="pb-2 pr-4 font-medium">You</th>
                <th className="pb-2 pr-4 font-medium">{data.comparisonLabels.average}</th>
                <th className="pb-2 font-medium">{data.comparisonLabels.top}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {data.metrics.map((row) => (
                <tr key={row.id}>
                  <td className="py-2.5 pr-4 text-slate-300">
                    <div>{row.label}</div>
                    {row.unavailableReason ? (
                      <div className="mt-0.5 text-xs text-slate-500">{row.unavailableReason}</div>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-4 font-medium text-white">{row.yourValue}</td>
                  <td className="py-2.5 pr-4 text-slate-400">{row.industryAverage}</td>
                  <td className="py-2.5 text-slate-400">{row.top25}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Category scores
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-2 pr-4 font-medium">Area</th>
                <th className="pb-2 pr-4 font-medium">You</th>
                <th className="pb-2 pr-4 font-medium">{data.comparisonLabels.average}</th>
                <th className="pb-2 pr-4 font-medium">{data.comparisonLabels.top}</th>
                <th className="pb-2 font-medium">Percentile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {data.categories.map((category) => (
                <tr key={category.id}>
                  <td className="py-2.5 pr-4 text-slate-300">
                    <span>
                      {category.icon} {category.label}
                    </span>
                    {category.unavailableReason ? (
                      <div className="mt-0.5 text-xs text-slate-500">
                        {category.unavailableReason}
                      </div>
                    ) : null}
                  </td>
                  <td className={`py-2.5 pr-4 font-medium ${scoreTone(category.yourScore)}`}>
                    {category.yourScore ?? "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-400">{category.industryAverage}</td>
                  <td className="py-2.5 pr-4 text-slate-400">{category.top25}</td>
                  <td className="py-2.5 text-slate-300">
                    {category.percentile != null ? `${category.percentile}th` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-5 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-300/90">
          AI Benchmark Briefing
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-200">{data.briefing}</p>
        <Link
          href="/dashboard/advisor"
          className="mt-4 inline-block text-sm font-medium text-violet-300 hover:text-white"
        >
          View Recommended Actions →
        </Link>
      </section>

      {data.recommendedActions.length ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Opportunities from benchmarks
          </h2>
          {data.recommendedActions.map((action) => (
            <article
              key={action.id}
              className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4"
            >
              <h3 className="font-medium text-white">{action.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{action.gap}</p>
              <p className="mt-2 text-sm text-slate-300">
                <span className="text-slate-500">Potential impact:</span> {action.impact}
              </p>
              <Link
                href={action.href}
                className="mt-3 inline-block text-sm font-medium text-sky-400 hover:text-white"
              >
                {action.actionLabel}
              </Link>
            </article>
          ))}
        </section>
      ) : null}

      <IntelligenceHierarchy active="benchmarks" />
    </div>
  );
}
