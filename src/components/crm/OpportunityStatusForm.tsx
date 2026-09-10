"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OpportunityStatus = "open" | "won" | "lost";

export function OpportunityStatusForm({
  opportunityId,
  initialStatus,
  initialLostReason,
}: {
  opportunityId: string;
  initialStatus: OpportunityStatus;
  initialLostReason?: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OpportunityStatus>(initialStatus);
  const [lostReason, setLostReason] = useState(initialLostReason ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setPending(true);
    setError(null);
    setSaved(false);

    const res = await fetch(`/api/v1/opportunities/${opportunityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        lostReason: status === "lost" ? lostReason : undefined,
      }),
    });
    const json = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) {
      const message =
        typeof json?.error?.message === "string"
          ? json.error.message
          : "Could not update opportunity status.";
      setError(message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <div className="mt-5 border-t border-slate-800 pt-4">
      <h3 className="text-sm font-medium text-white">Outcome</h3>
      <p className="mt-1 text-xs text-slate-500">
        Keep the opportunity open, mark it won, or record why it was lost.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
        <label className="block text-sm">
          <span className="text-slate-400">Status</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as OpportunityStatus);
              setSaved(false);
            }}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          >
            <option value="open">Open</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
        </label>

        {status === "lost" ? (
          <label className="block text-sm">
            <span className="text-slate-400">Reason lost</span>
            <input
              value={lostReason}
              onChange={(event) => {
                setLostReason(event.target.value);
                setSaved(false);
              }}
              maxLength={500}
              placeholder="e.g. timing, budget, chose another provider"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none placeholder:text-slate-600 focus:border-sky-500"
            />
          </label>
        ) : (
          <div className="hidden sm:block" />
        )}

        <button
          type="button"
          onClick={() => void save()}
          disabled={pending || (status === "lost" && !lostReason.trim())}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving…" : "Update status"}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-amber-400">{error}</p> : null}
      {saved ? <p className="mt-2 text-sm text-emerald-300">Opportunity status updated.</p> : null}
    </div>
  );
}
