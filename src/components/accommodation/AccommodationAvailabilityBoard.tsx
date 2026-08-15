"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ACC_CALENDAR_HORIZON_DAYS } from "@dg/platform-core";

import type { WpAccAvailabilityUnit, WpAccBookingRow } from "@/lib/dg-api";

/** Channel colours — Booking.com brand blue #003580, Airbnb coral #FF5A5F */
export const CHANNEL_COLORS = {
  confirmed: { bg: "rgba(16, 185, 129, 0.85)", label: "Confirmed" },
  pending: { bg: "rgba(245, 158, 11, 0.85)", label: "Pending" },
  airbnb: { bg: "#FF5A5F", label: "Airbnb" },
  bookingcom: { bg: "#003580", label: "Booking.com" },
  completed: { bg: "rgba(100, 116, 139, 0.85)", label: "Completed" },
  blocked: { bg: "rgba(51, 65, 85, 0.95)", label: "Manual block" },
  open: { bg: "rgba(16, 185, 129, 0.28)", label: "Open" },
} as const;

type CalendarView = "inventory" | "week" | "month" | "list";

/** Isolate booked nights by channel across all units. */
type BookingChannelFilter =
  | "all"
  | "airbnb"
  | "bookingcom"
  | "confirmed"
  | "pending";

const CHANNEL_FILTERS: {
  id: BookingChannelFilter;
  label: string;
  swatch?: string;
}[] = [
  { id: "all", label: "All calendars" },
  { id: "airbnb", label: "Airbnb", swatch: CHANNEL_COLORS.airbnb.bg },
  { id: "bookingcom", label: "Booking.com", swatch: CHANNEL_COLORS.bookingcom.bg },
  { id: "confirmed", label: "Direct", swatch: CHANNEL_COLORS.confirmed.bg },
  { id: "pending", label: "Pending", swatch: CHANNEL_COLORS.pending.bg },
];

function channelKey(booking?: Pick<WpAccBookingRow, "status" | "source"> | null) {
  const raw = (booking?.source || booking?.status || "").toLowerCase();
  if (raw === "airbnb" || raw === "bookingcom") return raw;
  if (raw === "confirmed" || raw === "pending" || raw === "completed") return raw;
  return "pending";
}

function bookingMatchesChannel(
  booking: Pick<WpAccBookingRow, "status" | "source">,
  filter: BookingChannelFilter,
) {
  if (filter === "all") return true;
  return channelKey(booking) === filter;
}

function bookingColor(booking?: Pick<WpAccBookingRow, "status" | "source"> | null) {
  return CHANNEL_COLORS[channelKey(booking) as keyof typeof CHANNEL_COLORS]?.bg
    ?? CHANNEL_COLORS.pending.bg;
}

/** Soft cell wash for classic month view (keeps chips readable). */
function bookingWash(booking?: Pick<WpAccBookingRow, "status" | "source"> | null) {
  const key = channelKey(booking);
  const washes: Record<string, string> = {
    confirmed: "rgba(16, 185, 129, 0.18)",
    pending: "rgba(245, 158, 11, 0.18)",
    airbnb: "rgba(255, 90, 95, 0.18)",
    bookingcom: "rgba(0, 53, 128, 0.22)",
    completed: "rgba(100, 116, 139, 0.2)",
  };
  return washes[key] ?? washes.pending!;
}

