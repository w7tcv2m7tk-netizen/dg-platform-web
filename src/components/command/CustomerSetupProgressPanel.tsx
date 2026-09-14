"use client";

import { useEffect, useState } from "react";

type SetupData = {
  percentComplete: number;
  currentStepLabel: string;
  updatedAt: string | null;
  completedAt: string | null;
  founding: boolean;
  steps: Array<{ id: string; label: string; complete: boolean; current: boolean }>;
  checklist: Array<{ id: string; label: string; optional: boolean; complete: boolean }>;
};

export function CustomerSetupProgressPanel({ organisationId }: { organisationId: string }) {
  const [data, setData] = useState<SetupData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/command/clients/${encodeURIComponent(organisationId)}/setup`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error?.message ?? "Unable to load setup progress");
        return json.data as SetupData;
      })
      .then((next) => !cancelled && setData(next))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Unable to load setup progress"));
    return () => { cancelled = true; };
  }, [organisationId]);

  return (
    <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Setup progress</h2>
          <p className="mt-1 text-xs text-slate-500">Live Gen 2 onboarding and implementation completion for this customer.</p>
        </div>
        {data ? <p className="text-2xl font-semibold tabular-nums text-white">{data.percentComplete}%</p> : null}
      </div>
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      {!data && !error ? <p className="mt-3 text-sm text-slate-500">Loading setup progress…</p> : null}
      {data ? (
        <>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800" aria-label={`Setup ${data.percentComplete}% complete`}>
            <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${data.percentComplete}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
            <span>{data.completedAt ? "Setup complete" : `Current: ${data.currentStepLabel}`}</span>
            {data.founding ? <span>Founding customer</span> : null}
            {data.updatedAt ? <span>Updated {new Date(data.updatedAt).toLocaleDateString("en-AU")}</span> : null}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.steps.map((step) => (
              <div key={step.id} className={`rounded-lg border px-3 py-2 text-sm ${step.complete ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200" : step.current ? "border-sky-500/30 bg-sky-500/5 text-sky-200" : "border-slate-800 text-slate-500"}`}>
                <span className="mr-2">{step.complete ? "✓" : step.current ? "→" : "○"}</span>{step.label}
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-slate-800 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Activation checklist</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.checklist.map((item) => (
                <span key={item.id} className={`rounded-full border px-2.5 py-1 text-xs ${item.complete ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200" : "border-slate-700 text-slate-500"}`}>
                  {item.complete ? "✓ " : ""}{item.label}{item.optional ? " · optional" : ""}
                </span>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
