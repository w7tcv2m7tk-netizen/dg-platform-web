import type { WpAccBookingRow } from "@/lib/dg-api";

export function AccommodationBookingsTable({
  bookings,
  error,
  total,
  siteLabel,
}: {
  bookings: WpAccBookingRow[];
  error?: string;
  total?: number;
  siteLabel?: string;
}) {
  if (error) {
    return (
      <div className="dg-card border-amber-500/30">
        <p className="text-amber-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {siteLabel || total != null ? (
        <p className="text-sm text-slate-500">
          {siteLabel ? `${siteLabel}` : ""}
          {total != null ? ` · ${total} total bookings in WordPress` : ""}
        </p>
      ) : null}
      {!bookings.length ? (
        <div className="dg-card border-dashed border-slate-700">
          <p className="text-slate-300">No bookings returned.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Stay</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-900/40">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{b.ref ?? b.id}</td>
                  <td className="px-4 py-3">
                    <p className="text-white">{b.guest_name ?? "—"}</p>
                    <p className="text-xs text-slate-500">{b.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{b.accommodation ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {b.checkin} → {b.checkout}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {b.total != null ? `$${b.total.toLocaleString("en-AU")}` : "—"}
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
