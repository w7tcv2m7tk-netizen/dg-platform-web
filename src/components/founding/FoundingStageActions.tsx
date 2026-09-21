"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  FOUNDING_ENTRY_TYPE_LABELS,
  FOUNDING_SOURCE_LABELS,
  FOUNDING_STAGE_LABELS,
  foundingPersonalInviteUrl,
  foundingSetupUrl,
  normaliseFoundingStage,
  type FoundingEntryType,
  type FoundingInvitationStatus,
  type FoundingSource,
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
  const inviteUrl = inviteToken ? foundingPersonalInviteUrl(inviteToken) : null;
  const setupUrl = inviteToken ? foundingSetupUrl(inviteToken) : null;
  const withdrawn = invitationStatus === "withdrawn";

  async function run(action: string) {
    setStatus("saving");
    setMessage("");
    const res = await fetch("/api/v1/founding/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunityId, action }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("error");
      setMessage(json.error?.message || "Action failed");
      return;
    }
    setStatus("success");
    setMessage(action === "resend_invitation" ? "Invitation resent." : action === "send_invitation" ? "Invitation sent." : "Saved.");
    router.refresh();
  }

  async function copy(value: string | null, label: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copied.`);
    } catch {
      setMessage(value);
    }
  }

  return (
    <div className="dg-card space-y-3 lg:col-span-2">
      <h2 className="font-semibold text-white">Founding 10 journey</h2>
      <p className="text-sm text-slate-300">
        Invitation → terms → onboarding → 14-day trial → platform.
      </p>
      <p className="text-xs text-slate-500">
        Agreement emails, manual signatures and separate onboarding invitations are no longer required.
        Legacy stage data is retained for history.
      </p>
      <dl className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
        <div>Current record: <span className="text-slate-200">{FOUNDING_STAGE_LABELS[current]}</span></div>
        <div>Entry: <span className="text-slate-200">{entryType ? FOUNDING_ENTRY_TYPE_LABELS[entryType] : "—"}</span></div>
        <div>Source: <span className="text-slate-200">{source ? FOUNDING_SOURCE_LABELS[source] : "—"}</span></div>
        {invitationStatus ? (
          <div>
            Invitation: <span className="capitalize text-slate-200">{invitationStatus}</span>
            {invitationSentAt ? ` · ${new Date(invitationSentAt).toLocaleDateString("en-AU")}` : ""}
          </div>
        ) : null}
      </dl>

      {!withdrawn ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white"
            onClick={() => void run(invitationStatus === "sent" || invitationStatus === "accepted" ? "resend_invitation" : "send_invitation")}
            disabled={status === "saving"}
          >
            {invitationStatus === "sent" || invitationStatus === "accepted" ? "Resend invitation" : "Send invitation"}
          </button>
          <button type="button" className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200" onClick={() => void copy(inviteUrl, "Invitation link")} disabled={!inviteUrl}>
            Copy invitation link
          </button>
          <button type="button" className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200" onClick={() => void copy(setupUrl, "Setup link")} disabled={!setupUrl}>
            Copy setup link
          </button>
          <button type="button" className="rounded-lg border border-amber-700 px-3 py-1.5 text-sm text-amber-200" onClick={() => void run("withdraw_invitation")} disabled={status === "saving"}>
            Withdraw invitation
          </button>
        </div>
      ) : null}

      {setupUrl ? (
        <a href={setupUrl} className="inline-flex rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">
          Open customer setup →
        </a>
      ) : null}

      <FoundingCommercialOfferEditor opportunityId={opportunityId} />
      {message ? <p className={`text-sm ${status === "error" ? "text-amber-300" : "text-emerald-300"}`} role="status">{message}</p> : null}
    </div>
  );
}
