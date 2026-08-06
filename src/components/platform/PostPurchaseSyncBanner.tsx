"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function PostPurchaseSyncBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shouldSync = searchParams.get("sync") === "1";
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shouldSync) return;

    async function run() {
      setLoading(true);
      const res = await fetch("/api/v1/org/profile", {
        method: "POST",
      });
      const json = await res.json().catch(() => null);
      setLoading(false);
      if (res.ok && json?.data?.synced) {
        setMessage("Purchase synced — your plan and apps are updated.");
        router.refresh();
      } else if (res.ok) {
        setMessage("Already up to date with your DigitalGate purchase.");
      } else {
        setMessage(json?.error?.message ?? "Could not sync purchase yet. Try again after signing in.");
      }
    }

    void run();
  }, [shouldSync, router]);

  if (!shouldSync) return null;

  return (
    <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">
      {loading ? "Syncing your purchase from DigitalGate…" : message ?? "Checking your purchase…"}
    </div>
  );
}
