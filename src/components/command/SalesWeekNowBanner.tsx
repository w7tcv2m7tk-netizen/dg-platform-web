"use client";

import Link from "next/link";
import { useState } from "react";
import type { SalesWeekPrompt } from "@dg/platform-core";

export function SalesWeekNowBanner({
  prompt,
  compact = false,
}: {
  prompt: SalesWeekPrompt;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
              Today&apos;s operating plan
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {prompt.lockDay != null
                ? `Day ${prompt.lockDay} / ${prompt.lockDays} · ${prompt.theme}`
                : `${prompt.dayLabel} · ${prompt.theme}`}
            </p>
            <p className="mt-0.5 text-sm text-slate-300">{prompt.doNow}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/command/docs/founding-10-outreach"
              className="rounded-full border border-emerald-700/80 px-3 py-1 text-xs text-emerald-100 hover:border-emerald-500"
            >
              Distribute
            </Link>
            <Link
              href="/command/sales-week"
              className="rounded-full border border-emerald-700/80 px-3 py-1 text-xs text-emerald-100 hover:border-emerald-500"
            >
              Full week
            </Link>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              {expanded ? "Less" : "Details"}
            </button>
          </div>
        </div>
        {expanded ? (
          <div className="mt-4 space-y-2 border-t border-emerald-500/15 pt-4 text-sm text-slate-300">
            <p>
              {prompt.dayLabel} — {prompt.headline}
            </p>
            {prompt.baseline ? <p className="text-emerald-100/80">{prompt.baseline}</p> : null}
            <p className="text-xs text-slate-500">
              {prompt.timeZone.replace("_", " ")} · {prompt.clockLabel}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {prompt.href && prompt.hrefLabel ? (
                <Link
                  href={prompt.href}
                  className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                >
                  {prompt.hrefLabel} →
                </Link>
              ) : null}
              <Link
                href="/command/founding"
                className="rounded-full border border-emerald-700/80 px-3 py-1 text-xs text-emerald-100 hover:border-emerald-500"
              >
                Founding pipeline
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
            Sales Week · {prompt.timeZone.replace("_", " ")} · {prompt.clockLabel}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">{prompt.headline}</h2>
          <p className="mt-1 text-sm text-slate-300">
            {prompt.dayLabel} — {prompt.theme}
            {prompt.lockDay != null
              ? ` · Founding 10 day ${prompt.lockDay} of ${prompt.lockDays}`
              : ""}
          </p>
        </div>
        <Link
          href="/command/docs/commercial-engine"
          className="text-sm text-emerald-300 hover:underline"
        >
          Operating lock →
        </Link>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-200">{prompt.doNow}</p>
      {prompt.baseline ? (
        <p className="mt-2 text-sm text-emerald-100/80">{prompt.baseline}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        {prompt.href && prompt.hrefLabel ? (
          <Link
            href={prompt.href}
            className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            {prompt.hrefLabel} →
          </Link>
        ) : null}
        <Link
          href="/command/docs/founding-10-outreach"
          className="rounded-full border border-emerald-700/80 px-4 py-1.5 text-sm text-emerald-100 hover:border-emerald-500"
        >
          Outreach copy
        </Link>
        <Link
          href="/command/founding"
          className="rounded-full border border-emerald-700/80 px-4 py-1.5 text-sm text-emerald-100 hover:border-emerald-500"
        >
          Founding pipeline
        </Link>
        <Link
          href="/apps/crm/opportunities"
          className="rounded-full border border-slate-600 px-4 py-1.5 text-sm text-slate-300 hover:border-slate-400"
        >
          CRM
        </Link>
      </div>
    </section>
  );
}
