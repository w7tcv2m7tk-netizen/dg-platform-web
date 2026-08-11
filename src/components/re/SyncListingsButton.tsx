"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncListingsButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function syncNow() {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/re/listings/sync", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(json.error?.message ?? "Sync failed");
        return;
      }
      const r = json.data?.result;
      setMessage(
        r
          ? `Synced — ${r.created} new, ${r.updated} updated, ${r.skipped} skipped`
          : "Synced",
      );
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        disabled={pending}
        onClick={syncNow}
        className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-blue-500 disabled:opacity-50"
      >
        {pending ? "Syncing…" : "Sync from website"}
      </button>
      {message ? <p className="mt-1 text-xs text-slate-400">{message}</p> : null}
    </div>
  );
}
