"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpdateJobStageForm({
  jobId,
  currentStage,
  stages,
}: {
  jobId: string;
  currentStage: string;
  stages: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [stage, setStage] = useState(currentStage);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(next: string) {
    const prev = stage;
    setStage(next);
    setPending(true);
    setError(null);
    const res = await fetch(`/api/v1/services/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: next }),
    });
    setPending(false);
    if (!res.ok) {
      setStage(prev);
      const json = await res.json().catch(() => ({}));
      setError(json.error?.message ?? "Could not update stage");
      return;
    }
    router.refresh();
  }

  const known = stages.some((s) => s.id === stage);

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={stage}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
      >
        {!known ? (
          <option value={stage}>{stage.replace(/_/g, " ")}</option>
        ) : null}
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
