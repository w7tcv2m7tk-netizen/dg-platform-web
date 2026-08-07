"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { WpAccAvailabilityUnit, WpAccBookingRow } from "@/lib/dg-api";

/** Channel colours — Booking.com brand blue #003580, Airbnb coral #FF5A5F */
export const CHANNEL_COLORS = {
  confirmed: { bg: "rgba(16, 185, 129, 0.85)", label: "Confirmed" },
  pending: { bg: "rgba(245, 158, 11, 0.85)", label: "Pending" },
  airbnb: { bg: "#FF5A5F", label: "Airbnb" },
  bookingcom: { bg: "#003580", label: "Booking.com" },
  completed: { bg: "rgba(100, 116, 139, 0.85)", label: "Completed" },
  blocked: { bg: "rgba(51, 65, 85, 0.95)", label: "Blocked" },
  open: { bg: "rgba(6, 78, 59, 0.45)", label: "Open" },
} as const;

type CalendarView = "inventory" | "week" | "month" | "list";

function channelKey(booking?: Pick<WpAccBookingRow, "status" | "source"> | null) {
  const raw = (booking?.source || booking?.status || "").toLowerCase();
  if (raw === "airbnb" || raw === "bookingcom") return raw;
  if (raw === "confirmed" || raw === "pending" || raw === "completed") return raw;
  return "pending";
}

function bookingColor(booking?: Pick<WpAccBookingRow, "status" | "source"> | null) {
  return CHANNEL_COLORS[channelKey(booking) as keyof typeof CHANNEL_COLORS]?.bg
    ?? CHANNEL_COLORS.pending.bg;
}

