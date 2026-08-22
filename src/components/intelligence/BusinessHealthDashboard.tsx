import Link from "next/link";

import { IntelligenceHierarchy } from "@/components/intelligence/IntelligenceHierarchy";
import type { BusinessHealthBundle, HealthDimension } from "@dg/platform-core";

function scoreTone(score: number | null | undefined) {
  if (score == null) return "text-slate-400";
  if (score >= 75) return "text-emerald-400";
  if (score >= 55) return "text-sky-400";
  return "text-amber-300";
}

function statusPrefix(status: HealthDimension["status"]) {
  if (status === "strong") return "🟢";
  if (status === "watch") return "🟠";
  if (status === "attention") return "🔴";
  return "⚪";
}

function HealthTrendChart({ values }: { values: number[] }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 280;
  const h = 80;
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const y = h - ((v - min) / range) * (h - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full text-emerald-400" aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function SignalList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={`text-xs font-medium uppercase tracking-wide ${tone}`}>{title}</p>
      <p className="mt-1 text-sm text-slate-300">{items.join(", ")}</p>
    </div>
  );
}

export function BusinessHealthDashboard({ data }: { data: BusinessHealthBundle }) {
  const statusEmoji =
    data.overallStatus === "improving"
      ? "🟢"
      : data.overallStatus === "at_risk"
        ? "🔴"
        : data.overallStatus === "stable"
          ? "🟢"
          : "⚪";

  return (
    <div className="space-y-6">
      {!data.scoresLive ? (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-200/90">
          Connect your website, CRM, finance, and review sources to unlock live Business Health
          vital signs.{" "}
          <Link href="/dashboard/settings/connectors" className="underline hover:text-white">
            Connectors →
          </Link>
        </div>
      ) : null}

      <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-950/40 to-slate-950/40 px-6 py-6">
        <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/90">
          Business Health Score™
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <p className="text-5xl font-bold text-white">
            {data.overallScore ?? "—"}
            <span className="text-2xl font-normal text-slate-500"> / 100</span>
          </p>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          {statusEmoji} {data.overallStatusLabel}
          {data.trendDelta30Days != null && data.trendDelta30Days !== 0 ? (
            <span className={data.trendDelta30Days > 0 ? "text-emerald-400" : "text-amber-300"}>
              {" "}
              · {data.trendDelta30Days > 0 ? "↑" : "↓"} {Math.abs(data.trendDelta30Days)} over the
              past 30 days
            </span>
          ) : null}
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <SignalList title="Strong" items={data.strong} tone="text-emerald-400" />
          <SignalList title="Watch" items={data.watch} tone="text-amber-300" />
          <SignalList title="Attention" items={data.attention} tone="text-rose-400" />
        </div>
      </section>

      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Vital signals monitored
        </h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {data.vitalSignals.map((signal) => (
            <li key={signal.label} className="text-sm text-slate-300">
              {signal.icon} {signal.label}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Health dimensions
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Each area gets its own health score — strengths, weaknesses, trends and emerging risks.
        </p>
        <div className="mt-4 space-y-3">
          {data.dimensions.map((dimension) => (
            <Link
              key={dimension.id}
              href={dimension.href}
              className="block rounded-xl border border-slate-800/80 bg-slate-950/30 px-4 py-4 hover:border-slate-600"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    {statusPrefix(dimension.status)} {dimension.icon} {dimension.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">{dimension.summary}</p>
                  {dimension.unavailableReason ? (
                    <p className="mt-1 text-xs text-slate-500">{dimension.unavailableReason}</p>
                  ) : null}
                </div>
                <p className={`text-2xl font-bold ${scoreTone(dimension.score)}`}>
                  {dimension.score ?? "—"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {data.predictiveAlerts.length ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Predictive health
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Early warnings from connected signals — not just what happened, but what may happen
              next.
            </p>
          </div>
          {data.predictiveAlerts.map((alert) => (
            <article
              key={alert.id}
              className={`rounded-xl border px-5 py-4 ${
                alert.severity === "critical"
                  ? "border-rose-500/30 bg-rose-500/5"
                  : "border-amber-500/30 bg-amber-500/5"
              }`}
            >
              <p className="text-sm font-medium text-white">
                {alert.severity === "critical" ? "⚠️" : "⚠️"} {alert.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{alert.body}</p>
              <p className="mt-3 text-sm text-slate-200">
                Recommended action: {alert.recommendedAction}
              </p>
              <Link
                href={alert.href}
                className="mt-3 inline-block text-sm font-medium text-sky-400 hover:text-white"
              >
                Take action →
              </Link>
            </article>
          ))}
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Health trend
        </h2>
        <p className="text-xs text-slate-500">Business Health · Last 12 months</p>
        <div className="mt-4">
          <HealthTrendChart values={data.healthTrend} />
        </div>
      </section>

      <IntelligenceHierarchy active="health" />
    </div>
  );
}
