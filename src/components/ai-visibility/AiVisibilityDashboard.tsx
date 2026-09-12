"use client";

import Link from "next/link";
import { useState } from "react";

import { AiVisibilitySectionNav } from "@/components/ai-visibility/AiVisibilitySectionNav";
import { WebsiteSignalsPanel } from "@/components/seo/WebsiteSignalsPanel";
import type {
  WebsiteSignalFinding,
  WebsiteSignalProbes,
} from "@/components/seo/WebsiteSignalsPanel";
import type {
  AiReadinessDimension,
  AiVisibilityHistoryPoint,
} from "@/lib/ai-visibility-data";

export interface AiVisibilityScoreRow {
  id: string;
  label: string;
  value: number | null;
  href?: string;
  provisional?: boolean;
}

function ScoreValue({ value }: { value: number | null }) {
  return (
    <span className="font-medium text-white">
      {value == null ? "Unavailable" : `${value}/100`}
    </span>
  );
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
  history,
  readinessDimensions,
  expectedHost,
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
  history: AiVisibilityHistoryPoint[];
  readinessDimensions: AiReadinessDimension[];
  expectedHost: string | null;
}) {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function askAidaAboutVisibility() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/ai/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextLabel: "AI Visibility",
          question:
            "Review my current AI Visibility position using the Business Brain, live business signals and website evidence available to DigitalGate. Treat the current measured website score as AI Readiness, not verified cross-engine visibility. What should I fix first, why does it matter, and what should I do next? Do not invent ChatGPT, Gemini, Copilot, Google AI or Perplexity mention, citation, share-of-voice or ranking data.",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message ?? "Aida could not analyse AI Visibility right now.");
        return;
      }
      if (typeof json.data?.answer === "string" && json.data.answer.trim()) {
        setReport(json.data.answer);
      } else {
        setError("Aida returned no recommendation. Try again.");
      }
    } catch {
      setError("Could not reach Aida. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const tier =
    aiVisibilityScore == null
      ? "Not measured"
      : aiVisibilityScore >= 85
        ? "Strong"
        : aiVisibilityScore >= 70
          ? "Moderate"
          : "Needs work";

  const sourceLabel =
    scoreSource === "audit"
      ? "Measured from a fresh, domain-matched website presence audit"
      : scoreSource === "provisional"
        ? "Provisional — refresh the presence scan for current evidence"
        : "No domain-matched score yet — add the correct website and scan";

  const measuredLayers = aiVisibilityScore == null ? 0 : 1;

  return (
    <div className="space-y-6">
      <AiVisibilitySectionNav />

      <section className="overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-slate-950/70 to-sky-500/5 p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-violet-200">
                DigitalGate AI Visibility™
              </span>
              {expectedHost ? (
                <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400">
                  Domain · {expectedHost}
                </span>
              ) : null}
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Know whether AI can understand, trust and recommend your business.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              DigitalGate separates what we can verify today from what still needs live answer-engine monitoring. No synthetic citations, rankings or competitor visibility are added to the score.
            </p>
          </div>
          <div className="min-w-[230px] rounded-xl border border-slate-700/70 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Measured layer · AI Readiness</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-5xl font-bold text-white">
                {aiVisibilityScore == null ? "—" : aiVisibilityScore}
              </span>
              {aiVisibilityScore != null ? <span className="pb-2 text-lg text-slate-500">/100</span> : null}
            </div>
            <p className="mt-1 text-sm text-sky-300">{tier}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{sourceLabel}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: "AI Presence",
            value: null,
            detail: "Mentions and recommendations across monitored answer engines",
            href: "/apps/ai-visibility/presence",
          },
          {
            label: "AI Readiness",
            value: aiVisibilityScore,
            detail: "Machine readability and technical/entity signals",
            href: "/apps/ai-visibility/technical",
          },
          {
            label: "Authority",
            value: null,
            detail: "Evidence that trusted sources validate your entity",
            href: "/apps/ai-visibility/citations",
          },
          {
            label: "Citation Strength",
            value: null,
            detail: "Verified citations and source quality",
            href: "/apps/ai-visibility/citations",
          },
          {
            label: "Competitive Share",
            value: null,
            detail: "Share of voice against monitored competitors",
            href: "/apps/ai-visibility/competitors",
          },
        ].map((layer) => (
          <Link key={layer.label} href={layer.href} className="dg-card transition hover:border-violet-500/30">
            <p className="text-xs uppercase tracking-wide text-slate-500">{layer.label}</p>
            <div className="mt-3 text-2xl font-semibold text-white">
              {layer.value == null ? "—" : layer.value}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{layer.detail}</p>
          </Link>
        ))}
      </section>

      <section className="dg-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-white">Measurement coverage</h2>
            <p className="mt-1 text-sm text-slate-400">
              {measuredLayers}/5 flagship visibility layers currently have verified evidence.
            </p>
          </div>
          <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400">
            {measuredLayers * 20}% coverage
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-violet-500" style={{ width: `${measuredLayers * 20}%` }} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          The composite AI Visibility score will expand only as real Presence, Authority, Citation and Competitive Share evidence becomes available.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="dg-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">AI Readiness dimensions</h2>
              <p className="mt-1 text-xs text-slate-500">Transparent sub-scores from observable website evidence</p>
            </div>
            <Link href="/apps/ai-visibility/technical" className="text-xs text-violet-300 hover:underline">
              Methodology →
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {readinessDimensions.map((dimension) => (
              <div key={dimension.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-300">{dimension.label}</span>
                  <ScoreValue value={dimension.value} />
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-sky-500"
                    style={{ width: `${dimension.value ?? 0}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">{dimension.evidence}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">AI Readiness trend</h2>
          <p className="mt-1 text-xs text-slate-500">Domain-matched persisted audits only</p>
          {history.length ? (
            <div className="mt-4 space-y-3">
              {history.map((point) => (
                <div key={point.auditedAt} className="grid grid-cols-[92px_1fr_42px] items-center gap-3 text-xs">
                  <span className="text-slate-500">
                    {new Date(point.auditedAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short" })}
                  </span>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${point.value}%` }} />
                  </div>
                  <span className="text-right font-medium text-slate-200">{point.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Run a presence scan to start a verified trend for this domain.</p>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="dg-card lg:col-span-2">
          <h2 className="font-semibold text-white">Supporting evidence</h2>
          <p className="mt-1 text-xs text-slate-500">Related DigitalGate signals — not hidden ingredients in the AI Readiness score</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {scoreBreakdown.map((s) => (
              <li key={s.id}>
                <Link
                  href={s.href ?? "/apps/ai-visibility"}
                  className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2.5 text-sm hover:border-slate-700"
                >
                  <span className="text-slate-400">
                    {s.label}
                    {s.provisional ? <span className="ml-2 text-[10px] uppercase text-slate-600">provisional</span> : null}
                  </span>
                  <span className="font-medium text-white">{s.value == null ? "—" : s.value}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="dg-card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Business context</p>
          <div className="mt-3 text-3xl font-semibold text-white">{businessHealth == null ? "—" : businessHealth}</div>
          <p className="mt-1 text-sm text-slate-400">Business Health</p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Context only. Business Health is not blended into AI Readiness.
          </p>
        </section>
      </div>

      {profileGaps.length > 0 ? (
        <section className="dg-card border-amber-500/20">
          <h2 className="font-semibold text-white">Entity profile gaps</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-300">
            {profileGaps.map((gap) => <li key={gap}>{gap}</li>)}
          </ul>
          <Link href="/dashboard/business" className="mt-4 inline-block text-sm text-sky-400 hover:underline">
            Update Business Profile →
          </Link>
        </section>
      ) : null}

      <WebsiteSignalsPanel
        websiteUrl={websiteUrl}
        auditedAt={auditedAt}
        probes={probes}
        findings={findings}
        scanLabel="Refresh AI readiness scan"
      />

      <section className="dg-card border-violet-500/20">
        <h2 className="font-semibold text-white">Ask Aida what to do next</h2>
        <p className="mt-2 text-sm text-slate-400">
          Aida combines your Business Brain and verified DigitalGate evidence, while keeping unmeasured answer-engine visibility explicitly unavailable.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void askAidaAboutVisibility()}
            disabled={loading}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? "Aida is thinking…" : "Analyse with Aida"}
          </button>
          <Link href="/dashboard/advisor" className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-violet-500">
            Open Aida →
          </Link>
        </div>
        {error ? (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100" role="status">{error}</p>
        ) : null}
        {report ? (
          <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <p className="text-xs font-medium uppercase tracking-widest text-violet-300/80">Aida recommendation</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{report}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
