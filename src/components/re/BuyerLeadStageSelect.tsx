"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STAGES = [
  { id: "inquiry", label: "Inquiry" },
  { id: "qualified", label: "Qualified" },
  { id: "viewing", label: "Viewing" },
  { id: "offer", label: "Offer" },
  { id: "purchased", label: "Purchased" },
] as const;

export function BuyerLeadStageSelect({
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
      body: JSON.stringify({ id: leadId, stage, leadType: "buyer" }),
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
