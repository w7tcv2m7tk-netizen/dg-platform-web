"use client";

import { useState } from "react";

type CrmAiAction =
  | "lead_follow_up"
  | "lead_summary"
  | "opportunity_follow_up"
  | "opportunity_summary";

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

  const actions: Array<[CrmAiAction, string]> =
    variant === "opportunity"
      ? [
          ["opportunity_follow_up", "Draft follow-up"],
          ["opportunity_summary", "Summarise opportunity"],
        ]
      : variant === "contact"
        ? [
            ["lead_follow_up", "Draft follow-up"],
            ["lead_summary", "Summarise contact"],
          ]
        : [
            ["lead_follow_up", "Draft follow-up"],
            ["lead_summary", "Summarise lead"],
          ];

  async function run(action: CrmAiAction) {
    setLoading(action);
    setError(null);
    setOutput(null);
    const res = await fetch("/api/v1/ai/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        leadId,
        opportunityId,
        contactId,
      }),
    });
    const json = await res.json().catch(() => null);
    setLoading(null);
    if (!res.ok) {
      setError(json?.error?.message ?? "Generation failed");
      return;
    }
    setOutput(json.data.output as string);
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
        Draft a follow-up or summarise this record using your Business Profile voice.
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
      {error ? <p className="mt-3 text-sm text-amber-400">{error}</p> : null}
      {output ? (
        <div className="mt-4 space-y-2">
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
