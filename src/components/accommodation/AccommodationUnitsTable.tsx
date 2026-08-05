import type { WpAccUnitRow } from "@/lib/dg-api";

export function AccommodationUnitsTable({
  units,
  error,
  siteLabel,
}: {
  units: WpAccUnitRow[];
  error?: string;
  siteLabel?: string;
}) {
  if (error) {
    return (
      <div className="dg-card border-amber-500/30">
        <p className="text-amber-300">{error}</p>
      </div>
    );
  }

  if (!units.length) {
    return (
      <div className="dg-card border-dashed border-slate-700">
        <p className="text-slate-300">No accommodation units returned from WordPress.</p>
        {siteLabel ? <p className="mt-1 text-sm text-slate-500">Site: {siteLabel}</p> : null}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Unit</th>
            <th className="px-4 py-3">Weekday rate</th>
            <th className="px-4 py-3">Listing</th>
            <th className="px-4 py-3">Housekeeping</th>
            <th className="px-4 py-3">Check-in</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {units.map((u) => (
            <tr key={u.id} className="hover:bg-slate-900/40">
              <td className="px-4 py-3 font-medium text-white">{u.title}</td>
              <td className="px-4 py-3 text-slate-300">
                {u.weekday_rate != null ? `$${u.weekday_rate}` : "—"}
              </td>
              <td className="px-4 py-3 capitalize text-slate-400">{u.listing_status ?? "—"}</td>
              <td className="px-4 py-3 capitalize text-slate-400">
                {u.housekeeping_status ?? "—"}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-500">
                {u.checkin_slug ? `/check-in/${u.checkin_slug}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
