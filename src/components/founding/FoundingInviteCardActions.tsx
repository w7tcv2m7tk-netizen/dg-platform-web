"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Compact invite actions for lifecycle stage cards. */
export function FoundingInviteCardActions({ opportunityId }: { opportunityId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"resend" | "withdraw" | null>(null);
  const [error, setError] = useState("");

  async function run(action: "resend_invitation" | "withdraw_invitation") {
    setBusy(action === "resend_invitation" ? "resend" : "withdraw");
    setError("");
    const res = await fetch("/api/v1/founding/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunityId, action }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(json.error?.message || "Action failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => run("resend_invitation")}
        className="text-xs text-sky-400 hover:underline disabled:opacity-50"
      >
        {busy === "resend" ? "Resending…" : "Resend"}
      </button>
      <span className="text-slate-600">→</span>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => run("withdraw_invitation")}
        className="text-xs text-rose-300/90 hover:underline disabled:opacity-50"
      >
        {busy === "withdraw" ? "Withdrawing…" : "Withdraw"}
      </button>
      {error ? <span className="w-full text-[11px] text-rose-300">{error}</span> : null}
    </div>
  );
}
