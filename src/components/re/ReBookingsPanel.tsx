"use client";

import type { WpReBookingRow } from "@/lib/dg-api";

export function ReBookingsPanel({
  bookings,
  error,
}: {
  bookings: WpReBookingRow[];
  error?: string;
}) {
  if (error) {
    return (
      <div className="dg-card border-amber-500/30">
        <p className="text-amber-300">{error}</p>
        <p className="mt-2 text-sm text-slate-500">
          Appraisal bookings live in WordPress until two-way sync ships. Check DG_WP_CONNECTOR_API_KEY
          and that the Real Estate module is active on Roe.
        </p>
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div className="dg-card border-dashed border-slate-700">
        <p className="text-slate-300">No recent bookings from WordPress.</p>
        <p className="mt-2 text-sm text-slate-500">
          Bookings from /property-appraisal/ and strategy call forms appear here in real time.
        </p>
      </div>
    );
  }

  return (
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
                <p className="font-medium text-white">{b.contact || "—"}</p>
                <p className="text-xs text-slate-500">{b.email || b.phone || ""}</p>
              </td>
              <td className="px-4 py-3 text-slate-300">{b.service ?? b.type ?? "—"}</td>
              <td className="px-4 py-3 text-slate-400">
                {b.date
                  ? `${b.date}${b.time ? ` · ${String(b.time).slice(0, 5)}` : ""}`
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
  );
}
