"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReBookingsPanel({
  bookings,
  error,
}: {
  bookings: Array<{
    id: string;
    contactName?: string | null;
    email?: string;
    phone?: string;
    service?: string;
    scheduledAt?: string;
    status: string;
  }>;
  error?: string;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function syncFromWordPress() {
    setSyncing(true);
    setSyncMsg(null);
    const res = await fetch("/api/v1/re/bookings", {
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

  if (error) {
    return (
      <div className="dg-card border-amber-500/30">
        <p className="text-amber-300">{error}</p>
        <p className="mt-2 text-sm text-slate-500">
          Check DG_WP_CONNECTOR_API_KEY and that the Real Estate module is active on Roe.
        </p>
      </div>
    );
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
        {syncMsg ? <p className="text-sm text-slate-400">{syncMsg}</p> : null}
      </div>

      {!bookings.length ? (
        <div className="dg-card border-dashed border-slate-700">
          <p className="text-slate-300">No bookings in Postgres yet.</p>
          <p className="mt-2 text-sm text-slate-500">
            Sync from Roe WordPress — appraisal and strategy call bookings import here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-900/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{b.contactName || "—"}</p>
                    <p className="text-xs text-slate-500">{b.email || b.phone || ""}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{b.service ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {b.scheduledAt
                      ? new Date(b.scheduledAt).toLocaleString("en-AU")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs capitalize text-slate-300">
                      {b.status ?? "pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