function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  while (cur <= end) {
    out.push(toLocalISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function toLocalISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayLocalISO() {
  return toLocalISODate(new Date());
}

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return toLocalISODate(d);
}

function startOfWeek(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  const day = d.getDay(); // 0 Sun
  d.setDate(d.getDate() - day); // Sunday start
  return toLocalISODate(d);
}

function startOfMonth(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

function endOfMonth(iso: string) {
  const d = new Date(`${iso.slice(0, 7)}-01T12:00:00`);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return toLocalISODate(d);
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

function bookingOnDay(
  unit: WpAccAvailabilityUnit,
  day: string,
  filter: BookingChannelFilter = "all",
) {
  return (unit.bookings ?? []).find(
    (b) => bookingOccupiesNight(b, day) && bookingMatchesChannel(b, filter),
  );
}

/** All stays occupying a night (OTA can stack blocks + reservations). */
function bookingsOnDay(
  unit: WpAccAvailabilityUnit,
  day: string,
  filter: BookingChannelFilter = "all",
) {
  return (unit.bookings ?? []).filter(
    (b) => bookingOccupiesNight(b, day) && bookingMatchesChannel(b, filter),
  );
}

/** Hotel nights between check-in (inclusive) and check-out (exclusive). */
function stayNightCount(
  booking: Pick<WpAccBookingRow, "checkin" | "checkout">,
): number {
  if (!booking.checkin || !booking.checkout || booking.checkout <= booking.checkin) {
    return 0;
  }
  let n = 0;
  let cur = booking.checkin;
  while (cur < booking.checkout) {
    n += 1;
    cur = addDays(cur, 1);
  }
  return n;
}

function formatNightsLabel(nights: number) {
  if (nights <= 0) return "";
  return nights === 1 ? "1 night" : `${nights} nights`;
}

type BookingSpan = {
  booking: WpAccBookingRow;
  /** Inclusive index into the visible `days` array (first occupied night). */
  startIdx: number;
  /** Inclusive index into the visible `days` array (last occupied night). */
  endIdx: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
  nights: number;
};

/**
 * Collapse each stay into one Airbnb-style bar clipped to the visible day range.
 */
function bookingSpansForUnit(
  unit: WpAccAvailabilityUnit,
  days: string[],
  filter: BookingChannelFilter,
): BookingSpan[] {
  if (!days.length) return [];
  const rangeStart = days[0]!;
  const rangeEnd = days[days.length - 1]!;
  const dayIndex = new Map(days.map((d, i) => [d, i] as const));
  const seen = new Set<string | number>();
  const spans: BookingSpan[] = [];

  for (const booking of unit.bookings ?? []) {
    if (!booking.checkin || !booking.checkout) continue;
    if (!bookingMatchesChannel(booking, filter)) continue;
    if (booking.checkout <= rangeStart || booking.checkin > rangeEnd) continue;

    // Gen2 OTA rows often have id=0 (no WP id). Prefer platform_id so stays don't collapse.
    const key =
      (typeof booking.platform_id === "string" && booking.platform_id.trim()) ||
      (typeof booking.id === "number" && booking.id > 0 ? String(booking.id) : "") ||
      `${booking.checkin}:${booking.checkout}:${booking.guest_name ?? ""}:${booking.source ?? booking.status ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const lastNight = addDays(booking.checkout, -1);
    const startIso = booking.checkin < rangeStart ? rangeStart : booking.checkin;
    const endIso = lastNight > rangeEnd ? rangeEnd : lastNight;
    if (startIso > endIso) continue;

    const startIdx = dayIndex.get(startIso);
    const endIdx = dayIndex.get(endIso);
    if (startIdx == null || endIdx == null) continue;

    spans.push({
      booking,
      startIdx,
      endIdx,
      continuesBefore: booking.checkin < rangeStart,
      continuesAfter: lastNight > rangeEnd,
      nights: stayNightCount(booking),
    });
  }

  return spans.sort((a, b) => a.startIdx - b.startIdx || a.endIdx - b.endIdx);
}

/**
 * Month chips must show a unit name even when guest text dominates the cell.
 * Prefer unit.title from the availability payload; fall back to booking.accommodation.
 * Long branded titles ("Site — Rainforest Dome") shorten to the distinctive tail.
 */
function resolveUnitLabel(
  unit: Pick<WpAccAvailabilityUnit, "id" | "title">,
  booking?: Pick<WpAccBookingRow, "accommodation" | "accommodation_id"> | null,
): string {
  const raw =
    unit.title?.trim() ||
    booking?.accommodation?.trim() ||
    (booking?.accommodation_id
      ? `Unit #${booking.accommodation_id}`
      : unit.id
        ? `Unit #${unit.id}`
        : "Unit");
  const parts = raw.split(/\s+[—–|-]\s+/);
  if (parts.length > 1) {
    const tail = parts[parts.length - 1]!.trim();
    if (tail.length >= 3 && tail.length < raw.length) return tail;
  }
  return raw;
}

/** Prefer explicit manual list; fall back to merged blocked_dates minus booking nights. */
function manualBlockedSet(unit: WpAccAvailabilityUnit): Set<string> {
  if (unit.manual_blocked_dates?.length) {
    return new Set(unit.manual_blocked_dates);
  }
  if (unit.manual_blocked_dates && unit.manual_blocked_dates.length === 0) {
    return new Set();
  }
  // Older plugin: derive by subtracting booking nights from merged blocked_dates.
  const merged = new Set(unit.blocked_dates ?? []);
  for (const b of unit.bookings ?? []) {
    if (!b.checkin || !b.checkout) continue;
    let cur = b.checkin;
    while (cur < b.checkout) {
      merged.delete(cur);
      cur = addDays(cur, 1);
    }
  }
  return merged;
}

function isManuallyBlocked(unit: WpAccAvailabilityUnit, day: string) {
  return manualBlockedSet(unit).has(day);
}

function flattenBookings(units: WpAccAvailabilityUnit[]) {
  const rows: Array<WpAccBookingRow & { unitTitle: string }> = [];
  for (const unit of units) {
    for (const b of unit.bookings ?? []) {
      rows.push({ ...b, unitTitle: resolveUnitLabel(unit, b) });
    }
  }
  return rows.sort((a, b) => (a.checkin ?? "").localeCompare(b.checkin ?? ""));
}

function formatMoney(n?: number) {
  if (n == null || Number.isNaN(n)) return "—";
  return `$${n}`;
}

export function AccommodationAvailabilityBoard({
  from,
  to,
  units: initialUnits,
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
  const [view, setView] = useState<CalendarView>("week");
  const [channelFilter, setChannelFilter] = useState<BookingChannelFilter>("all");
  /** When true, calendars/list show only the selected unit (all or filtered channels). */
  const [isolateUnit, setIsolateUnit] = useState(false);
  // Anchor on today — not `from` (often month start), which made week view open last week.
  const [anchor, setAnchor] = useState(() => todayLocalISO());
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [units, setUnits] = useState(initialUnits);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialUnits[0]?.id ?? null,
  );
  const [pendingBlock, setPendingBlock] = useState<string | null>(null);
  const [blockMsg, setBlockMsg] = useState<string | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [rateDraft, setRateDraft] = useState<{
    weekday_rate: string;
    weekend_rate: string;
    cleaning_fee: string;
  }>({ weekday_rate: "", weekend_rate: "", cleaning_fee: "" });
  const [savingRates, setSavingRates] = useState(false);
  const [rateMsg, setRateMsg] = useState<string | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);

  useEffect(() => {
    setUnits(initialUnits);
  }, [initialUnits]);

  useEffect(() => {
    if (selectedId == null || !units.some((u) => u.id === selectedId)) {
      setSelectedId(units[0]?.id ?? null);
    }
  }, [units, selectedId]);

  const selected = useMemo(
    () => units.find((u) => u.id === selectedId) ?? null,
    [units, selectedId],
  );

  useEffect(() => {
    if (!selected) {
      setRateDraft({ weekday_rate: "", weekend_rate: "", cleaning_fee: "" });
      return;
    }
    setRateDraft({
      weekday_rate:
        selected.weekday_rate != null ? String(selected.weekday_rate) : "",
      weekend_rate:
        selected.weekend_rate != null ? String(selected.weekend_rate) : "",
      cleaning_fee:
        selected.cleaning_fee != null ? String(selected.cleaning_fee) : "",
    });
    setRateMsg(null);
    setRateError(null);
    // Intentionally only when the selected unit changes — not on every rate/block patch.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync draft on unit switch only
  }, [selected?.id]);

  const weekStart = startOfWeek(anchor);
  const weekDays = daysBetween(weekStart, addDays(weekStart, 6));
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const monthDays = daysBetween(monthStart, monthEnd);
  // Full OTA horizon — do not truncate (was slice(0, 90) and hid later stays).
  const inventoryDays = daysBetween(from, to);
  const displayUnits = useMemo(() => {
    if (!isolateUnit || selectedId == null) return units;
    const one = units.find((u) => u.id === selectedId);
    return one ? [one] : units;
  }, [units, isolateUnit, selectedId]);

  const listBookings = useMemo(() => {
    const all = flattenBookings(displayUnits);
    if (channelFilter === "all") return all;
    return all.filter((b) => bookingMatchesChannel(b, channelFilter));
  }, [displayUnits, channelFilter]);

  const channelCounts = useMemo(() => {
    const all = flattenBookings(displayUnits);
    const counts: Record<BookingChannelFilter, number> = {
      all: all.length,
      airbnb: 0,
      bookingcom: 0,
      confirmed: 0,
      pending: 0,
    };
    for (const b of all) {
      const key = channelKey(b);
      if (key === "airbnb" || key === "bookingcom" || key === "confirmed" || key === "pending") {
        counts[key]++;
      } else if (key === "completed") {
        counts.confirmed++;
      }
    }
    return counts;
  }, [displayUnits]);

  async function syncOta() {
    setSyncing(true);
    setSyncMsg(null);
    // Pull the same 2-year horizon the calendar page loads.
    const syncTo = addDays(todayLocalISO(), ACC_CALENDAR_HORIZON_DAYS);
    const res = await fetch("/api/v1/accommodation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sync_ota",
        source: "all",
        from: todayLocalISO(),
        to: syncTo,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSyncing(false);
    if (!res.ok) {
      setSyncMsg(
        json.error?.message ??
          "OTA sync failed — add Airbnb/Booking.com export calendar URLs on each unit, then try again",
      );
      return;
    }
    setSyncMsg(
      json.data?.message ??
        (json.data?.neon && typeof json.data.neon === "object" && "created" in json.data.neon
          ? `Calendars synced · ${String((json.data.neon as { created?: number }).created ?? 0)} new on platform`
          : "Airbnb & Booking.com calendars synced to platform"),
    );
    router.refresh();
  }

  async function saveRates() {
    if (!selected) return;
    setSavingRates(true);
    setRateMsg(null);
    setRateError(null);
    const weekday =
      rateDraft.weekday_rate === "" ? undefined : Number(rateDraft.weekday_rate);
    const weekend =
      rateDraft.weekend_rate === "" ? undefined : Number(rateDraft.weekend_rate);
    const cleaning =
      rateDraft.cleaning_fee === "" ? undefined : Number(rateDraft.cleaning_fee);
    const res = await fetch("/api/v1/accommodation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource: "units",
        updates: [
          {
            id: selected.id,
            weekday_rate: weekday,
            weekend_rate: weekend,
            cleaning_fee: cleaning,
          },
        ],
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSavingRates(false);
    if (!res.ok) {
      setRateError(
        json.error?.message ??
          "Could not save rates — deploy plugin v10.58.0+ on CVH.",
      );
      return;
    }
    setUnits((prev) =>
      prev.map((u) =>
        u.id === selected.id
          ? {
              ...u,
              weekday_rate: weekday,
              weekend_rate: weekend,
              cleaning_fee: cleaning,
            }
          : u,
      ),
    );
    setRateMsg(`Saved rates for ${selected.title}`);
    router.refresh();
  }

  async function toggleManualBlock(unitId: number, day: string) {
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return;
    if (bookingOnDay(unit, day)) {
      setBlockError("That night has a booking — cancel or move the stay first.");
      return;
    }

    const blocked = isManuallyBlocked(unit, day);
    const key = `${unitId}:${day}`;
    const snapshot = units;
    setPendingBlock(key);
    setBlockMsg(null);
    setBlockError(null);

    // Optimistic update
    setUnits((prev) =>
      prev.map((u) => {
        if (u.id !== unitId) return u;
        const set = manualBlockedSet(u);
        if (blocked) set.delete(day);
        else set.add(day);
        const next = Array.from(set).sort();
        return {
          ...u,
          manual_blocked_dates: next,
        };
      }),
    );

    const res = await fetch("/api/v1/accommodation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource: "units",
        updates: [
          blocked
            ? { id: unitId, unblock_dates: [day] }
            : { id: unitId, block_dates: [day] },
        ],
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPendingBlock(null);
    if (!res.ok) {
      setUnits(snapshot);
      setBlockError(
        json.error?.message ??
          "Could not update block — deploy plugin v10.62.0+ on CVH.",
      );
      return;
    }

    const updated = Array.isArray(json.data?.updated)
      ? (json.data.updated as Array<{
          id: number;
          manual_blocked_dates?: string[];
          blocked_dates?: string[];
        }>)
      : [];
    const row = updated.find((r) => r.id === unitId);
    if (row) {
      setUnits((prev) =>
        prev.map((u) =>
          u.id === unitId
            ? {
                ...u,
                manual_blocked_dates: row.manual_blocked_dates ?? u.manual_blocked_dates,
                blocked_dates: row.blocked_dates ?? u.blocked_dates,
              }
            : u,
        ),
      );
    }

    setBlockMsg(
      blocked
        ? `${unit.title}: ${day} unblocked`
        : `${unit.title}: ${day} blocked`,
    );
    setSelectedId(unitId);
    router.refresh();
  }

  if (error) {
    return (
      <div className="dg-card border-amber-500/30">
        <p className="text-amber-300">{error}</p>
        <p className="mt-2 text-sm text-slate-500">
          Deploy plugin v10.62.0+ on CVH and set the org WordPress API key under Settings →
          Connectors.
        </p>
      </div>
    );
  }

  if (!units.length) {
    return (
      <div className="dg-card border-dashed border-slate-700">
        <h2 className="text-lg font-semibold text-white">Add your first units</h2>
        {siteLabel ? <p className="mt-1 text-sm text-slate-500">Site: {siteLabel}</p> : null}
        <p className="mt-2 text-sm text-slate-500">
          Sync units on the Units page (Neon, or Import from WordPress when migrating), then use
          week / month / list views and OTA iCal sync here.
        </p>
        <a
          href="/apps/accommodation/units"
          className="mt-4 inline-block rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Open units
        </a>
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
          {blockMsg ? <p className="mt-1 text-xs text-emerald-400">{blockMsg}</p> : null}
          {blockError ? <p className="mt-1 text-xs text-amber-400">{blockError}</p> : null}
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
                    setAnchor(toLocalISODate(d));
                  }
                }}
              >
                ←
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300"
                onClick={() => setAnchor(todayLocalISO())}
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
                    setAnchor(toLocalISODate(d));
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

      <UnitPricingPanel
        units={units}
        selectedId={selectedId}
        onSelect={setSelectedId}
        draft={rateDraft}
        onDraftChange={setRateDraft}
        saving={savingRates}
        onSave={() => void saveRates()}
        message={rateMsg}
        error={rateError}
        channelFilter={channelFilter}
        channelCounts={channelCounts}
        onChannelFilterChange={setChannelFilter}
        isolateUnit={isolateUnit}
        onIsolateUnitChange={setIsolateUnit}
        monthHint={view === "month"}
      />

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
        <span className="text-slate-600">
          Click an open or blocked cell to toggle a manual block · OTA horizon{" "}
          {from} → {to}
        </span>
      </div>

      {view === "inventory" ? (
        <>
          <p className="text-[11px] text-slate-500">
            Inventory shows the full OTA horizon ({from} → {to}) — scroll horizontally for later
            stays. Spanning bars use the same stay list as Bookings.
          </p>
          <InventoryGrid
            units={displayUnits}
            days={inventoryDays}
            selectedId={selectedId}
            pendingBlock={pendingBlock}
            channelFilter={channelFilter}
            onSelectUnit={setSelectedId}
            onToggleDay={(unitId, day) => void toggleManualBlock(unitId, day)}
          />
        </>
      ) : null}
      {view === "week" ? (
        <WeekGrid
          units={displayUnits}
          days={weekDays}
          title={`${formatDayLabel(weekStart, "long")} – ${formatDayLabel(weekDays[6]!, "long")}`}
          selectedId={selectedId}
          pendingBlock={pendingBlock}
          channelFilter={channelFilter}
          onSelectUnit={setSelectedId}
          onToggleDay={(unitId, day) => void toggleManualBlock(unitId, day)}
        />
      ) : null}
      {view === "month" ? (
        <MonthGrid
          units={displayUnits}
          days={monthDays}
          title={new Date(`${monthStart}T12:00:00`).toLocaleDateString("en-AU", {
            month: "long",
            year: "numeric",
          })}
          selectedId={selectedId}
          pendingBlock={pendingBlock}
          channelFilter={channelFilter}
          onToggleDay={(unitId, day) => void toggleManualBlock(unitId, day)}
        />
      ) : null}
      {view === "list" ? <ListView bookings={listBookings} /> : null}
    </div>
  );
}

function UnitPricingPanel({
  units,
  selectedId,
  onSelect,
  draft,
  onDraftChange,
  saving,
  onSave,
  message,
  error,
  channelFilter,
  channelCounts,
  onChannelFilterChange,
  isolateUnit,
  onIsolateUnitChange,
  monthHint,
}: {
  units: WpAccAvailabilityUnit[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  draft: { weekday_rate: string; weekend_rate: string; cleaning_fee: string };
  onDraftChange: (d: {
    weekday_rate: string;
    weekend_rate: string;
    cleaning_fee: string;
  }) => void;
  saving: boolean;
  onSave: () => void;
  message: string | null;
  error: string | null;
  channelFilter: BookingChannelFilter;
  channelCounts: Record<BookingChannelFilter, number>;
  onChannelFilterChange: (filter: BookingChannelFilter) => void;
  isolateUnit: boolean;
  onIsolateUnitChange: (isolate: boolean) => void;
  monthHint?: boolean;
}) {
  const selected = units.find((u) => u.id === selectedId) ?? null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Calendars
        </span>
        {CHANNEL_FILTERS.map((f) => {
          const active = channelFilter === f.id;
          const count = channelCounts[f.id];
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onChannelFilterChange(f.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-blue-500/60 bg-blue-600 text-white"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white"
              }`}
            >
              {f.swatch ? (
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: f.swatch }}
                  aria-hidden
                />
              ) : null}
              {f.label}
              <span className={active ? "text-blue-100/80" : "text-slate-500"}>
                {count}
              </span>
            </button>
          );
        })}
        <span className="text-[11px] text-slate-600">
          {isolateUnit && selected
            ? `Counts for ${selected.title}`
            : "Platform filter · all units unless isolated below"}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[180px] flex-1 flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-slate-500">
            Unit
          </span>
          <select
            value={selectedId ?? ""}
            onChange={(e) => onSelect(Number(e.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.title}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-slate-500">
            Calendar scope
          </span>
          <div className="flex rounded-lg border border-slate-700 p-0.5">
            <button
              type="button"
              onClick={() => onIsolateUnitChange(false)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                !isolateUnit
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All units
            </button>
            <button
              type="button"
              onClick={() => onIsolateUnitChange(true)}
              disabled={selectedId == null}
              className={`rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-40 ${
                isolateUnit
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
              title={
                selected
                  ? `Show only ${selected.title} across Airbnb, Booking.com, Direct…`
                  : "Select a unit first"
              }
            >
              This unit only
            </button>
          </div>
        </div>
        <label className="flex w-28 flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-slate-500">
            Weekday
          </span>
          <input
            type="number"
            value={draft.weekday_rate}
            onChange={(e) =>
              onDraftChange({ ...draft, weekday_rate: e.target.value })
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="250"
          />
        </label>
        <label className="flex w-28 flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-slate-500">
            Weekend
          </span>
          <input
            type="number"
            value={draft.weekend_rate}
            onChange={(e) =>
              onDraftChange({ ...draft, weekend_rate: e.target.value })
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="350"
          />
        </label>
        <label className="flex w-28 flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-slate-500">
            Cleaning
          </span>
          <input
            type="number"
            value={draft.cleaning_fee}
            onChange={(e) =>
              onDraftChange({ ...draft, cleaning_fee: e.target.value })
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="80"
          />
        </label>
        <button
          type="button"
          disabled={saving || !selected}
          onClick={onSave}
          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save rates"}
        </button>
      </div>
      {selected ? (
        <p className="mt-2 text-xs text-slate-500">
          Editing <span className="text-slate-300">{selected.title}</span>
          {isolateUnit ? " · calendar shows this unit only (all platforms)" : null}
          {monthHint
            ? " · in Month view, clicks toggle blocks for this unit"
            : null}
        </p>
      ) : null}
      {message ? <p className="mt-1 text-xs text-emerald-400">{message}</p> : null}
      {error ? <p className="mt-1 text-xs text-amber-400">{error}</p> : null}
    </div>
  );
}

function assignSpanLanes(
  spans: BookingSpan[],
): Array<BookingSpan & { lane: number }> {
  const sorted = [...spans].sort(
    (a, b) => a.startIdx - b.startIdx || a.endIdx - b.endIdx,
  );
  const laneEnds: number[] = [];
  return sorted.map((span) => {
    let lane = laneEnds.findIndex((end) => end < span.startIdx);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(span.endIdx);
    } else {
      laneEnds[lane] = span.endIdx;
    }
    return { ...span, lane };
  });
}

function StaySpanBar({
  span,
  dayCount,
  compact,
  lane,
  laneCount,
}: {
  span: BookingSpan;
  dayCount: number;
  compact?: boolean;
  lane: number;
  laneCount: number;
}) {
  const guest = span.booking.guest_name?.trim() || "Guest";
  const channel = span.booking.source || span.booking.status || "";
  const nightsLabel = formatNightsLabel(span.nights);
  const leftPct = (span.startIdx / dayCount) * 100;
  const widthPct = ((span.endIdx - span.startIdx + 1) / dayCount) * 100;
  const radiusLeft = span.continuesBefore ? "2px" : "999px";
  const radiusRight = span.continuesAfter ? "2px" : "999px";
  const barH = compact ? 18 : 32;
  const gap = 3;
  const top = lane * (barH + gap) + (compact ? 4 : 8);
  const title = [
    guest,
    channel,
    nightsLabel,
    `${span.booking.checkin} → ${span.booking.checkout}`,
    span.continuesBefore || span.continuesAfter ? "(continues outside this view)" : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={`pointer-events-none absolute z-[1] flex items-center overflow-hidden px-2 text-white shadow-sm ${
        compact ? "text-[9px]" : "text-[10px]"
      }`}
      style={{
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        top,
        height: barH,
        backgroundColor: bookingColor(span.booking),
        borderRadius: `${radiusLeft} ${radiusRight} ${radiusRight} ${radiusLeft}`,
      }}
      title={title}
      data-lanes={laneCount}
    >
      <p className="min-w-0 truncate font-semibold leading-tight">
        {span.continuesBefore ? "← " : ""}
        {guest}
        {nightsLabel ? (
          <span className="font-medium opacity-90">{` · ${nightsLabel}`}</span>
        ) : null}
        {span.continuesAfter ? " →" : ""}
      </p>
    </div>
  );
}

function UnitDayTimeline({
  unit,
  days,
  pendingBlock,
  channelFilter,
  compact,
  onSelectUnit,
  onToggleDay,
}: {
  unit: WpAccAvailabilityUnit;
  days: string[];
  pendingBlock: string | null;
  channelFilter: BookingChannelFilter;
  compact?: boolean;
  onSelectUnit: (id: number) => void;
  onToggleDay: (unitId: number, day: string) => void;
}) {
  const showManual = channelFilter === "all";
  const spans = assignSpanLanes(bookingSpansForUnit(unit, days, channelFilter));
  const laneCount = Math.max(1, ...spans.map((s) => s.lane + 1), 1);
  const barH = compact ? 18 : 32;
  const gap = 3;
  const padY = compact ? 4 : 8;
  const rowMinH = padY * 2 + laneCount * barH + Math.max(0, laneCount - 1) * gap;
  const bookedNights = new Set<string>();
  for (const span of spans) {
    for (let i = span.startIdx; i <= span.endIdx; i += 1) {
      const day = days[i];
      if (day) bookedNights.add(day);
    }
  }

  return (
    <div
      className="relative grid min-w-0"
      style={{
        gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
        minHeight: rowMinH,
      }}
    >
      {days.map((d) => {
        const booked = bookedNights.has(d);
        const isBlocked = showManual && isManuallyBlocked(unit, d);
        const busy = pendingBlock === `${unit.id}:${d}`;
        if (booked) {
          return <div key={d} className="min-h-full px-0.5" aria-hidden />;
        }
        return (
          <div key={d} className="flex items-center justify-center px-0.5 py-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onSelectUnit(unit.id);
                onToggleDay(unit.id, d);
              }}
              className={`rounded-md outline-none ring-offset-1 ring-offset-slate-950 transition hover:ring-2 hover:ring-white/40 focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50 ${
                compact
                  ? `h-6 w-6 rounded-sm ${isBlocked ? "ring-1 ring-slate-400/50" : ""}`
                  : `flex h-10 w-full items-center justify-center text-[10px] ${
                      isBlocked ? "font-medium text-slate-200" : "text-slate-500"
                    }`
              }`}
              style={{
                backgroundColor: isBlocked
                  ? CHANNEL_COLORS.blocked.bg
                  : CHANNEL_COLORS.open.bg,
              }}
              title={
                isBlocked
                  ? "Manual block — click to unblock"
                  : "Open — click to block"
              }
              aria-label={
                isBlocked
                  ? `Unblock ${unit.title} on ${d}`
                  : `Block ${unit.title} on ${d}`
              }
            >
              {compact ? null : busy ? "…" : isBlocked ? "Blocked" : "Open"}
            </button>
          </div>
        );
      })}
      {spans.map((span) => (
        <StaySpanBar
          key={`${span.booking.platform_id || (span.booking.id && span.booking.id > 0 ? span.booking.id : "b")}-${span.startIdx}-${span.endIdx}-${span.lane}`}
          span={span}
          dayCount={days.length}
          compact={compact}
          lane={span.lane}
          laneCount={laneCount}
        />
      ))}
    </div>
  );
}

function InventoryGrid({
  units,
  days,
  selectedId,
  pendingBlock,
  channelFilter,
  onSelectUnit,
  onToggleDay,
}: {
  units: WpAccAvailabilityUnit[];
  days: string[];
  selectedId: number | null;
  pendingBlock: string | null;
  channelFilter: BookingChannelFilter;
  onSelectUnit: (id: number) => void;
  onToggleDay: (unitId: number, day: string) => void;
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
            return (
              <tr
                key={unit.id}
                className={`border-t border-slate-800 ${
                  selectedId === unit.id ? "bg-slate-900/40" : ""
                }`}
              >
                <td className="sticky left-0 z-10 bg-slate-950 px-3 py-2 font-medium text-white">
                  <button
                    type="button"
                    className="text-left hover:text-blue-300"
                    onClick={() => onSelectUnit(unit.id)}
                  >
                    {unit.title}
                  </button>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {formatMoney(unit.weekday_rate)} / {formatMoney(unit.weekend_rate)}
                    <span className="mx-1 text-slate-700">·</span>
                    <span className="capitalize">{unit.listing_status ?? "bookable"}</span>
                  </p>
                </td>
                <td colSpan={days.length} className="p-0 align-middle">
                  <UnitDayTimeline
                    unit={unit}
                    days={days}
                    pendingBlock={pendingBlock}
                    channelFilter={channelFilter}
                    compact
                    onSelectUnit={onSelectUnit}
                    onToggleDay={onToggleDay}
                  />
                </td>
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
  selectedId,
  pendingBlock,
  channelFilter,
  onSelectUnit,
  onToggleDay,
}: {
  units: WpAccAvailabilityUnit[];
  days: string[];
  title: string;
  selectedId: number | null;
  pendingBlock: string | null;
  channelFilter: BookingChannelFilter;
  onSelectUnit: (id: number) => void;
  onToggleDay: (unitId: number, day: string) => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-slate-300">{title}</h2>
      <p className="text-[11px] text-slate-500">
        Stays span across nights like Airbnb — label shows guest and length. Open cells toggle
        manual blocks.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[900px] table-fixed border-collapse text-left text-xs">
          <colgroup>
            <col className="w-40" />
            <col />
          </colgroup>
          <thead className="bg-slate-900/60 text-slate-500">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-950 px-3 py-2">Unit</th>
              <th className="p-0">
                <div
                  className="grid"
                  style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
                >
                  {days.map((d) => (
                    <div
                      key={d}
                      className="px-1.5 py-2 text-center font-normal text-slate-400"
                    >
                      {formatDayLabel(d, "long")}
                    </div>
                  ))}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => {
              return (
                <tr
                  key={unit.id}
                  className={`border-t border-slate-800 ${
                    selectedId === unit.id ? "bg-slate-900/30" : ""
                  }`}
                >
                  <td className="sticky left-0 z-10 bg-slate-950 px-3 py-2 font-medium text-white">
                    <button
                      type="button"
                      className="text-left hover:text-blue-300"
                      onClick={() => onSelectUnit(unit.id)}
                    >
                      {unit.title}
                    </button>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {formatMoney(unit.weekday_rate)} / {formatMoney(unit.weekend_rate)}
                    </p>
                  </td>
                  <td className="p-0 align-middle">
                    <UnitDayTimeline
                      unit={unit}
                      days={days}
                      pendingBlock={pendingBlock}
                      channelFilter={channelFilter}
                      onSelectUnit={onSelectUnit}
                      onToggleDay={onToggleDay}
                    />
                  </td>
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
  selectedId,
  pendingBlock,
  channelFilter,
  onToggleDay,
}: {
  units: WpAccAvailabilityUnit[];
  days: string[];
  title: string;
  selectedId: number | null;
  pendingBlock: string | null;
  channelFilter: BookingChannelFilter;
  onToggleDay: (unitId: number, day: string) => void;
}) {
  const showManual = channelFilter === "all";
  // Pad to Sunday-start weeks
  const lead = (() => {
    const d = new Date(`${days[0]}T12:00:00`);
    return d.getDay(); // 0 Sun … 6 Sat
  })();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selected = units.find((u) => u.id === selectedId) ?? units[0] ?? null;

  // Every occupied night in the stay range (check-in inclusive, check-out exclusive),
  // including stays that started before this month.
  const byDay = new Map<
    string,
    Array<{
      unitId: number;
      unitLabel: string;
      booking: WpAccBookingRow;
      isCheckin: boolean;
    }>
  >();
  for (const unit of units) {
    for (const day of days) {
      for (const booking of bookingsOnDay(unit, day, channelFilter)) {
        const list = byDay.get(day) ?? [];
        list.push({
          unitId: unit.id,
          unitLabel: resolveUnitLabel(unit, booking),
          booking,
          isCheckin: booking.checkin === day,
        });
        byDay.set(day, list);
      }
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-slate-300">{title}</h2>
      <p className="text-[11px] text-slate-500">
        Booked nights shown for each stay (check-in inclusive, check-out day free).
        {selected
          ? ` Click empty days to toggle a manual block on ${selected.title}.`
          : null}
        {channelFilter !== "all"
          ? ` · Filtering to ${CHANNEL_FILTERS.find((f) => f.id === channelFilter)?.label}.`
          : null}
      </p>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="bg-slate-950 px-2 py-1.5 text-center text-[10px] font-medium uppercase text-slate-500"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const entries = day ? byDay.get(day) ?? [] : [];
          const primary = entries[0];
          const selectedBlocked =
            day && selected && showManual ? isManuallyBlocked(selected, day) : false;
          const selectedBooked =
            day && selected ? bookingsOnDay(selected, day).length > 0 : false;
          const busy =
            day && selected ? pendingBlock === `${selected.id}:${day}` : false;
          const canToggle = Boolean(day && selected && !selectedBooked);

          return (
            <div
              key={day ?? `pad-${i}`}
              className="min-h-[100px] bg-slate-950 p-1.5"
              style={
                primary
                  ? { backgroundColor: bookingWash(primary.booking) }
                  : selectedBlocked
                    ? { backgroundColor: "rgba(51, 65, 85, 0.45)" }
                    : undefined
              }
            >
              {day ? (
                <>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] text-slate-500">{day.slice(8)}</p>
                    {canToggle && selected ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onToggleDay(selected.id, day)}
                        className={`rounded px-1.5 py-0.5 text-[9px] font-medium disabled:opacity-50 ${
                          selectedBlocked
                            ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
                            : "bg-emerald-900/60 text-emerald-300 hover:bg-emerald-800/70"
                        }`}
                        title={
                          selectedBlocked
                            ? `Unblock ${selected.title}`
                            : `Block ${selected.title}`
                        }
                      >
                        {busy ? "…" : selectedBlocked ? "Unblock" : "Block"}
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-1 space-y-1">
                    {entries.slice(0, 3).map(({ unitId, unitLabel, booking, isCheckin }) => {
                      const guest = booking.guest_name?.trim() || "Guest";
                      const nights = stayNightCount(booking);
                      const nightsLabel = formatNightsLabel(nights);
                      const rowKey =
                        booking.platform_id ||
                        (booking.id && booking.id > 0
                          ? `wp-${booking.id}`
                          : `${booking.checkin}-${booking.checkout}-${guest}`);
                      return (
                        <div
                          key={`${rowKey}-${unitId}-${day}`}
                          className="rounded px-1 py-0.5 text-[10px] leading-tight text-white"
                          style={{
                            backgroundColor: bookingColor(booking),
                            opacity: isCheckin ? 1 : 0.85,
                            borderRadius: isCheckin ? "6px 2px 2px 6px" : "2px",
                          }}
                          title={`${unitLabel}: ${guest} · ${nightsLabel} · ${booking.checkin} → ${booking.checkout}`}
                        >
                          <p className="truncate font-semibold">
                            {isCheckin ? unitLabel : `→ ${unitLabel}`}
                          </p>
                          <p className="truncate text-[9px] font-normal opacity-85">
                            {isCheckin
                              ? `${guest}${nightsLabel ? ` · ${nightsLabel}` : ""}`
                              : guest}
                          </p>
                        </div>
                      );
                    })}
                    {entries.length > 3 ? (
                      <p className="text-[10px] text-slate-500">
                        +{entries.length - 3} more
                      </p>
                    ) : null}
                    {selectedBlocked && !selectedBooked && selected ? (
                      <div
                        className="rounded px-1 py-0.5 text-[10px] leading-tight text-slate-300"
                        style={{ backgroundColor: CHANNEL_COLORS.blocked.bg }}
                        title={`Manual block · ${selected.title}`}
                      >
                        <p className="truncate font-semibold">
                          {resolveUnitLabel(selected)}
                        </p>
                        <p className="truncate text-[9px] opacity-85">Blocked</p>
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
            <th className="px-4 py-3">Length</th>
            <th className="px-4 py-3">Channel</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => {
            const channel = channelKey(b);
            const nights = stayNightCount(b);
            return (
              <tr
                key={
                  b.platform_id ||
                  (b.id && b.id > 0 ? `wp-${b.id}` : `${b.checkin}-${b.checkout}-${b.guest_name ?? ""}`)
                }
                className="border-t border-slate-800"
              >
                <td className="px-4 py-3 text-white">{b.guest_name ?? b.ref ?? "Guest"}</td>
                <td className="px-4 py-3 text-slate-300">{b.unitTitle}</td>
                <td className="px-4 py-3 text-slate-400">
                  {b.checkin} → {b.checkout}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatNightsLabel(nights) || "—"}
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
