"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PartnerAdminActions({
  partnerId,
  currentStatus,
}: {
  partnerId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const router = useRouter();

  async function action(act: "approve" | "suspend") {
    setStatus("saving");
    await fetch(`/api/v1/admin/partners/${partnerId}/${act}`, { method: "POST" });
    setStatus("idle");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {currentStatus === "pending" && (
        <button
          onClick={() => void action("approve")}
          disabled={status === "saving"}
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          Approve Partner
        </button>
      )}
      {currentStatus === "active" && (
        <button
          onClick={() => void action("suspend")}
          disabled={status === "saving"}
          className="rounded-full border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 hover:border-red-400 hover:text-red-300 disabled:opacity-60"
        >
          Suspend
        </button>
      )}
      {currentStatus === "suspended" && (
        <button
          onClick={() => void action("approve")}
          disabled={status === "saving"}
          className="rounded-full border border-emerald-500/40 px-4 py-2 text-sm font-medium text-emerald-400 hover:border-emerald-400 disabled:opacity-60"
        >
          Reactivate
        </button>
      )}
    </div>
  );
}
