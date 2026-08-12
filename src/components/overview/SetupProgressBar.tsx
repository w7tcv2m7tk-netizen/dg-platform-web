"use client";

import Link from "next/link";
import { useState } from "react";

import type { OverviewSetupProgress } from "@dg/platform-core";

export function SetupProgressBar({ progress }: { progress: OverviewSetupProgress }) {
  const [expanded, setExpanded] = useState(!progress.complete);

  const barColor = progress.complete
    ? "bg-emerald-500"
    : progress.percent >= 50
      ? "bg-blue-500"
      : "bg-amber-500";

  return (
    <section className="dg-card border-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Platform setup
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {progress.complete
              ? "You're all set"
              : `${progress.completed} of ${progress.total} steps complete`}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {progress.complete
              ? "Core platform setup is done — keep building your digital presence."
              : "Finish these steps to unlock live KPIs and AI briefings."}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-white">{progress.percent}%</p>
          {!progress.complete ? (
            <Link
              href="/onboarding"
              className="mt-1 inline-block text-xs font-medium text-blue-400 hover:underline"
            >
              Setup guide →
            </Link>
          ) : null}
        </div>
      </div>

      <div
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Platform setup progress"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 text-xs font-medium text-slate-500 hover:text-slate-300"
      >
        {expanded ? "Hide checklist ▾" : "Show checklist ▸"}
      </button>

      {expanded ? (
        <ul className="mt-3 space-y-2 border-t border-slate-800 pt-3">
          {progress.steps.map((step) => (
            <li key={step.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className={step.done ? "text-emerald-400" : "text-slate-600"} aria-hidden>
                  {step.done ? "✓" : "○"}
                </span>
                {step.href && !step.done ? (
                  <Link href={step.href} className="truncate text-slate-200 hover:text-white">
                    {step.label}
                  </Link>
                ) : (
                  <span className={step.done ? "text-slate-300" : "text-slate-400"}>
                    {step.label}
                  </span>
                )}
              </div>
              {step.detail ? (
                <span className="shrink-0 text-xs text-slate-500">{step.detail}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
