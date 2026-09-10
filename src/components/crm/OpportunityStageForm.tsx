"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OpportunityStageForm({
  opportunityId,
  initialStage,
}: {
  opportunityId: string;
  initialStage: string;
}) {
  const router = useRouter();
  const [stage, setStage] = useState(initialStage.replace(/_/g, " "));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);

    const res = await fetch(`/api/v1/opportunities/${opportunityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);

    if (!res.ok) {
      setError(json.error?.message ?? "Could not update stage");
      return;
    }

    const nextStage = typeof json.data?.stage === "string" ? json.data.stage : stage;
    setStage(nextStage.replace(/_/g, " "));
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mt-5 border-t border-slate-800 pt-4">
      <label className="block text-sm">
        <span className="text-slate-400">Stage</span>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <input
            value={stage}
            onChange={(event) => {
              setStage(event.target.value);
              setSaved(false);
            }}
            maxLength={80}
            required
            placeholder="e.g. qualified"
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none placeholder:text-slate-600 focus:border-sky-500"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
          >
            {pending ? "Updating…" : "Update stage"}
          </button>
        </div>
      </label>
      <p className="mt-2 text-xs text-slate-500">
        Use the stage names that match this organisation’s sales workflow.
      </p>
      {saved ? <p className="mt-2 text-sm text-emerald-300">Stage updated.</p> : null}
      {error ? <p className="mt-2 text-sm text-amber-300">{error}</p> : null}
    </form>
  );
}
