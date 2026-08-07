"use client";

import type { WpAccAvailabilityUnit } from "@/lib/dg-api";

const STATUS_COLOR: Record<string, string> = {
  confirmed: "bg-emerald-500/80",
  pending: "bg-amber-500/80",
  airbnb: "bg-rose-500/80",
  bookingcom: "bg-blue-600/80",
  completed: "bg-slate-500/80",
};

function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function AccommodationAvailabilityBoard({
  from,
  to,
  units,
  error,
  siteLabel,
}: {
  from: string;
  to: string;
  units: WpAccAvailabilityUnit[];
  error?: string;
  siteLabel?: string;
}) {
  if (error) {
    return (
      <div className="dg-card border-amber-500/30">
        <p className="text-amber-300">{error}</p>
        <p className="mt-2 text-sm text-slate-500">
          Deploy plugin v10.54.0+ on CVH and set the org WordPress API key under Settings →
          Connectors.
        </p>
      </div>
    );
  }

  if (!units.length) {
    return (
      <div className="dg-card border-dashed border-slate-700">
        <p className="text-slate-300">No units returned for availability.</p>
        {siteLabel ? <p className="mt-1 text-sm text-slate-500">Site: {siteLabel}</p> : null}
      </div>
    );
  }

  const days = daysBetween(from, to).slice(0, 31);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {siteLabel ? `${siteLabel} · ` : ""}
        {from} → {to}
        {days.length < daysBetween(from, to).length ? " (showing first 31 days)" : ""}
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[900px] border-collapse text-left text-xs">
          <thead className="bg-slate-900/60 text-slate-500">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-950 px-3 py-2 text-left">Unit</th>
              {days.map((d) => (
                <th key={d} className="px-1 py-2 text-center font-normal">
                  <span className="block">{d.slice(8)}</span>
                  <span className="block text-[10px] opacity-60">
                    {new Date(`${d}T12:00:00`).toLocaleDateString("en-AU", { weekday: "narrow" })}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => {
              const blocked = new Set(unit.blocked_dates ?? []);
              return (
                <tr key={unit.id} className="border-t border-slate-800">
                  <td className="sticky left-0 z-10 bg-slate-950 px-3 py-2 font-medium text-white">
                    {unit.title}
                    <p className="mt-0.5 text-[10px] capitalize text-slate-500">
                      {unit.listing_status ?? "bookable"}
                    </p>
                  </td>
                  {days.map((d) => {
                    const booking = (unit.bookings ?? []).find(
                      (b) => b.checkin && b.checkout && d >= b.checkin && d < b.checkout,
                    );
                    const isBlocked = blocked.has(d);
                    const color = booking
                      ? STATUS_COLOR[booking.status ?? "pending"] ?? "bg-slate-500/80"
                      : isBlocked
                        ? "bg-slate-700"
                        : "bg-emerald-900/40";
                    return (
                      <td key={d} className="px-1 py-2">
                        <div
                          title={
                            booking
                              ? `${booking.guest_name ?? "Guest"} (${booking.status})`
                              : isBlocked
                                ? "Blocked"
                                : "Open"
                          }
                          className={`mx-auto h-6 w-6 rounded-sm ${color}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-emerald-900/40" /> Open
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-emerald-500/80" /> Confirmed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-rose-500/80" /> Airbnb
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-blue-600/80" /> Booking.com
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-slate-700" /> Blocked
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {units.map((unit) => (
          <div key={`list-${unit.id}`} className="dg-card">
            <h3 className="font-semibold text-white">{unit.title}</h3>
            {(unit.bookings ?? []).length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {(unit.bookings ?? []).slice(0, 6).map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 last:border-0"
                  >
                    <span className="text-slate-200">{b.guest_name ?? b.ref ?? "Guest"}</span>
                    <span className="text-xs text-slate-500">
                      {b.checkin} → {b.checkout}
                    </span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs capitalize text-slate-300">
                      {b.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No stays in this window.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
