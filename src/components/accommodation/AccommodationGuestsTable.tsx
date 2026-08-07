import type { WpAccGuestRow } from "@/lib/dg-api";

export function AccommodationGuestsTable({
  guests,
  error,
  total,
  siteLabel,
}: {
  guests: WpAccGuestRow[];
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
          {total != null ? ` · ${total} guests in WordPress` : ""}
        </p>
      ) : null}
      {!guests.length ? (
        <div className="dg-card border-dashed border-slate-700">
          <p className="text-slate-300">No guests returned.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Stays</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {guests.map((g) => (
                <tr key={g.id} className="hover:bg-slate-900/40">
                  <td className="px-4 py-3 font-medium text-white">{g.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{g.email ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{g.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{g.total_stays ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
