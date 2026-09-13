"use client";

import { useState } from "react";

import type { SeoRecurringMonitoringSettings } from "@dg/platform-core";

export function SeoMonitoringControls({ initial }: { initial: SeoRecurringMonitoringSettings }) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setEnabled(enabled: boolean) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/seo/monitoring/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? "Could not update SEO monitoring");
      }
      setSettings(payload.data as SeoRecurringMonitoringSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update SEO monitoring");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dg-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Recurring monitoring</p>
          <h2 className="mt-1 font-semibold text-white">Weekly live SEO audit</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            When enabled, DigitalGate checks the organisation website weekly and persists fresh SEO evidence. Scheduled runs inspect the public website only; private Website Studio content is not loaded by the scheduler.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled(!settings.enabled)}
          disabled={saving}
          className={settings.enabled
            ? "rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            : "rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"}
        >
          {saving ? "Saving…" : settings.enabled ? "Monitoring enabled" : "Enable weekly monitoring"}
        </button>
      </div>
      <div className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-3">
        <p>Cadence: weekly</p>
        <p>Last completed: {settings.lastCompletedAt ? new Date(settings.lastCompletedAt).toLocaleString("en-AU") : "Not yet"}</p>
        <p>Last status: {settings.lastRunStatus ?? "Not yet run"}</p>
      </div>
      {settings.lastRunStatus === "failed" ? (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          The last scheduled audit did not complete. Run a manual audit to verify the site now, or try the next scheduled check.
        </p>
      ) : null}
      {error ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          <span>We couldn’t update monitoring. {error}</span>
          <button type="button" onClick={() => setEnabled(!settings.enabled)} className="font-semibold underline" disabled={saving}>Retry</button>
        </div>
      ) : null}
    </div>
  );
}
