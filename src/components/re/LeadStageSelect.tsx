"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STAGES = [
  { id: "vendor_lead", label: "Vendor Lead" },
  { id: "appraisal", label: "Appraisal" },
  { id: "listing", label: "Listing" },
  { id: "sale", label: "Sale" },
  { id: "settlement", label: "Settlement" },
  { id: "past_client", label: "Past Client" },
] as const;

export function LeadStageSelect({
  leadId,
  currentStage,
}: {
  leadId: string;
  currentStage: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onChange(stage: string) {
    setPending(true);
    await fetch("/api/v1/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, stage }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <select
      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
      value={currentStage}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
    >
      {STAGES.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