/** Soft cell wash for month view (keeps chips readable). */
function bookingWash(booking?: Pick<WpAccBookingRow, "status" | "source"> | null) {
  const key = channelKey(booking);
  const washes: Record<string, string> = {
    confirmed: "rgba(16, 185, 129, 0.18)",
    pending: "rgba(245, 158, 11, 0.18)",
    airbnb: "rgba(255, 90, 95, 0.18)",
    bookingcom: "rgba(0, 53, 128, 0.22)",
    completed: "rgba(100, 116, 139, 0.2)",
  };
  return washes[key] ?? washes.pending;
}

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

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function startOfWeek(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  const day = d.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function startOfMonth(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

function endOfMonth(iso: string) {
  const d = new Date(`${iso.slice(0, 7)}-01T12:00:00`);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(iso: string, mode: "short" | "long" = "short") {
  const d = new Date(`${iso}T12:00:00`);
  if (mode === "long") {
    return d.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }
  return d.toLocaleDateString("en-AU", { weekday: "narrow", day: "numeric" });
}

/**
 * Stay nights use hotel semantics: check-in inclusive, check-out exclusive.
 * A stay 2026-08-01 → 2026-08-04 occupies nights 01, 02, 03 (not the checkout day).
 * Matches WP DG_Acc_Frontend::get_blocked_dates / calculate_total.
 */
function bookingOccupiesNight(
  booking: Pick<WpAccBookingRow, "checkin" | "checkout">,
  day: string,
) {
  return Boolean(
    booking.checkin &&
      booking.checkout &&
      day >= booking.checkin &&
      day < booking.checkout,
  );
}

function bookingOnDay(unit: WpAccAvailabilityUnit, day: string) {
  return (unit.bookings ?? []).find((b) => bookingOccupiesNight(b, day));
}

function flattenBookings(units: WpAccAvailabilityUnit[]) {
  const rows: Array<WpAccBookingRow & { unitTitle: string }> = [];
  for (const unit of units) {
    for (const b of unit.bookings ?? []) {
      rows.push({ ...b, unitTitle: unit.title });
    }
  }
  return rows.sort((a, b) => (a.checkin ?? "").localeCompare(b.checkin ?? ""));
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
  const router = useRouter();
  const [view, setView] = useState<CalendarView>("inventory");
  const [anchor, setAnchor] = useState(from);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const weekStart = startOfWeek(anchor);
  const weekDays = daysBetween(weekStart, addDays(weekStart, 6));
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const monthDays = daysBetween(monthStart, monthEnd);
  const inventoryDays = daysBetween(from, to).slice(0, 60);
  const listBookings = useMemo(() => flattenBookings(units), [units]);

  async function syncOta() {
    setSyncing(true);
    setSyncMsg(null);
    const res = await fetch("/api/v1/accommodation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync_ota", source: "all" }),
    });
    const json = await res.json().catch(() => ({}));
    setSyncing(false);
    if (!res.ok) {
      setSyncMsg(json.error?.message ?? "OTA sync failed — deploy plugin v10.57.0+ on CVH");
      return;
    }
    setSyncMsg(json.data?.message ?? "Airbnb & Booking.com calendars synced");
    router.refresh();
  }

  if (error) {
    return (
      <div className="dg-card border-amber-500/30">
        <p className="text-amber-300">{error}</p>
        <p className="mt-2 text-sm text-slate-500">
          Deploy plugin v10.57.0+ on CVH and set the org WordPress API key under Settings →
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

  const views: { id: CalendarView; label: string }[] = [
    { id: "inventory", label: "Inventory" },
    { id: "week", label: "Week" },
    { id: "month", label: "Month" },
    { id: "list", label: "List" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {siteLabel ? `${siteLabel} · ` : ""}
            {from} → {to}
          </p>
          {syncMsg ? <p className="mt-1 text-xs text-emerald-400">{syncMsg}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-slate-700 p-0.5">
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  view === v.id
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {(view === "week" || view === "month") && (
            <div className="flex gap-1">
              <button
                type="button"
                className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300"
                onClick={() => {
                  if (view === "week") setAnchor(addDays(anchor, -7));
                  else {
                    const d = new Date(`${monthStart}T12:00:00`);
                    d.setMonth(d.getMonth() - 1);
                    setAnchor(d.toISOString().slice(0, 10));
                  }
                }}
              >
                ←
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300"
                onClick={() => setAnchor(from)}
              >
                Today
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300"
                onClick={() => {
                  if (view === "week") setAnchor(addDays(anchor, 7));
                  else {
                    const d = new Date(`${monthStart}T12:00:00`);
                    d.setMonth(d.getMonth() + 1);
                    setAnchor(d.toISOString().slice(0, 10));
                  }
                }}
              >
                →
              </button>
            </div>
          )}
          <button
            type="button"
            disabled={syncing}
            onClick={() => void syncOta()}
            className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {syncing ? "Syncing…" : "Sync Airbnb & Booking.com"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {(
          [
            "open",
            "confirmed",
            "airbnb",
            "bookingcom",
            "pending",
            "blocked",
          ] as const
        ).map((key) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: CHANNEL_COLORS[key].bg }}
            />
            {CHANNEL_COLORS[key].label}
          </span>
        ))}
      </div>

      {view === "inventory" ? (
        <InventoryGrid units={units} days={inventoryDays} />
      ) : null}
      {view === "week" ? (
        <WeekGrid units={units} days={weekDays} title={`${formatDayLabel(weekStart, "long")} – ${formatDayLabel(weekDays[6]!, "long")}`} />
      ) : null}
      {view === "month" ? (
        <MonthGrid units={units} days={monthDays} title={new Date(`${monthStart}T12:00:00`).toLocaleDateString("en-AU", { month: "long", year: "numeric" })} />
      ) : null}
      {view === "list" ? <ListView bookings={listBookings} /> : null}
    </div>
  );
}

function InventoryGrid({
  units,
  days,
}: {
  units: WpAccAvailabilityUnit[];
  days: string[];
}) {
  return (
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
                  const booking = bookingOnDay(unit, d);
                  const isBlocked = blocked.has(d);
                  const bg = booking
                    ? bookingColor(booking)
                    : isBlocked
                      ? CHANNEL_COLORS.blocked.bg
                      : CHANNEL_COLORS.open.bg;
                  return (
                    <td key={d} className="px-1 py-2">
                      <div
                        title={
                          booking
                            ? `${booking.guest_name ?? "Guest"} (${booking.source || booking.status})`
                            : isBlocked
                              ? "Blocked"
                              : "Open"
                        }
                        className="mx-auto h-6 w-6 rounded-sm"
                        style={{ backgroundColor: bg }}
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
  );
}

function WeekGrid({
  units,
  days,
  title,
}: {
  units: WpAccAvailabilityUnit[];
  days: string[];
  title: string;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-slate-300">{title}</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[720px] border-collapse text-left text-xs">
          <thead className="bg-slate-900/60 text-slate-500">
            <tr>
              <th className="sticky left-0 z-10 w-40 bg-slate-950 px-3 py-2">Unit</th>
              {days.map((d) => (
                <th key={d} className="px-2 py-2 text-center font-normal text-slate-400">
                  {formatDayLabel(d, "long")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => {
              const blocked = new Set(unit.blocked_dates ?? []);
              return (
                <tr key={unit.id} className="border-t border-slate-800 align-top">
                  <td className="sticky left-0 z-10 bg-slate-950 px-3 py-2 font-medium text-white">
                    {unit.title}
                  </td>
                  {days.map((d) => {
                    const booking = bookingOnDay(unit, d);
                    const isBlocked = blocked.has(d);
                    return (
                      <td key={d} className="px-1.5 py-2">
                        {booking ? (
                          <div
                            className="rounded-md px-2 py-1.5 text-[11px] leading-snug text-white"
                            style={{ backgroundColor: bookingColor(booking) }}
                          >
                            <p className="font-medium">{booking.guest_name ?? "Guest"}</p>
                            <p className="opacity-80 capitalize">
                              {booking.source || booking.status}
                            </p>
                          </div>
                        ) : (
                          <div
                            className="rounded-md px-2 py-3 text-center text-[10px] text-slate-500"
                            style={{
                              backgroundColor: isBlocked
                                ? CHANNEL_COLORS.blocked.bg
                                : CHANNEL_COLORS.open.bg,
                            }}
                          >
                            {isBlocked ? "Blocked" : "Open"}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MonthGrid({
  units,
  days,
  title,
}: {
  units: WpAccAvailabilityUnit[];
  days: string[];
  title: string;
}) {
  // Pad to Monday-start weeks
  const lead = (() => {
    const d = new Date(`${days[0]}T12:00:00`);
    const day = d.getDay();
    return day === 0 ? 6 : day - 1;
  })();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Every occupied night in the stay range (check-in inclusive, check-out exclusive),
  // including stays that started before this month.
  const byDay = new Map<
    string,
    Array<{ unit: string; booking: WpAccBookingRow; isCheckin: boolean }>
  >();
  const blockedOnlyByDay = new Map<string, number>();
  for (const unit of units) {
    const blocked = new Set(unit.blocked_dates ?? []);
    for (const day of days) {
      const booking = bookingOnDay(unit, day);
      if (booking) {
        const list = byDay.get(day) ?? [];
        list.push({
          unit: unit.title,
          booking,
          isCheckin: booking.checkin === day,
        });
        byDay.set(day, list);
        continue;
      }
      if (blocked.has(day)) {
        blockedOnlyByDay.set(day, (blockedOnlyByDay.get(day) ?? 0) + 1);
      }
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-slate-300">{title}</h2>
      <p className="text-[11px] text-slate-500">
        Booked nights shown for each stay (check-in inclusive, check-out day free).
      </p>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-slate-950 px-2 py-1.5 text-center text-[10px] font-medium uppercase text-slate-500">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const entries = day ? byDay.get(day) ?? [] : [];
          const blockedCount = day ? blockedOnlyByDay.get(day) ?? 0 : 0;
          const primary = entries[0];
          return (
            <div
              key={day ?? `pad-${i}`}
              className="min-h-[88px] bg-slate-950 p-1.5"
              style={
                primary
                  ? { backgroundColor: bookingWash(primary.booking) }
                  : blockedCount
                    ? { backgroundColor: "rgba(51, 65, 85, 0.35)" }
                    : undefined
              }
            >
              {day ? (
                <>
                  <p className="text-[11px] text-slate-500">{day.slice(8)}</p>
                  <div className="mt-1 space-y-1">
                    {entries.slice(0, 3).map(({ unit, booking, isCheckin }) => (
                      <div
                        key={`${booking.id}-${unit}-${day}`}
                        className="truncate rounded px-1 py-0.5 text-[10px] text-white"
                        style={{
                          backgroundColor: bookingColor(booking),
                          opacity: isCheckin ? 1 : 0.85,
                        }}
                        title={`${unit}: ${booking.guest_name ?? "Guest"} · ${booking.checkin} → ${booking.checkout}`}
                      >
                        {isCheckin
                          ? (booking.guest_name ?? unit)
                          : `→ ${booking.guest_name ?? unit}`}
                      </div>
                    ))}
                    {entries.length > 3 ? (
                      <p className="text-[10px] text-slate-500">
                        +{entries.length - 3} more
                      </p>
                    ) : null}
                    {!entries.length && blockedCount > 0 ? (
                      <div
                        className="truncate rounded px-1 py-0.5 text-[10px] text-slate-300"
                        style={{ backgroundColor: CHANNEL_COLORS.blocked.bg }}
                        title="Blocked (manual / OTA)"
                      >
                        Blocked
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({
  bookings,
}: {
  bookings: Array<WpAccBookingRow & { unitTitle: string }>;
}) {
  if (!bookings.length) {
    return (
      <div className="dg-card">
        <p className="text-sm text-slate-500">No stays in this window.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Guest</th>
            <th className="px-4 py-3">Unit</th>
            <th className="px-4 py-3">Dates</th>
            <th className="px-4 py-3">Channel</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => {
            const channel = channelKey(b);
            return (
              <tr key={b.id} className="border-t border-slate-800">
                <td className="px-4 py-3 text-white">{b.guest_name ?? b.ref ?? "Guest"}</td>
                <td className="px-4 py-3 text-slate-300">{b.unitTitle}</td>
                <td className="px-4 py-3 text-slate-400">
                  {b.checkin} → {b.checkout}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: bookingColor(b) }}
                  >
                    {CHANNEL_COLORS[channel as keyof typeof CHANNEL_COLORS]?.label
                      ?? channel}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
