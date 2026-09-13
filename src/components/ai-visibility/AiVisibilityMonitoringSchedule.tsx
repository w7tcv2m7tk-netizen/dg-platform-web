"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ScheduleSettings = {
  enabled: boolean;
  cadence: "weekly";
  maxPromptsPerRun: number;
  updatedAt: string | null;
  lastAttemptAt: string | null;
  lastCompletedAt: string | null;
  lastRunStatus: "success" | "failed" | null;
  lastError: string | null;
};

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Brisbane",
  }).format(date);
}

export function AiVisibilityMonitoringSchedule({ activePrompts }: { activePrompts: number }) {
  const [settings, setSettings] = useState<ScheduleSettings | null>(null);
  const [maxPrompts, setMaxPrompts] = useState(3);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/v1/ai-visibility/monitoring/schedule", { cache: "no-store" });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json?.error?.message ?? "Monitoring settings could not load");
        if (!cancelled) {
          setSettings(json.data as ScheduleSettings);
          setMaxPrompts(Math.max(1, Math.min(3, Number(json.data?.maxPromptsPerRun) || 3)));
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Monitoring settings could not load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(enabled: boolean) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/ai-visibility/monitoring/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, maxPromptsPerRun: maxPrompts }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json?.error?.message ?? "Monitoring settings could not be saved");
        return;
      }
      setSettings(json.data as ScheduleSettings);
      setMaxPrompts(Math.max(1, Math.min(3, Number(json.data?.maxPromptsPerRun) || maxPrompts)));
    } catch {
      setError("DigitalGate could not save monitoring settings. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="mt-5 border-t border-violet-500/15 pt-4 text-xs text-slate-500">Loading recurring monitoring settings…</p>;
  }

  const enabled = settings?.enabled === true;
  const lastCompleted = formatDate(settings?.lastCompletedAt ?? null);
  const lastAttempt = formatDate(settings?.lastAttemptAt ?? null);

  return (
    <div className="mt-5 border-t border-violet-500/15 pt-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Weekly monitoring</h3>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${enabled ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-slate-700 text-slate-400"}`}>
              {enabled ? "Enabled" : "Off"}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Opt in to one scheduled observation batch each week. DigitalGate rotates through unobserved and stale governed prompts and never runs more than the limit you choose below.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Scheduled runs make real configured model API calls. They remain model-API evidence, not consumer ChatGPT, Gemini, Copilot or Perplexity interface rankings. If provider access fails, no observation is invented and the scheduler waits until the next weekly window rather than retrying every day.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end">
          <label className="text-xs text-slate-400">
            Max prompts per weekly run
            <select
              value={maxPrompts}
              disabled={saving}
              onChange={(event) => setMaxPrompts(Number(event.target.value))}
              className="mt-1 block min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white"
            >
              <option value={1}>1 prompt</option>
              <option value={2}>2 prompts</option>
              <option value={3}>3 prompts</option>
            </select>
          </label>
          <button
            type="button"
            disabled={saving || (!enabled && activePrompts === 0)}
            onClick={() => void save(!enabled)}
            className="min-h-11 rounded-lg border border-violet-400/30 px-4 text-sm font-semibold text-violet-100 hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : enabled ? "Turn off" : "Enable weekly monitoring"}
          </button>
        </div>
      </div>

      {!enabled && activePrompts === 0 ? (
        <p className="mt-3 text-xs text-amber-200">
          Weekly monitoring needs at least one active governed prompt. <Link href="/apps/ai-visibility/prompts" className="font-medium underline">Set up prompts →</Link>
        </p>
      ) : null}

      {enabled ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full border border-slate-800 px-2.5 py-1">Weekly cadence</span>
          <span className="rounded-full border border-slate-800 px-2.5 py-1">Maximum {settings?.maxPromptsPerRun ?? maxPrompts} prompt{(settings?.maxPromptsPerRun ?? maxPrompts) === 1 ? "" : "s"}</span>
          {lastCompleted ? <span className="rounded-full border border-slate-800 px-2.5 py-1">Last completed {lastCompleted}</span> : null}
          {!lastCompleted && lastAttempt ? <span className="rounded-full border border-slate-800 px-2.5 py-1">Last attempted {lastAttempt}</span> : null}
        </div>
      ) : null}

      {settings?.lastRunStatus === "failed" && settings.lastError ? (
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100/90">
          <p>Last scheduled run did not complete: {settings.lastError}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button type="button" disabled={saving} onClick={() => void save(enabled)} className="font-medium underline disabled:opacity-50">Save settings again</button>
            <Link href="/apps/ai/advisor?context=AI%20Visibility%20monitoring" className="font-medium underline">Ask Aida for help</Link>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100/90" role="status">
          {error}. Organisation administrators can manage recurring monitoring. <Link href="/apps/ai/advisor?context=AI%20Visibility%20monitoring" className="font-medium underline">Get help →</Link>
        </div>
      ) : null}
    </div>
  );
}
