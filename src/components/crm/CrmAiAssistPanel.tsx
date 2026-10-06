"use client";

import { useState } from "react";

type CrmAiAction =
  | "lead_follow_up"
  | "lead_summary"
  | "opportunity_follow_up"
  | "opportunity_summary"
  | "contact_follow_up"
  | "contact_summary";

export function CrmAiAssistPanel({
  leadId,
  opportunityId,
  contactId,
  variant = "lead",
}: {
  leadId?: string;
  opportunityId?: string;
  contactId?: string;
  variant?: "lead" | "opportunity" | "contact";
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"llm" | "template" | null>(null);
  const [runLocal, setRunLocal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const actions: Array<[CrmAiAction, string]> =
    variant === "opportunity"
      ? [
          ["opportunity_follow_up", "Draft follow-up"],
          ["opportunity_summary", "Summarise opportunity"],
        ]
      : variant === "contact"
        ? [
            ["contact_follow_up", "Draft follow-up"],
            ["contact_summary", "Summarise contact"],
          ]
        : [
            ["lead_follow_up", "Draft follow-up"],
            ["lead_summary", "Summarise lead"],
          ];

  async function run(action: CrmAiAction) {
    setLoading(action);
    setError(null);
    setOutput(null);
    setSource(null);
    setPendingStatus(null);
    const res = await fetch("/api/v1/ai/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        leadId,
        opportunityId,
        contactId,
        ...(runLocal ? { executionLane: "local_routine", idempotencyKey: crypto.randomUUID() } : {}),
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setLoading(null);
      setError("AI Assist could not complete that request. Please try again.");
      return;
    }
    if (json?.data?.accepted && typeof json.data.statusUrl === "string") {
      setPendingStatus("queued");
      for (let attempt = 0; attempt < 150; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        try {
          const status = await fetch(json.data.statusUrl, { cache: "no-store" });
          const statusJson = await status.json();
          const item = statusJson?.data;
          if (!status.ok || !item) continue;
          setPendingStatus(item.status as string);
          if (["succeeded", "failed", "cancelled", "expired"].includes(item.status)) {
            setOutput(item.status === "succeeded" && typeof item.result === "string" ? item.result : (json.data.fallbackOutput as string));
            setSource(item.status === "succeeded" && typeof item.result === "string" ? "llm" : "template");
            setPendingStatus(null);
            setLoading(null);
            return;
          }
        } catch { /* continue polling within the job lifetime */ }
      }
      setOutput(json.data.fallbackOutput as string);
      setSource("template");
      setPendingStatus(null);
      setLoading(null);
      return;
    }
    setLoading(null);
    setOutput(json.data.output as string);
    setSource((json.data.source as "llm" | "template") ?? "template");
  }

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="dg-card">
      <h2 className="font-semibold text-white">AI assist</h2>
      <p className="mt-1 text-sm text-slate-400">
        Draft a follow-up or summarise this record using your Business Profile voice and available business context.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map(([action, label]) => (
          <button
            key={action}
            type="button"
            disabled={loading !== null}
            onClick={() => void run(action)}
            className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-blue-500 hover:text-white disabled:opacity-50"
          >
            {loading === action ? "Generating…" : label}
          </button>
        ))}
      </div>
      {variant === "lead" ? (
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={runLocal} onChange={(event) => setRunLocal(event.target.checked)} disabled={loading !== null} />
          Run asynchronously on the organisation’s explicitly approved Mac
        </label>
      ) : null}
      {pendingStatus ? <p className="mt-3 text-xs text-slate-400">Local request: {pendingStatus}</p> : null}
      {error ? <p className="mt-3 text-sm text-amber-400">{error}</p> : null}
      {output ? (
        <div className="mt-4 space-y-2">
          {source ? (
            <p className="text-xs text-slate-500">
              {source === "llm" ? "Live AI draft" : "DigitalGate draft"}
            </p>
          ) : null}
          <pre className="max-h-72 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm whitespace-pre-wrap text-slate-300">
            {output}
          </pre>
          <button
            type="button"
            onClick={() => void copyOutput()}
            className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:border-blue-500"
          >
            Copy
          </button>
        </div>
      ) : null}
    </div>
  );
}
