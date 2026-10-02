"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProspectQualificationActions({
  prospectId,
  canQualify,
}: {
  prospectId: string;
  canQualify: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"qualify" | "disqualify" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "qualify" | "disqualify") {
    if (action === "disqualify" && !window.confirm("Disqualify this prospect and close it from the active research queue?")) return;
    setPending(action);
    setError(null);
    try {
      const res = await fetch(`/api/v1/prospecting/prospects/${prospectId}/qualification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message || "Could not update qualification.");
      router.push(action === "qualify" ? "/apps/prospecting/today" : "/apps/prospecting/prospects");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update qualification.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={!canQualify || pending !== null} onClick={() => void act("qualify")}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
          {pending === "qualify" ? "Qualifying…" : "Qualify for outreach"}
        </button>
        <button type="button" disabled={pending !== null} onClick={() => void act("disqualify")}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 disabled:opacity-40">
          {pending === "disqualify" ? "Closing…" : "Disqualify"}
        </button>
      </div>
      {!canQualify ? <p className="text-xs text-amber-200">Identify the decision-maker and add a phone number or email before qualification.</p> : null}
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
