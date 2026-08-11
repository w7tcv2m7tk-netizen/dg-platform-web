"use client";

import { useState } from "react";
import Link from "next/link";

type IntelligenceResult = {
  question: string;
  answer: string;
  confidence: "confirmed" | "likely" | "unknown";
  confidenceLabel: string;
  citations: Array<{
    relativePath: string;
    slug: string;
    title: string;
    heading: string | null;
    href: string;
  }>;
  retrieved: Array<{
    relativePath: string;
    slug: string;
    title: string;
    heading: string | null;
    score: number;
    href: string;
    excerpt: string;
  }>;
  source: "llm" | "empty_retrieval" | "no_llm";
  provider?: string;
  model?: string;
  latencyMs?: number;
  generatedAt: string;
};

const EXAMPLES = [
  "What is Platform Intelligence Phase 1?",
  "How does Command Centre relate to the Opportunity Engine?",
  "What is the product split between DigitalGate AI and Platform AI?",
];

function confidenceStyles(confidence: IntelligenceResult["confidence"]) {
  switch (confidence) {
    case "confirmed":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";
    case "likely":
      return "border-amber-500/40 bg-amber-500/10 text-amber-100";
    default:
      return "border-rose-500/40 bg-rose-500/10 text-rose-100";
  }
}

export function PlatformIntelligencePanel() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IntelligenceResult | null>(null);

  async function ask(q?: string) {
    const next = (q ?? question).trim();
    if (!next) return;
    setQuestion(next);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/command/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error?.message || `Request failed (${res.status})`);
      }
      setResult(json.data as IntelligenceResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-4">
        <label className="block text-sm">
          <span className="text-slate-400">Ask about DigitalGate itself</span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            placeholder="e.g. What confidence levels does Platform Intelligence use?"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-600"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void ask();
              }
            }}
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void ask()}
            disabled={loading || !question.trim()}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {loading ? "Retrieving…" : "Ask"}
          </button>
          <p className="text-xs text-slate-500">
            Curated allowlist only · citations required · ⌘/Ctrl+Enter
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => void ask(ex)}
              disabled={loading}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-left text-xs text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Answer</h2>
              <span
                className={`rounded-lg border px-3 py-1 text-sm font-medium ${confidenceStyles(result.confidence)}`}
              >
                {result.confidenceLabel}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {result.source}
              {result.provider ? ` · ${result.provider}` : ""}
              {result.model ? ` / ${result.model}` : ""}
              {result.latencyMs != null ? ` · ${result.latencyMs}ms` : ""}
            </p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
              {result.answer}
            </p>
          </div>

          {result.citations.length > 0 ? (
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-4">
              <h3 className="text-sm font-semibold text-white">Citations</h3>
              <ul className="mt-3 space-y-2">
                {result.citations.map((c) => (
                  <li key={`${c.relativePath}:${c.heading ?? ""}`}>
                    <Link
                      href={c.href}
                      className="text-sm text-sky-400 hover:underline"
                    >
                      docs/{c.relativePath}
                      {c.heading ? ` — ${c.heading}` : ""}
                    </Link>
                    <span className="ml-2 text-xs text-slate-500">{c.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.retrieved.length > 0 ? (
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-4">
              <h3 className="text-sm font-semibold text-white">Retrieved sources</h3>
              <p className="mt-1 text-xs text-slate-500">
                Keyword / chunk score over the allowlisted corpus (no vector DB).
              </p>
              <ul className="mt-3 space-y-3">
                {result.retrieved.map((r) => (
                  <li
                    key={`${r.slug}:${r.heading ?? ""}:${r.score}`}
                    className="border-b border-slate-800/80 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link
                        href={r.href}
                        className="text-sm font-medium text-sky-400 hover:underline"
                      >
                        {r.title}
                        {r.heading ? ` · ${r.heading}` : ""}
                      </Link>
                      <span className="text-xs text-slate-500">
                        score {r.score.toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">docs/{r.relativePath}</p>
                    <p className="mt-2 line-clamp-3 text-sm text-slate-400">{r.excerpt}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
