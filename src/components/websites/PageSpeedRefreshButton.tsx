"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PageSpeedRefreshButton({ websiteId }: { websiteId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/websites/${websiteId}/pagespeed`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(json.error?.message || "PageSpeed probe failed");
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "PageSpeed probe failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 space-y-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void run()}
        className="text-xs text-sky-400 hover:underline disabled:opacity-50"
      >
        {busy ? "Running PageSpeed…" : "Refresh PageSpeed"}
      </button>
      {error ? <p className="text-xs text-amber-300">{error}</p> : null}
    </div>
  );
}
