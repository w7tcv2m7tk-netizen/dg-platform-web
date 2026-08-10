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

  async function onChange(next: string) {
    setStage(next);
    setPending(true);
    await fetch(`/api/v1/services/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: next }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <select
      value={stage}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
    >
      {stages.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
