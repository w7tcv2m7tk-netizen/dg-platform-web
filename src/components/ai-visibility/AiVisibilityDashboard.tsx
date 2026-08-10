"use client";

import Link from "next/link";
import { useState } from "react";

import { useChatWidget } from "@/components/platform/ChatWidgetProvider";

export interface AiVisibilityScoreRow {
  id: string;
  label: string;
  value: number;
  href?: string;
}

type PresenceFinding = {
  domain: string;
  severity: string;
  title: string;
  detail: string;
  recommendedAction?: string;
};

type PresenceScanResult = {
  scores: { aiVisibility: number; seo: number };
  findings: PresenceFinding[];
  websiteUrl: string | null;
  auditedAt: string;
};

function severityClass(severity: string) {
  switch (severity) {
    case "critical":
      return "text-red-400";
    case "warning":
      return "text-amber-400";
    default:
      return "text-blue-400";
  }
}

export function AiVisibilityDashboard({
  aiVisibilityScore,
  businessHealth,
  scoreBreakdown,
  profileGaps,
}: {
  aiVisibilityScore: number;
  businessHealth: number;
  scoreBreakdown: AiVisibilityScoreRow[];
  profileGaps: string[];
}) {
  const { openSupportChat } = useChatWidget();
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<PresenceScanResult | null>(null);

  async function generateBrief() {
    setLoading(true);
    const res = await fetch("/api/v1/ai/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "briefing" }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (json.data?.output) {
      setReport(json.data.output);
    }
  }

  async function runPresenceScan() {
    setScanLoading(true);
    setScanError(null);
    try {
      const res = await fetch("/api/v1/seo/audit", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setScanError(json?.error?.message ?? "Scan failed");
        return;
      }
      const data = json.data;
      const relevantFindings = (data.findings as PresenceFinding[]).filter((f) =>
        ["ai_visibility", "seo"].includes(f.domain),
      );
      setScanResult({
        scores: {
          aiVisibility: data.scores.aiVisibility,
          seo: data.scores.seo,
        },
        findings: relevantFindings,
        websiteUrl: data.websiteUrl,
        auditedAt: data.auditedAt,
      });
    } catch {
      setScanError("Network error — try again");
    } finally {
      setScanLoading(false);
    }
  }

  const tier =
    aiVisibilityScore >= 85 ? "Strong" : aiVisibilityScore >= 70 ? "Moderate" : "Needs work";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="dg-card lg:col-span-1">
          <p className="text-xs uppercase tracking-wide text-slate-500">AI Visibility Score</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-5xl font-bold text-white">{aiVisibilityScore}</span>
            <span className="pb-2 text-lg text-slate-500">/ 100</span>
          </div>
          <p className="mt-1 text-sm text-blue-400">{tier} — profile-aware scoring</p>
          <p className="mt-3 text-xs text-slate-500">
            Business Health: {businessHealth}/100
          </p>
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
        </div>
      </div>

      {profileGaps.length > 0 ? (
        <section className="dg-card border-amber-500/20">
          <h2 className="font-semibold text-white">Profile gaps affecting score</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-300">
            {profileGaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
          <Link
            href="/dashboard/business"
            className="mt-4 inline-block text-sm text-blue-400 hover:underline"
          >
            Update Business Profile →
          </Link>
        </section>
      ) : null}

      <section className="dg-card">
        <h2 className="font-semibold text-white">Presence scan</h2>
        <p className="mt-2 text-sm text-slate-400">
          Run a live website probe to refresh AI visibility and SEO signals from observable HTML.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runPresenceScan}
            disabled={scanLoading}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {scanLoading ? "Scanning…" : "Scan website presence"}
          </button>
          <Link
            href="/apps/seo/audit"
            className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-blue-500"
          >
            Full SEO audit →
          </Link>
        </div>
        {scanError ? <p className="mt-3 text-sm text-red-400">{scanError}</p> : null}
        {scanResult ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-slate-500">AI visibility</p>
                <p className="text-2xl font-bold text-white">{scanResult.scores.aiVisibility}</p>
              </div>
              <div>
                <p className="text-slate-500">SEO</p>
                <p className="text-2xl font-bold text-white">{scanResult.scores.seo}</p>
              </div>
              {scanResult.websiteUrl ? (
                <div>
                  <p className="text-slate-500">URL</p>
                  <p className="text-white">{scanResult.websiteUrl}</p>
                </div>
              ) : null}
            </div>
            {scanResult.findings.length ? (
              <ul className="space-y-2">
                {scanResult.findings.map((f, i) => (
                  <li
                    key={`${f.title}-${i}`}
                    className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
                  >
                    <span className={`font-medium ${severityClass(f.severity)}`}>{f.severity}</span>
                    <span className="ml-2 text-xs uppercase text-slate-600">{f.domain}</span>
                    <p className="mt-1 font-medium text-white">{f.title}</p>
                    <p className="text-slate-400">{f.detail}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No AI visibility or SEO findings in this scan.</p>
            )}
          </div>
        ) : null}
      </section>

      <section className="dg-card">
        <h2 className="font-semibold text-white">AI recommendations</h2>
        <p className="mt-2 text-sm text-slate-400">
          Generate a visibility briefing from your live Digital Twin scores.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={generateBrief}
            disabled={loading}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate briefing"}
          </button>
          <button
            type="button"
            onClick={() =>
              openSupportChat(
                "Analyse my AI Visibility score and recommend the top 3 actions to improve discoverability in AI search.",
              )
            }
            className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-blue-500"
          >
            Ask AI advisor
          </button>
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
