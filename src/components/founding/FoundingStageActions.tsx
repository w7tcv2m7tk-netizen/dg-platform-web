"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  FOUNDING_ENTRY_TYPE_LABELS,
  FOUNDING_SOURCE_LABELS,
  FOUNDING_STAGE_LABELS,
  FOUNDING_STAGE_NEXT_ACTION,
  FOUNDING_STAGES,
  foundingPersonalInviteUrl,
  foundingSetupUrl,
  isFoundingInvitationStage,
  normaliseFoundingStage,
  type FoundingEntryType,
  type FoundingInvitationStatus,
  type FoundingSource,
  type FoundingStage,
} from "@dg/platform-core";

function formatAustralianDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function FoundingStageActions({
  opportunityId,
  stage,
  inviteToken,
  entryType,
  source,
  invitationStatus,
  invitationSentAt,
}: {
  opportunityId: string;
  stage: string;
  inviteToken?: string | null;
  entryType?: FoundingEntryType | null;
  source?: FoundingSource | null;
  invitationStatus?: FoundingInvitationStatus | null;
  invitationSentAt?: string | null;
}) {
  const router = useRouter();
  const current = normaliseFoundingStage(stage);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const personal = entryType === "personal_invitation" || isFoundingInvitationStage(current);
  const inviteUrl = inviteToken ? foundingPersonalInviteUrl(inviteToken) : null;
  const withdrawn = invitationStatus === "withdrawn";

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
    if (action === "send_invitation" || action === "resend_invitation") {
      setStatus("success");
      setMessage(
        action === "resend_invitation"
          ? "Invitation email resent — ask the prospect to check their inbox."
          : "Invitation email sent.",
      );
    } else {
      setStatus("success");
      setMessage("Saved.");
    }
    router.refresh();
  }

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setMessage("Invitation link copied.");
    } catch {
      setMessage(inviteUrl);
    }
  }

  return (
    <div className="dg-card space-y-3 lg:col-span-2">
      <h2 className="font-semibold text-white">Founding 10 pipeline</h2>
      <p className="text-sm text-slate-400">{FOUNDING_STAGE_NEXT_ACTION[current]}</p>
      <dl className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
        <div>
          Entry:{" "}
          <span className="text-slate-200">
            {entryType ? FOUNDING_ENTRY_TYPE_LABELS[entryType] : "—"}
          </span>
        </div>
        <div>
          Source:{" "}
          <span className="text-slate-200">
            {source ? FOUNDING_SOURCE_LABELS[source] : "—"}
          </span>
        </div>
        {invitationStatus ? (
          <div>
            Invitation:{" "}
            <span className="capitalize text-slate-200">{invitationStatus}</span>
            {invitationSentAt ? ` · ${formatAustralianDate(invitationSentAt)}` : ""}
          </div>
        ) : null}
      </dl>
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
      {personal && !withdrawn ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white"
            onClick={() =>
              void run(invitationStatus === "sent" || invitationStatus === "accepted"
                ? "resend_invitation"
                : "send_invitation")
            }
            disabled={status === "saving"}
          >
            {invitationStatus === "sent" || invitationStatus === "accepted"
              ? "Resend invitation"
              : "Send invitation"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200"
            onClick={() => void copyLink()}
            disabled={!inviteUrl}
          >
            Copy invitation link
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200"
            onClick={() => void run("mark_invitation_accepted")}
            disabled={status === "saving"}
          >
            Mark accepted
          </button>
          <button
            type="button"
            className="rounded-lg border border-amber-700 px-3 py-1.5 text-sm text-amber-200"
            onClick={() => void run("withdraw_invitation")}
            disabled={status === "saving"}
          >
            Withdraw invitation
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white"
          onClick={() => void run("accept")}
          disabled={status === "saving" || withdrawn}
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
        {(current === "accepted" ||
          current === "agreement_signed" ||
          current === "onboarding_invited" ||
          current === "onboarding_started") && (
          <a
            href="/onboarding?journey=founding"
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500"
          >
            Start Onboarding
          </a>
        )}
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
      {inviteUrl ? (
        <p className="text-xs text-slate-500">
          Invitation:{" "}
          <a href={inviteUrl} className="text-sky-400 hover:underline">
            {inviteUrl}
          </a>
        </p>
      ) : null}
      {inviteToken ? (
        <p className="text-xs text-slate-500">
          Setup link:{" "}
          <a href={foundingSetupUrl(inviteToken)} className="text-sky-400 hover:underline">
            {foundingSetupUrl(inviteToken)}
          </a>
        </p>
      ) : null}
      {message ? (
        <p
          className={`text-sm ${
            status === "error" ? "text-amber-300" : "text-emerald-300"
          }`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
