"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { SetupProgressBar } from "@/components/overview/SetupProgressBar";
import type { BusinessOverview, OverviewInsight } from "@dg/platform-core";

function StatusDot({ status }: { status: string }) {
  const colour =
    status === "healthy" || status === "connected" || status === "online"
      ? "bg-emerald-400"
      : status === "warning"
        ? "bg-amber-400"
        : "bg-slate-500";
  return <span className={`inline-block h-2 w-2 rounded-full ${colour}`} />;
}

function confidenceLabel(confidence: BusinessOverview["healthConfidence"]) {
  if (confidence === "high") return "High confidence";
  if (confidence === "medium") return "Medium confidence";
  if (confidence === "low") return "Low confidence";
  return "Insufficient evidence";
}

function insightTone(insight: OverviewInsight) {
  if (insight.tone === "warning") return "border-amber-500/25 bg-amber-500/5 text-amber-100";
  if (insight.tone === "positive") return "border-emerald-500/25 bg-emerald-500/5 text-emerald-100";
  return "border-slate-700/80 bg-slate-950/40 text-slate-200";
}

function HealthTrendChart({ values }: { values: number[] }) {
  if (values.length < 2) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 px-6 text-center">
        <div>
          <p className="text-sm font-medium text-slate-200">Building your real trend</p>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
            DigitalGate will draw this chart only from persisted Business Health measurements. No synthetic history is generated.
          </p>
        </div>
      </div>
    );
  }

  const width = 680;
  const height = 230;
  const padX = 28;
  const padTop = 22;
  const padBottom = 30;
  const minValue = Math.max(0, Math.min(...values) - 6);
  const maxValue = Math.min(100, Math.max(...values) + 6);
  const range = Math.max(1, maxValue - minValue);
  const plotHeight = height - padTop - padBottom;
  const plotWidth = width - padX * 2;
  const coords = values.map((value, index) => ({
    x: padX + (index / Math.max(values.length - 1, 1)) * plotWidth,
    y: padTop + (1 - (value - minValue) / range) * plotHeight,
    value,
  }));
  const linePoints = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = `${padX},${height - padBottom} ${linePoints} ${width - padX},${height - padBottom}`;
  const latest = coords[coords.length - 1];
  const first = values[0];
  const delta = values[values.length - 1] - first;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold text-white">{latest.value}<span className="text-base font-normal text-slate-500"> / 100</span></p>
          <p className={`mt-1 text-xs ${delta >= 0 ? "text-emerald-300" : "text-amber-300"}`}>
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)} points across recorded measurements
          </p>
        </div>
        <p className="text-xs text-slate-500">{values.length} real measurement{values.length === 1 ? "" : "s"}</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/45 px-2 py-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label="Business Health recorded trend">
          <defs>
            <linearGradient id="healthArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = padTop + fraction * plotHeight;
            const label = Math.round(maxValue - fraction * range);
            return (
              <g key={fraction}>
                <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="currentColor" className="text-slate-800" strokeWidth="1" />
                <text x="2" y={y + 4} className="fill-slate-600 text-[10px]">{label}</text>
              </g>
            );
          })}
          <polygon points={areaPoints} fill="url(#healthArea)" className="text-emerald-400" />
          <polyline points={linePoints} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400" />
          {coords.map((point, index) => (
            <g key={`${point.x}-${point.y}`}>
              <circle cx={point.x} cy={point.y} r={index === coords.length - 1 ? 5 : 3.5} className="fill-slate-950 stroke-emerald-400" strokeWidth="2" />
              {index === coords.length - 1 ? (
                <text x={point.x - 4} y={Math.max(14, point.y - 12)} textAnchor="end" className="fill-emerald-300 text-[11px] font-semibold">
                  {point.value}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function GoalRow({ goal }: { goal: BusinessOverview["goals"][number] }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white">{goal.title}</p>
          <p className="mt-1 text-xs text-slate-500">{goal.currentLabel} of {goal.targetLabel}</p>
        </div>
        <span className="text-lg font-semibold text-sky-300">{goal.percent}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, goal.percent))}%` }} />
      </div>
    </>
  );

  if (!goal.href) return <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-4">{content}</div>;
  return <Link href={goal.href} className="block rounded-xl border border-slate-800 bg-slate-950/35 p-4 transition hover:border-sky-500/35">{content}</Link>;
}

function PulseCard({ label, value, href, detail }: { label: string; value: string; href?: string; detail?: string }) {
  const body = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className="rounded-2xl border border-slate-800 bg-slate-950/45 px-4 py-4 transition hover:border-sky-500/35 hover:bg-slate-900/60">{body}</Link>
  ) : (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/45 px-4 py-4">{body}</div>
  );
}

export function BusinessOverviewDashboard({
  overview,
  growthScorecard,
}: {
  overview: BusinessOverview;
  growthScorecard?: ReactNode;
}) {
  const priorityCount = overview.priorities.length;
  const firstInsight = overview.insights[0] ?? null;
  const supportingInsights = overview.insights.slice(1, 4);
  const visibleTimeline = overview.timeline.filter((item) => item.id !== "empty").slice(0, 5);
  const snapshotPulse = overview.snapshot.slice(0, 3);
  const evidenceCoverage = overview.healthEvidenceCoveragePercent;
  const confidence = confidenceLabel(overview.healthConfidence);

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-violet-500/20 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] px-5 py-6 shadow-2xl shadow-black/10 sm:px-7 sm:py-7">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" aria-hidden />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold tracking-wide text-violet-200">AI</span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">Aida</span>
            </div>
            <p className="text-xs text-slate-500">Updated {overview.lastUpdatedLabel}</p>
          </div>

          <div className="mt-6 max-w-4xl">
            <p className="text-sm font-medium text-violet-200/90">{overview.greeting}.</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {priorityCount > 0
                ? `Here${priorityCount === 1 ? "'s" : " are"} ${priorityCount === 1 ? "the thing" : `${priorityCount} things`} I’d focus on next.`
                : "Here’s how the business is looking right now."}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              {overview.dailyBriefing}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard/advisor" className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500">
              Ask Aida →
            </Link>
            {priorityCount > 0 ? (
              <a href="#todays-priorities" className="rounded-full border border-slate-700 bg-slate-950/40 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                View today&apos;s priorities
              </a>
            ) : null}
            <Link href="/dashboard/brain" className="rounded-full border border-slate-700 bg-slate-950/40 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
              Business Brain
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/5 pt-5 text-xs text-slate-500">
            <span>{overview.organisationName}</span>
            {evidenceCoverage != null ? <span>{evidenceCoverage}% evidence coverage</span> : null}
            {overview.healthConfidence ? <span>{confidence}</span> : null}
            {overview.healthMeasurementCount != null ? <span>{overview.healthMeasurementCount} recorded Health measurement{overview.healthMeasurementCount === 1 ? "" : "s"}</span> : null}
          </div>
        </div>
      </section>

      {!overview.scoresLive ? (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-200/90">
          Aida is still learning this business. Connect the services you use so she can build a reliable Business Health view.{" "}
          <Link href="/dashboard/settings/connected-services" className="font-medium underline hover:text-white">Connected Services →</Link>
        </div>
      ) : null}

      {overview.setupProgress.complete ? null : <SetupProgressBar progress={overview.setupProgress} />}

      {overview.setupIncomplete ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
          Add your first CRM contact to unlock pipeline KPIs.{" "}
          <Link href="/apps/crm/contacts" className="font-medium underline">Add contact →</Link>
        </div>
      ) : null}

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Executive pulse</p>
            <h2 className="mt-1 text-lg font-semibold text-white">The business at a glance</h2>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PulseCard
            label="Business Health"
            value={overview.scoresLive ? `${overview.businessHealth} / 100` : "Not enough data"}
            href="/dashboard/health"
            detail={overview.scoresLive ? overview.businessHealthDeltaLabel : evidenceCoverage != null ? `${evidenceCoverage}% evidence coverage` : "Building evidence"}
          />
          {snapshotPulse.map((kpi) => (
            <PulseCard key={kpi.id} label={kpi.label} value={kpi.value} href={kpi.href} />
          ))}
        </div>
      </section>

      {growthScorecard}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <section className="rounded-2xl border border-slate-800 bg-slate-950/35 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">Business pulse</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Business Health trend</h2>
              <p className="mt-1 text-xs text-slate-500">Persisted measurements only — no synthetic trend data.</p>
            </div>
            <Link href="/dashboard/health" className="text-xs font-medium text-sky-400 hover:underline">Open Health →</Link>
          </div>
          <div className="mt-5"><HealthTrendChart values={overview.healthTrend} /></div>
        </section>

        <section id="todays-priorities" className="rounded-2xl border border-violet-500/20 bg-gradient-to-b from-violet-500/8 to-slate-950/45 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/80">Aida recommends</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Today&apos;s priorities</h2>
            </div>
            <Link href="/dashboard/advisor" className="text-xs text-violet-300 hover:underline">Why these? →</Link>
          </div>

          {priorityCount ? (
            <ol className="mt-5 space-y-4">
              {overview.priorities.map((priority) => (
                <li key={priority.rank} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-400/25 bg-violet-500/10 text-xs font-semibold text-violet-200">{priority.rank}</span>
                  <p className="pt-0.5 text-sm leading-6 text-slate-200">{priority.text}</p>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <p className="text-sm font-medium text-white">Nothing urgent is being flagged.</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Aida will surface priorities here when current business evidence supports them.</p>
            </div>
          )}

          {overview.prioritiesImpact ? (
            <div className="mt-5 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/70">Observed impact</p>
              <p className="mt-1 text-sm text-emerald-100">{overview.prioritiesImpact}</p>
            </div>
          ) : null}
        </section>
      </div>

      {firstInsight ? (
        <section className={`rounded-2xl border px-5 py-5 sm:px-6 ${insightTone(firstInsight)}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">Aida noticed</p>
              <p className="mt-2 text-lg font-medium leading-7">{firstInsight.text}</p>
            </div>
            <Link href="/dashboard/insights" className="text-xs font-medium text-sky-300 hover:underline">View evidence & insights →</Link>
          </div>
          {supportingInsights.length ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-current/10 pt-4">
              {supportingInsights.map((insight, index) => (
                <span key={`${insight.text}-${index}`} className="rounded-full border border-current/10 bg-black/10 px-3 py-1.5 text-xs opacity-80">{insight.text}</span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-950/35 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Since you were here</p>
              <h2 className="mt-1 text-lg font-semibold text-white">What changed</h2>
            </div>
            <Link href="/apps/crm/timeline" className="text-xs text-sky-400 hover:underline">Full activity →</Link>
          </div>
          {visibleTimeline.length ? (
            <ul className="mt-5 space-y-4">
              {visibleTimeline.map((entry) => (
                <li key={entry.id} className="grid grid-cols-[4rem_1fr] gap-3 border-l border-slate-700 pl-4">
                  <span className="text-xs text-slate-500">{entry.timeLabel}</span>
                  <span className="text-sm leading-5 text-slate-300">{entry.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-slate-500">No new recorded activity yet.</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/35 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Direction</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Goals</h2>
            </div>
            <Link href="/dashboard/goals" className="text-xs text-sky-400 hover:underline">Manage →</Link>
          </div>
          {overview.goals.length ? (
            <div className="mt-4 space-y-3">
              {overview.goals.slice(0, 3).map((goal) => <GoalRow key={goal.id} goal={goal} />)}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-700 p-4">
              <p className="text-sm font-medium text-slate-200">Give Aida a target to optimise for.</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Goals make recommendations more specific and help DigitalGate distinguish activity from progress.</p>
              <Link href="/dashboard/goals" className="mt-3 inline-block text-sm font-medium text-sky-400 hover:underline">Set a business goal →</Link>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-950/35 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Act</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Recommended actions</h2>
            </div>
            <Link href="/dashboard/advisor" className="text-xs text-violet-300 hover:underline">Open Aida →</Link>
          </div>
          <ul className="mt-4 space-y-3">
            {overview.recommendedActions.map((action) => (
              <li key={action.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{action.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{action.impact}</p>
                </div>
                {action.href ? <Link href={action.href} className="shrink-0 rounded-full bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-500">{action.buttonLabel ?? "Open"}</Link> : null}
              </li>
            ))}
          </ul>
        </section>

        <section id="growth-opportunities" className="rounded-2xl border border-slate-800 bg-slate-950/35 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">Grow</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Growth opportunities</h2>
            </div>
            {overview.growthOpportunityCount > 0 ? <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">{overview.growthOpportunityCount} found</span> : null}
          </div>
          <ul className="mt-4 space-y-2">
            {overview.growthOpportunities.slice(0, 4).map((opportunity) => (
              <li key={opportunity.id}>
                <Link href={opportunity.href ?? "/dashboard/apps"} className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition hover:bg-slate-900/70">
                  <div>
                    <p className="text-sm font-medium text-white">{opportunity.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{opportunity.status} · {opportunity.impact}</p>
                  </div>
                  <span className="text-slate-600">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {overview.scoresLive && overview.scoreBreakdown.length ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-950/35 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Evidence map</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Business Health dimensions</h2>
            </div>
            <Link href="/dashboard/health" className="text-xs text-sky-400 hover:underline">See methodology →</Link>
          </div>
          <div className="mt-5 grid gap-x-8 gap-y-4 md:grid-cols-2">
            {overview.scoreBreakdown.map((score) => (
              <div key={score.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  {score.href ? <Link href={score.href} className="text-slate-300 hover:text-white">{score.label}</Link> : <span className="text-slate-300">{score.label}</span>}
                  <span className="font-semibold text-white">{score.value}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, score.value))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-950/25 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">System state</p>
            <h2 className="mt-1 text-base font-semibold text-white">Connected systems</h2>
          </div>
          <Link href="/dashboard/settings/connected-services" className="text-xs text-sky-400 hover:underline">Manage connections →</Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {overview.connectedSystems.map((system) => (
            <div key={system.id} className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-300" title={system.detail}>
              <StatusDot status={system.status} />
              <span>{system.label}</span>
              {system.detail ? <span className="hidden text-slate-600 sm:inline">· {system.detail}</span> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/twin" className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4 transition hover:border-sky-500/30">
          <p className="text-xs font-semibold text-white">Digital Twin</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Live state of the business and connected operating signals.</p>
        </Link>
        <Link href="/dashboard/brain" className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4 transition hover:border-sky-500/30">
          <p className="text-xs font-semibold text-white">Business Brain</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Approved knowledge, context and governed organisational memory.</p>
        </Link>
        <Link href="/dashboard/benchmarks" className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4 transition hover:border-sky-500/30">
          <p className="text-xs font-semibold text-white">Benchmarks</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Comparative performance when enough reliable evidence exists.</p>
        </Link>
      </section>
    </div>
  );
}
