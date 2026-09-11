"use client";

import Link from "next/link";
import { useState } from "react";

import { WebsiteSignalsPanel } from "@/components/seo/WebsiteSignalsPanel";
import type {
  WebsiteSignalFinding,
  WebsiteSignalProbes,
} from "@/components/seo/WebsiteSignalsPanel";

export interface AiVisibilityScoreRow {
  id: string;
  label: string;
  value: number | null;
  href?: string;
  provisional?: boolean;
}

export function AiVisibilityDashboard({
  aiVisibilityScore,
  businessHealth,
  scoreSource,
  scoreBreakdown,
  profileGaps,
  websiteUrl,
  auditedAt,
  probes,
  findings,
}: {
  aiVisibilityScore: number | null;
  businessHealth: number | null;
  scoreSource: "audit" | "provisional" | "none";
  scoreBreakdown: AiVisibilityScoreRow[];
  profileGaps: string[];
  websiteUrl: string | null;
  auditedAt: string | null;
  probes: WebsiteSignalProbes | null;
  findings: WebsiteSignalFinding[];
}) {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generateBrief() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "briefing" }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.data?.output) {
        setReport(json.data.output);
      }
    } finally {
      setLoading(false);
    }
  }

  const tier =
    aiVisibilityScore == null
      ? "Not scanned"
      : aiVisibilityScore >= 85
        ? "Strong"
        : aiVisibilityScore >= 70
          ? "Moderate"
          : "Needs work";

  const sourceLabel =
    scoreSource === "audit"
      ? "From last website presence audit"
      : scoreSource === "provisional"
        ? "Provisional — run a presence scan for evidence-based score"
        : "No score yet — add a website URL and scan";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
        AI Visibility measures observable website signals that help AI answer engines understand
        your business, including schema, Open Graph and technical readiness. Citation monitoring
        across third-party AI services is not currently included.
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="dg-card lg:col-span-1">
          <p className="text-xs uppercase tracking-wide text-slate-500">AI Visibility Score</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-5xl font-bold text-white">
              {aiVisibilityScore == null ? "—" : aiVisibilityScore}
            </span>
            {aiVisibilityScore != null ? (
              <span className="pb-2 text-lg text-slate-500">/ 100</span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-sky-400">{tier}</p>
          <p className="mt-2 text-xs text-slate-500">{sourceLabel}</p>
          {businessHealth != null ? (
            <p className="mt-3 text-xs text-slate-500">Business Health: {businessHealth}/100</p>
          ) : null}
        </div>

        <div className="dg-card lg:col-span-2">
          <h2 className="font-semibold text-white">Score drivers</h2>
          <ul className="mt-4 space-y-2">
            {scoreBreakdown.map((s) => (
              <li key={s.id}>
                {s.href ? (
                  <Link
                    href={s.href}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-800/60"
                  >
                    <span className="text-slate-400">
                      {s.label}
                      {s.provisional ? (
                        <span className="ml-2 text-[10px] uppercase text-slate-600">
                          provisional
                        </span>
                      ) : null}
                    </span>
                    <span className="font-medium text-white">
                      {s.value == null ? "—" : s.value}
                    </span>
                  </Link>
                ) : (
                  <div className="flex items-center justify-between px-2 py-1.5 text-sm">
                    <span className="text-slate-400">{s.label}</span>
                    <span className="font-medium text-white">
                      {s.value == null ? "—" : s.value}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {profileGaps.length > 0 ? (
        <section className="dg-card border-amber-500/20">
          <h2 className="font-semibold text-white">Profile gaps</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-300">
            {profileGaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
          <Link
            href="/dashboard/business"
            className="mt-4 inline-block text-sm text-sky-400 hover:underline"
          >
            Update Business Profile →
          </Link>
        </section>
      ) : null}

      <WebsiteSignalsPanel
        websiteUrl={websiteUrl}
        auditedAt={auditedAt}
        probes={probes}
        findings={findings}
        scanLabel="Scan website presence"
      />

      <section className="dg-card">
        <h2 className="font-semibold text-white">Aida recommendations</h2>
        <p className="mt-2 text-sm text-slate-400">
          Generate recommendations from your live Business Health and website audit evidence.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void generateBrief()}
            disabled={loading}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate recommendations"}
          </button>
          <Link
            href="/dashboard/advisor"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-sky-500"
          >
            Ask Aida
          </Link>
        </div>
        {report ? (
          <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-200">
            {report}
          </pre>
        ) : null}
      </section>
    </div>
  );
}
