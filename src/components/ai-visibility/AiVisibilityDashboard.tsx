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
