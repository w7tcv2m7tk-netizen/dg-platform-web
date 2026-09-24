"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PartnerInvitationCancelButton({
  partnerId,
  partnerName,
}: {
  partnerId: string;
  partnerName: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function cancelInvitation() {
    if (!window.confirm(`Cancel the pending invitation for ${partnerName}? The existing invite link will stop working.`)) {
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/v1/admin/partners/${partnerId}/withdraw`, {
      method: "POST",
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not cancel invitation");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void cancelInvitation()}
        disabled={busy}
        className="rounded-full border border-rose-500/35 px-3 py-1.5 text-xs font-medium text-rose-300 hover:border-rose-400 hover:text-rose-200 disabled:opacity-50"
      >
        {busy ? "Cancelling…" : "Cancel invitation"}
      </button>
      {error ? <p className="mt-1 text-[10px] text-rose-300">{error}</p> : null}
    </div>
  );
}
