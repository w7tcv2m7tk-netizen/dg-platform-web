"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AccommodationBookingsTable } from "@/components/accommodation/AccommodationBookingsTable";
import type { WpAccBookingRow } from "@/lib/dg-api";

export function AccommodationBookingsPanel({
  bookings,
  error,
  total,
  siteLabel,
  source,
}: {
  bookings: WpAccBookingRow[];
  error?: string;
  total?: number;
  siteLabel?: string;
  source?: "postgres" | "wordpress";
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function syncFromWordPress() {
    setSyncing(true);
    setSyncMsg(null);
    const res = await fetch("/api/v1/accommodation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync_wordpress" }),
    });
    const json = await res.json().catch(() => null);
    setSyncing(false);
    if (!res.ok) {
      setSyncMsg(json?.error?.message ?? "Sync failed");
      return;
    }
    setSyncMsg(
      `Synced: ${json.data.created} new, ${json.data.updated} updated, ${json.data.skipped} unchanged`,
    );
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={syncFromWordPress}
          disabled={syncing}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync bookings from WordPress"}
        </button>
        {source ? (
          <p className="text-sm text-slate-500">
            Showing {source === "postgres" ? "Platform (Postgres)" : "live WordPress"} data
          </p>
        ) : null}
        {syncMsg ? <p className="text-sm text-slate-400">{syncMsg}</p> : null}
      </div>

      <AccommodationBookingsTable
        bookings={bookings}
        error={error}
        total={total}
        siteLabel={siteLabel}
      />
    </div>
  );
}
