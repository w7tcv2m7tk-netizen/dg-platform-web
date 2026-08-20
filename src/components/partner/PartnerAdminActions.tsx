"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PartnerAdminActions({
  partnerId,
  currentStatus,
  invitationStatus,
}: {
  partnerId: string;
  currentStatus: string;
  invitationStatus?: string | null;
}) {
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function action(act: "approve" | "suspend") {
    setStatus("saving");
    setMessage("");
    await fetch(`/api/v1/admin/partners/${partnerId}/${act}`, { method: "POST" });
    setStatus("idle");
    router.refresh();
  }

  async function sendInvite() {
    setStatus("saving");
    setMessage("");
    const res = await fetch(`/api/v1/admin/partners/${partnerId}/invite`, {
      method: "POST",
    });
    const json = await res.json().catch(() => ({}));
    setStatus("idle");
    if (!res.ok) {
      setMessage(json.error?.message || "Could not send invitation");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {currentStatus === "pending" && invitationStatus !== "withdrawn" ? (
          <button
            type="button"
            onClick={() => void sendInvite()}
            disabled={status === "saving"}
            className="rounded-full border border-sky-500/40 px-4 py-2 text-sm font-medium text-sky-300 hover:border-sky-400 disabled:opacity-60"
          >
            {invitationStatus === "sent" || invitationStatus === "accepted"
              ? "Resend invitation"
              : "Send invitation"}
          </button>
        ) : null}
        {currentStatus === "pending" && (
          <button
            type="button"
            onClick={() => void action("approve")}
            disabled={status === "saving"}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            Approve Partner
          </button>
        )}
        {currentStatus === "active" && (
          <button
            type="button"
            onClick={() => void action("suspend")}
            disabled={status === "saving"}
            className="rounded-full border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 hover:border-red-400 hover:text-red-300 disabled:opacity-60"
          >
            Suspend
          </button>
        )}
        {currentStatus === "suspended" && (
          <button
            type="button"
            onClick={() => void action("approve")}
            disabled={status === "saving"}
            className="rounded-full border border-emerald-500/40 px-4 py-2 text-sm font-medium text-emerald-400 hover:border-emerald-400 disabled:opacity-60"
          >
            Reactivate
          </button>
        )}
      </div>
      {message ? <p className="text-xs text-amber-300">{message}</p> : null}
    </div>
  );
}
