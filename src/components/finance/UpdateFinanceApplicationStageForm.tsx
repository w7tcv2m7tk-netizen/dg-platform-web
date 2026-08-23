"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpdateFinanceApplicationStageForm({
  applicationId,
  currentStage,
  stages,
}: {
  applicationId: string;
  currentStage: string;
  stages: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [stage, setStage] = useState(currentStage);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(next: string) {
    setStage(next);
    setPending(true);
    setError(null);
    const res = await fetch("/api/v1/finance/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: applicationId, stage: next }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not update stage");
      setStage(currentStage);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={stage}
        disabled={pending}
        onChange={(e) => void onChange(e.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white disabled:opacity-50"
      >
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
        {!stages.some((s) => s.id === currentStage) ? (
          <option value={currentStage}>{currentStage}</option>
        ) : null}
      </select>
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  );
}
