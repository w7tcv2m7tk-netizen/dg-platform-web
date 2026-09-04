"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncListingsButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function importLegacyProperties() {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/migrations/wordpress/real-estate/properties", {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(json.error?.message ?? "Legacy import failed");
        return;
      }
      const r = json.data?.result;
      setMessage(
        r
          ? `Imported — ${r.created} new, ${r.updated} updated, ${r.skipped} skipped`
          : "Import complete",
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
        onClick={importLegacyProperties}
        className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-blue-500 disabled:opacity-50"
      >
        {pending ? "Importing…" : "Import legacy website"}
      </button>
      {message ? <p className="mt-1 text-xs text-slate-400">{message}</p> : null}
    </div>
  );
}
