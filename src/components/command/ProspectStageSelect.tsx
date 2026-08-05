"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ProspectPipelineStage } from "@dg/platform-core";

const STAGE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  audit_created: "Audit created",
  report_sent: "Report sent",
  email_opened: "Email opened",
  report_viewed: "Report viewed",
  follow_up_due: "Follow-up due",
  meeting_booked: "Meeting booked",
  proposal_sent: "Proposal sent",
  won: "Won",
  lost: "Lost",
  onboarding: "Onboarding",
};

export function ProspectStageSelect({
  prospectId,
  stage,
  stages,
}: {
  prospectId: string;
  stage: string;
  stages: ProspectPipelineStage[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onChange(next: string) {
    setPending(true);
    await fetch(`/api/v1/command/growth/prospects/${prospectId}`, {
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
      onChange={(e) => void onChange(e.target.value)}
      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
    >
      {stages.map((s) => (
        <option key={s} value={s}>
          {STAGE_LABELS[s] ?? s}
        </option>
      ))}
    </select>
  );
}
