"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useChatWidget } from "@/components/platform/ChatWidgetProvider";
import { SetupProgressBar } from "@/components/overview/SetupProgressBar";
import type { BusinessOverview } from "@dg/platform-core";

function StatusDot({ status }: { status: string }) {
  const color =
    status === "healthy" || status === "connected" || status === "online"
      ? "bg-emerald-400"
      : status === "warning"
        ? "bg-amber-400"
        : "bg-slate-500";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function HealthTrendChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 280;
  const h = 80;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full text-blue-400" aria-hidden>
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

export function BusinessOverviewDashboard({ overview }: { overview: BusinessOverview }) {
  const { openSupportChat } = useChatWidget();

  return (
    <div className="space-y-6">
      {!overview.scoresLive ? (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-200/90">
          Intelligence preview — connect your website, Google, and CRM for live Business Health™
          scores.{" "}
          <Link href="/dashboard/settings/connectors" className="underline hover:text-white">
            Connectors →
          </Link>
        </div>
      ) : null}

      <SetupProgressBar progress={overview.setupProgress} />

      {overview.setupIncomplete ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
          Add your first CRM contact to unlock pipeline KPIs.{" "}
          <Link href="/apps/crm/contacts" className="font-medium underline">
            Add contact →
          </Link>
        </div>
      ) : null}

      {/* Daily briefing */}
      <section className="dg-card border-blue-500/20 bg-gradient-to-br from-slate-900 to-slate-950">
        <p className="text-xs font-medium uppercase tracking-wide text-blue-400">Daily briefing</p>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-200">
          {overview.dailyBriefing}
        </p>
      </section>

      {/* Priorities — largest card */}
      <section className="dg-card lg:col-span-2 border-emerald-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden>
            🤖
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white">AI Business Advisor</h2>
            <p className="mt-1 text-sm text-slate-400">
              {overview.greeting}. Your business is performing well. There are three things I
              recommend focusing on today:
            </p>
            <ol className="mt-4 space-y-3">
              {overview.priorities.map((p) => (
                <li key={p.rank} className="flex gap-3 text-sm text-slate-200">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-bold text-blue-300">
                    {p.rank}
                  </span>
                  <span>{p.text}</span>
                </li>
              ))}
            </ol>
            {overview.prioritiesImpact ? (
              <p className="mt-4 text-sm font-medium text-emerald-400">
                Potential impact: {overview.prioritiesImpact}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Business Health */}
        <section className="dg-card lg:col-span-1">
          <p className="text-xs uppercase tracking-wide text-slate-500">Business Health™</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-5xl font-bold text-white">{overview.businessHealth}</span>
            <span className="pb-2 text-lg text-slate-500">/ 100</span>
          </div>
          <p className="mt-1 text-sm text-emerald-400">↑ {overview.businessHealthDeltaLabel}</p>
          <ul className="mt-4 space-y-2">
            {overview.scoreBreakdown.map((s) => (
              <li key={s.id}>
                {s.href ? (
                  <Link
                    href={s.href}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-800/60"
                  >
                    <span className="text-slate-400">{s.label}</span>
                    <span className="font-medium text-white">{s.value}</span>
                  </Link>
                ) : (
                  <div className="flex items-center justify-between px-2 py-1.5 text-sm">
                    <span className="text-slate-400">{s.label}</span>
                    <span className="font-medium text-white">{s.value}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Snapshot */}
        <section className="dg-card lg:col-span-2">
          <h2 className="font-semibold text-white">Today&apos;s snapshot</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {overview.snapshot.map((kpi) => (
              <div key={kpi.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                {kpi.href ? (
                  <Link href={kpi.href} className="block hover:opacity-90">
                    <p className="text-xs text-slate-500">{kpi.label}</p>
                    <p className="mt-1 text-xl font-bold text-white">{kpi.value}</p>
                  </Link>
                ) : (
                  <>
                    <p className="text-xs text-slate-500">{kpi.label}</p>
                    <p className="mt-1 text-xl font-bold text-white">{kpi.value}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Intelligence */}
        <section className="dg-card">
          <h2 className="font-semibold text-white">Business intelligence</h2>
          <p className="mt-1 text-xs text-slate-500">Insights, not charts — written by AI</p>
          <ul className="mt-4 space-y-2">
            {overview.insights.map((insight, i) => (
              <li
                key={i}
                className={`text-sm ${
                  insight.tone === "warning"
                    ? "text-amber-300"
                    : insight.tone === "positive"
                      ? "text-emerald-300/90"
                      : "text-slate-300"
                }`}
              >
                {insight.text}
              </li>
            ))}
          </ul>
        </section>

        {/* Recommended actions */}
        <section className="dg-card">
          <h2 className="font-semibold text-white">Recommended actions</h2>
          <ul className="mt-4 space-y-3">
            {overview.recommendedActions.map((action) => (
              <li
                key={action.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-3"
              >
                <div>
                  <p className="font-medium text-white">{action.label}</p>
                  <p className="text-xs text-slate-500">{action.impact}</p>
                </div>
                {action.href ? (
                  <Link
                    href={action.href}
                    className="shrink-0 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                  >
                    {action.buttonLabel ?? "Go"}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline */}
        <section className="dg-card lg:col-span-2">
          <h2 className="font-semibold text-white">Activity timeline</h2>
          <ul className="mt-4 space-y-3">
            {overview.timeline.map((entry) => (
              <li key={entry.id} className="flex gap-4 border-l-2 border-slate-700 pl-4">
                <span className="w-14 shrink-0 text-xs text-slate-500">{entry.timeLabel}</span>
                <span className="text-sm text-slate-300">{entry.title}</span>
              </li>
            ))}
          </ul>
          <Link href="/apps/crm/timeline" className="mt-4 inline-block text-sm text-blue-400 hover:underline">
            Full timeline →
          </Link>
        </section>

        {/* Trends */}
        <section className="dg-card">
          <h2 className="font-semibold text-white">Performance trends</h2>
          <p className="text-xs text-slate-500">Business Health · Last 12 months</p>
          <div className="mt-4">
            <HealthTrendChart values={overview.healthTrend} />
          </div>
        </section>
      </div>

      {/* Connected systems */}
      <section className="dg-card">
        <h2 className="font-semibold text-white">Connected systems</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {overview.connectedSystems.map((sys) => (
            <div
              key={sys.id}
              className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-center"
            >
              <StatusDot status={sys.status} />
              <p className="mt-2 text-sm font-medium text-white">{sys.label}</p>
              <p className="text-xs capitalize text-slate-500">
                {sys.detail ?? sys.status.replace("_", " ")}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI Studio */}
        <section className="dg-card">
          <h2 className="font-semibold text-white">AI Studio</h2>
          <p className="mt-1 text-xs text-slate-500">Ask DigitalGate AI</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {overview.aiPrompts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  openSupportChat(`[AI Studio · ${p.label}]\n\n${p.prompt}`)
                }
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:border-blue-500/50 hover:text-white"
                title={p.prompt}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* Growth opportunities */}
        <section className="dg-card">
          <h2 className="font-semibold text-white">Growth opportunities</h2>
          <ul className="mt-4 space-y-2">
            {overview.growthOpportunities.map((opp) => (
              <li key={opp.id}>
                <Link
                  href={opp.href ?? "/dashboard/apps"}
                  className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-800/50"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{opp.label}</p>
                    <p className="text-xs text-slate-500">
                      {opp.status} · {opp.impact}
                    </p>
                  </div>
                  <span className="text-slate-600">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reports */}
        <section className="dg-card">
          <h2 className="font-semibold text-white">Recent reports</h2>
          <ul className="mt-3 space-y-2">
            {overview.recentReports.map((r) => (
              <li key={r.id}>
                {r.href ? (
                  <Link href={r.href} className="text-sm text-blue-400 hover:underline">
                    {r.label}
                  </Link>
                ) : (
                  <span className="text-sm text-slate-400">{r.label}</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Team */}
        {overview.teamActivity.length > 0 ? (
          <section className="dg-card">
            <h2 className="font-semibold text-white">Team activity</h2>
            <ul className="mt-4 space-y-3">
              {overview.teamActivity.map((member) => (
                <li key={member.name} className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-white">{member.name}</span>
                  <span className="text-slate-400">{member.summary}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
