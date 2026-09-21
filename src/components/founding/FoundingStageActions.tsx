"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  FOUNDING_ENTRY_TYPE_LABELS,
  FOUNDING_SOURCE_LABELS,
  FOUNDING_STAGE_LABELS,
  FOUNDING_STAGE_NEXT_ACTION,
  FOUNDING_STAGE_WAITING_ON,
  FOUNDING_STAGES,
  FOUNDING_WAITING_ON_LABEL,
  describeFoundingProgress,
  foundingPersonalInviteUrl,
  foundingSetupUrl,
  isFoundingInvitationStage,
  normaliseFoundingStage,
  type FoundingEntryType,
  type FoundingInvitationStatus,
  type FoundingSource,
  type FoundingStage,
} from "@dg/platform-core";

import { FoundingCommercialOfferEditor } from "./FoundingCommercialOfferEditor";

export function FoundingStageActions({
  opportunityId,
  stage,
  inviteToken,
  entryType,
  source,
  invitationStatus,
  invitationSentAt,
  agreementEmailSentAt,
  agreementSignedAt,
  onboardingInviteSentAt,
  hasOpenedPlatform,
}: {
  opportunityId: string;
  stage: string;
  inviteToken?: string | null;
  entryType?: FoundingEntryType | null;
  source?: FoundingSource | null;
  invitationStatus?: FoundingInvitationStatus | null;
  invitationSentAt?: string | null;
  agreementEmailSentAt?: string | null;
  agreementSignedAt?: string | null;
  onboardingInviteSentAt?: string | null;
  hasOpenedPlatform?: boolean;
}) {
  const router = useRouter();
  const current = normaliseFoundingStage(stage);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const personal = entryType === "personal_invitation" || isFoundingInvitationStage(current);
  const inviteUrl = inviteToken ? foundingPersonalInviteUrl(inviteToken) : null;
  const withdrawn = invitationStatus === "withdrawn";
  const waitingOn = FOUNDING_STAGE_WAITING_ON[current];
  const stageIndex = FOUNDING_STAGES.indexOf(current);
  const agreementSent =
    Boolean(agreementEmailSentAt) || stageIndex >= FOUNDING_STAGES.indexOf("agreement_sent");
  const agreementSigned =
    Boolean(agreementSignedAt) || stageIndex >= FOUNDING_STAGES.indexOf("agreement_signed");
  const onboardingInvited =
    Boolean(onboardingInviteSentAt) || stageIndex >= FOUNDING_STAGES.indexOf("onboarding_invited");
  const progress = describeFoundingProgress(current, {
    agreementEmailSentAt: agreementSent ? agreementEmailSentAt ?? "stage" : null,
    agreementSignedAt: agreementSigned ? agreementSignedAt ?? "stage" : null,
    onboardingInviteSentAt: onboardingInvited ? onboardingInviteSentAt ?? "stage" : null,
    hasOpenedPlatform,
  });

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
      <h2 className="font-semibold text-white">Founding 10 journey</h2>
      <p className="text-sm text-slate-400">Invitation → terms → onboarding → 14-day trial → platform. Agreement emails and manual signatures are no longer required.</p>
      <p
        className={`text-sm font-medium ${
          waitingOn === "customer" ? "text-amber-200" : "text-sky-300"
        }`}
      >
        {FOUNDING_WAITING_ON_LABEL[waitingOn]}
      </p>
      <p className="text-sm text-slate-200">{progress}</p>
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
            {invitationSentAt
              ? ` · ${new Date(invitationSentAt).toLocaleDateString("en-AU")}`
              : ""}
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
      <FoundingCommercialOfferEditor opportunityId={opportunityId} />
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