"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ObservationResult = {
  provider: string;
  model: string;
  brandMentioned: boolean;
  competitorMentions: number;
};

type RunResult = {
  source: string;
  observedBusiness: string;
  observations: ObservationResult[];
  limitations: string[];
};

export function AiVisibilityMonitorRunner({ activePrompts }: { activePrompts: number }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  async function runObservation() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/v1/ai-visibility/monitoring/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxPrompts: 3 }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json?.error?.message ?? "The observation could not run. Try again.");
        return;
      }
      setResult(json.data as RunResult);
      router.refresh();
    } catch {
      setError("DigitalGate could not reach the observation service. Check your connection and try again.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">Measure now</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Run a real AI model observation</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            DigitalGate will ask up to three of your approved prompts using the configured AI model, capture the returned answers and record whether your business and configured competitors were actually mentioned.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            This is model-API evidence, not a claim about the consumer ChatGPT, Gemini, Copilot or Perplexity interfaces. Citations and recommendation positions remain unavailable unless they are genuinely captured.
          </p>
        </div>

        {activePrompts > 0 ? (
          <button
            type="button"
            disabled={running}
            onClick={() => void runObservation()}
            className="shrink-0 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? "Observing…" : "Run observation"}
          </button>
        ) : (
          <Link
            href="/apps/ai-visibility/prompts"
            className="shrink-0 rounded-lg bg-violet-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-violet-500"
          >
            Set up prompts
          </Link>
        )}
      </div>

      {activePrompts === 0 ? (
        <p className="mt-4 text-sm text-amber-200">
          Add at least one approved prompt first. DigitalGate will bring you straight back here once there is something truthful to measure.
        </p>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3" role="status">
          <p className="text-sm text-amber-200">{error}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={running}
              onClick={() => void runObservation()}
              className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/10 disabled:opacity-50"
            >
              Try again
            </button>
            <Link href="/apps/ai-visibility/prompts" className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800/60">
              Check prompts
            </Link>
            <Link href="/apps/ai/advisor?context=AI%20Visibility" className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800/60">
              Ask Aida for help
            </Link>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4" role="status">
          <p className="text-sm font-medium text-emerald-200">
            Observation complete — {result.observations.length} response{result.observations.length === 1 ? "" : "s"} captured for {result.observedBusiness}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
            {[...new Set(result.observations.map((item) => `${item.provider} · ${item.model}`))].map((label) => (
              <span key={label} className="rounded-full border border-slate-700 px-2.5 py-1">{label}</span>
            ))}
            <span className="rounded-full border border-slate-700 px-2.5 py-1">
              {result.observations.filter((item) => item.brandMentioned).length}/{result.observations.length} mentioned your business
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">The evidence coverage and AI Presence score above will now use these persisted observations.</p>
        </div>
      ) : null}
    </section>
  );
}
