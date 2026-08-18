"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  FOUNDING_STAGE_LABELS,
  FOUNDING_STAGE_NEXT_ACTION,
  FOUNDING_STAGES,
  foundingSetupUrl,
  normaliseFoundingStage,
  type FoundingStage,
} from "@dg/platform-core";

export function FoundingStageActions({
  opportunityId,
  stage,
  inviteToken,
}: {
  opportunityId: string;
  stage: string;
  inviteToken?: string | null;
}) {
  const router = useRouter();
  const current = normaliseFoundingStage(stage);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  async function run(action: string, nextStage?: FoundingStage) {
    setStatus("saving");
    setMessage("");
    const res = await fetch("/api/v1/founding/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunityId, action, stage: nextStage }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("error");
      setMessage(json.error?.message || "Action failed");
      return;
    }
    setStatus("idle");
    router.refresh();
  }

  return (
    <div className="dg-card space-y-3 lg:col-span-2">
      <h2 className="font-semibold text-white">Founding 10 pipeline</h2>
      <p className="text-sm text-slate-400">{FOUNDING_STAGE_NEXT_ACTION[current]}</p>
      <ol className="flex flex-wrap gap-1.5">
        {FOUNDING_STAGES.map((id) => (
          <li
            key={id}
            className={`rounded-full px-2 py-0.5 text-[11px] ${
              id === current
                ? "bg-sky-600 text-white"
                : "border border-slate-700 text-slate-400"
            }`}
          >
            {FOUNDING_STAGE_LABELS[id]}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white"
          onClick={() => void run("accept")}
          disabled={status === "saving"}
        >
          Accept &amp; send welcome
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200"
          onClick={() => void run("send_agreement")}
          disabled={status === "saving"}
        >
          Send agreement
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200"
          onClick={() => void run("mark_signed")}
          disabled={status === "saving"}
        >
          Mark signed + invite onboarding
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200"
          onClick={() => void run("invite_onboarding")}
          disabled={status === "saving"}
        >
          Invite onboarding
        </button>
        <select
          className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
          value={current}
          onChange={(e) => void run("advance", e.target.value as FoundingStage)}
        >
          {FOUNDING_STAGES.map((id) => (
            <option key={id} value={id}>
              Move to: {FOUNDING_STAGE_LABELS[id]}
            </option>
          ))}
        </select>
      </div>
      {inviteToken ? (
        <p className="text-xs text-slate-500">
          Setup link:{" "}
          <a href={foundingSetupUrl(inviteToken)} className="text-sky-400 hover:underline">
            {foundingSetupUrl(inviteToken)}
          </a>
        </p>
      ) : null}
      {message ? <p className="text-sm text-amber-300">{message}</p> : null}
    </div>
  );
}
