"use client";

import { useState } from "react";

const promptClasses = [
  "branded",
  "category",
  "commercial_intent",
  "comparison",
  "recommendation",
  "local",
  "problem_solution",
  "informational",
] as const;

type PromptItem = {
  id: string;
  promptClass: string;
  promptText: string;
  topic: string | null;
  status: string;
  source: string;
};

type Suggestion = {
  promptClass: string;
  promptText: string;
  rationale: string;
};

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function AiVisibilityPromptsManager({
  initialItems,
  suggestions,
}: {
  initialItems: PromptItem[];
  suggestions: Suggestion[];
}) {
  const [items, setItems] = useState(initialItems);
  const [promptText, setPromptText] = useState("");
  const [promptClass, setPromptClass] = useState<(typeof promptClasses)[number]>("category");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addPrompt(candidate?: Suggestion) {
    const text = (candidate?.promptText ?? promptText).trim();
    const klass = candidate?.promptClass ?? promptClass;
    if (!text) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/ai-visibility/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptText: text,
          promptClass: klass,
          rationale: candidate?.rationale,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json?.error?.message ?? "Could not add prompt.");
        return;
      }
      setItems((current) => [...current, json.data]);
      if (!candidate) setPromptText("");
    } catch {
      setError("Could not add prompt. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const configured = new Set(items.map((item) => item.promptText.toLowerCase()));

  return (
    <div className="space-y-5">
      <section className="dg-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-white">Governed prompt set</h2>
            <p className="mt-1 text-sm text-slate-400">
              Only prompts you approve here become eligible for future monitoring.
            </p>
          </div>
          <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400">
            {items.filter((item) => item.status === "active").length} active
          </span>
        </div>

        {items.length ? (
          <div className="mt-4 space-y-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/35 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-200">
                    {label(item.promptClass)}
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-slate-600">{item.status}</span>
                </div>
                <p className="mt-2 text-sm text-slate-200">{item.promptText}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            No prompts are configured yet. Suggestions below are generated from Business Profile context but are not monitored until you add them.
          </p>
        )}
      </section>

      {suggestions.length ? (
        <section className="dg-card">
          <h2 className="font-semibold text-white">Business-grounded suggestions</h2>
          <p className="mt-1 text-xs text-slate-500">Suggestions are candidates only. Adding one governs it into the monitored set.</p>
          <div className="mt-4 space-y-2">
            {suggestions.filter((item) => !configured.has(item.promptText.toLowerCase())).map((item) => (
              <div key={`${item.promptClass}:${item.promptText}`} className="flex flex-col gap-3 rounded-xl border border-slate-800 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-violet-300">{label(item.promptClass)}</p>
                  <p className="mt-1 text-sm text-slate-200">{item.promptText}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.rationale}</p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void addPrompt(item)}
                  className="shrink-0 rounded-lg border border-violet-500/40 px-3 py-2 text-xs font-medium text-violet-200 hover:bg-violet-500/10 disabled:opacity-50"
                >
                  Add prompt
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="dg-card">
        <h2 className="font-semibold text-white">Add a prompt</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto]">
          <select
            value={promptClass}
            onChange={(event) => setPromptClass(event.target.value as (typeof promptClasses)[number])}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          >
            {promptClasses.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
          <input
            value={promptText}
            onChange={(event) => setPromptText(event.target.value)}
            placeholder="e.g. best CRM and AI automation platform Australia"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
          />
          <button
            type="button"
            disabled={saving || !promptText.trim()}
            onClick={() => void addPrompt()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-amber-300" role="status">{error}</p> : null}
      </section>
    </div>
  );
}
