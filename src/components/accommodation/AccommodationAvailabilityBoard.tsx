"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
    const start = new Date(`${b.checkin}T00:00:00Z`);
    const end = new Date(`${b.checkout}T00:00:00Z`);
    for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
      merged.delete(d.toISOString().slice(0, 10));
    }
  }
  return merged;
}

function bookingNightSet(unit: WpAccAvailabilityUnit): Set<string> {
  const nights = new Set<string>();
  for (const b of unit.bookings ?? []) {
    if (!b.checkin || !b.checkout) continue;
    const start = new Date(`${b.checkin}T00:00:00Z`);
    const end = new Date(`${b.checkout}T00:00:00Z`);
    for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
      nights.add(d.toISOString().slice(0, 10));
    }
  }
  return nights;
}

/** Merged calendar nights = manual blocks ∪ booking nights (matches Neon availability). */
function mergedBlockedDates(unit: WpAccAvailabilityUnit, manual: string[]): string[] {
  return Array.from(new Set([...manual, ...bookingNightSet(unit)])).sort();
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

/** Stable unit identity — Gen2 rows often share id=0; prefer Neon platform_id. */
function sameUnit(
  a: Pick<WpAccAvailabilityUnit, "id" | "platform_id">,
  b: Pick<WpAccAvailabilityUnit, "id" | "platform_id">,
): boolean {
  const ap = a.platform_id?.trim();
  const bp = b.platform_id?.trim();
  if (ap && bp) return ap === bp;
  if (a.id > 0 && b.id > 0) return a.id === b.id;
  return false;
}

function findUnitInList(
  list: WpAccAvailabilityUnit[],
  unitId: number,
  platformId?: string | null,
): WpAccAvailabilityUnit | undefined {
  const pid = platformId?.trim();
  if (pid) {
    const byPlatform = list.find((u) => u.platform_id?.trim() === pid);
    if (byPlatform) return byPlatform;
  }
  if (unitId > 0) return list.find((u) => u.id === unitId);
  return undefined;
}

function pendingBlockKey(
  unit: Pick<WpAccAvailabilityUnit, "id" | "platform_id">,
  day: string,
): string {
  return `${unit.platform_id?.trim() || unit.id}:${day}`;
}

export function AccommodationAvailabilityBoard({
  from,
  to,
  units: initialUnits,
  error,
  siteLabel,
  horizonDays = 730,
}: {
  from: string;
  to: string;
  units: WpAccAvailabilityUnit[];
  error?: string;
  siteLabel?: string;
  /** How far ahead OTA sync pulls — passed from the server so this client file stays off the platform-core barrel. */
  horizonDays?: number;
}) {
  const router = useRouter();
  const [view, setView] = useState<CalendarView>("month");
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
    const syncTo = addDays(todayLocalISO(), horizonDays);
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
          ? `Pulled OTA calendars · ${String((json.data.neon as { created?: number }).created ?? 0)} new on platform`
          : "Pulled Airbnb & Booking.com into DigitalGate (manual blocks go out via each unit’s export calendar)"),
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
            platform_id: selected.platform_id,
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

  async function toggleManualBlock(unit: WpAccAvailabilityUnit, day: string) {
    const current = findUnitInList(units, unit.id, unit.platform_id) ?? unit;
    if (bookingOnDay(current, day)) {
      setBlockError("That night has a booking — cancel or move the stay first.");
      return;
    }

    const blocked = isManuallyBlocked(current, day);
    const key = pendingBlockKey(current, day);
    const snapshot = units;
    const set = manualBlockedSet(current);
    if (blocked) set.delete(day);
    else set.add(day);
    const next = Array.from(set).sort();

    setPendingBlock(key);
    setBlockMsg(null);
    setBlockError(null);

    // Optimistic update — keep booking nights in blocked_dates (merged calendar).
    setUnits((prev) =>
      prev.map((u) =>
        sameUnit(u, current)
          ? {
              ...u,
              manual_blocked_dates: next,
              blocked_dates: mergedBlockedDates(u, next),
            }
          : u,
      ),
    );

    const res = await fetch("/api/v1/accommodation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource: "units",
        updates: [
          {
            id: current.id,
            platform_id: current.platform_id,
            // Full list + delta so Neon persists even if one field is ignored.
            manual_blocked_dates: next,
            ...(blocked ? { unblock_dates: [day] } : { block_dates: [day] }),
          },
        ],
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPendingBlock(null);
    if (!res.ok) {
      setUnits(snapshot);
      setBlockError(
        json.error?.message ??
          "Could not update block — try again or check unit sync.",
      );
      return;
    }

    const updated = Array.isArray(json.data?.updated)
      ? (json.data.updated as Array<{
          id?: number;
          platform_id?: string;
          manual_blocked_dates?: string[];
          blocked_dates?: string[];
        }>)
      : [];
    const row = updated.find(
      (r) =>
        (current.platform_id && r.platform_id === current.platform_id) ||
        (current.id > 0 && r.id === current.id),
    );
    const saved =
      row?.manual_blocked_dates ?? row?.blocked_dates ?? next;
    setUnits((prev) =>
      prev.map((u) =>
        sameUnit(u, current)
          ? {
              ...u,
              manual_blocked_dates: saved,
              blocked_dates: mergedBlockedDates(u, saved),
            }
          : u,
      ),
    );

    setBlockMsg(
      blocked
        ? `${current.title}: ${day} unblocked · live on DigitalGate export calendar`
        : `${current.title}: ${day} blocked · live on DigitalGate export calendar (Airbnb/Booking.com pull on next sync)`,
    );
    setSelectedId(current.id);
    // Do not router.refresh() here — it was reloading stale RSC props and wiping
    // the optimistic/persisted block before Neon re-read settled.
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
      <div>
        <p className="text-sm text-slate-500">
          {siteLabel ? `${siteLabel} · ` : ""}
          {from} → {to}
        </p>
        {syncMsg ? <p className="mt-1 text-xs text-emerald-400">{syncMsg}</p> : null}
        {blockMsg ? <p className="mt-1 text-xs text-emerald-400">{blockMsg}</p> : null}
        {blockError ? <p className="mt-1 text-xs text-amber-400">{blockError}</p> : null}
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

      <div className="space-y-2">
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

        {/* Sticky on mobile so Inventory/Week/Month/List + Sync sit on the calendar */}
        <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-slate-950/80">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
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
          </div>
          <button
            type="button"
            disabled={syncing}
            title="Pull Airbnb & Booking.com into DigitalGate. Manual blocks go out on each unit’s DigitalGate export calendar URL."
            onClick={() => void syncOta()}
            className="shrink-0 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {syncing ? "Syncing…" : "Sync Airbnb & Booking.com"}
          </button>
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
              onToggleDay={(u, day) => void toggleManualBlock(u, day)}
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
            onToggleDay={(u, day) => void toggleManualBlock(u, day)}
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
            onToggleDay={(u, day) => void toggleManualBlock(u, day)}
          />
        ) : null}
        {view === "list" ? <ListView bookings={listBookings} /> : null}
      </div>
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

function assignSpanLanes<T extends BookingSpan>(
  spans: T[],
): Array<T & { lane: number }> {
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

function guestBarLabel(booking: WpAccBookingRow): string {
  const guest = booking.guest_name?.trim() || "Guest";
  const guests = typeof booking.guests === "number" ? booking.guests : null;
  if (guests != null && guests > 1) return `${guest} + ${guests - 1}`;
  return guest;
}

function guestInitial(booking: WpAccBookingRow): string {
  const guest = booking.guest_name?.trim() || "G";
  return guest.charAt(0).toUpperCase();
}

function StaySpanBar({
  span,
  dayCount,
  compact,
  lane,
  laneCount,
  showAvatar,
  subtitle,
}: {
  span: BookingSpan;
  dayCount: number;
  compact?: boolean;
  lane: number;
  laneCount: number;
  /** Airbnb-style avatar + guest (+N) label */
  showAvatar?: boolean;
  subtitle?: string;
}) {
  const guest = span.booking.guest_name?.trim() || "Guest";
  const label = showAvatar ? guestBarLabel(span.booking) : guest;
  const channel = span.booking.source || span.booking.status || "";
  const nightsLabel = formatNightsLabel(span.nights);
  const leftPct = (span.startIdx / dayCount) * 100;
  const widthPct = ((span.endIdx - span.startIdx + 1) / dayCount) * 100;
  const radiusLeft = span.continuesBefore ? "4px" : "999px";
  const radiusRight = span.continuesAfter ? "4px" : "999px";
  const barH = compact ? 18 : showAvatar ? 26 : 32;
  const gap = 3;
  const top = lane * (barH + gap) + (compact ? 4 : showAvatar ? 28 : 8);
  const title = [
    guest,
    subtitle,
    channel,
    nightsLabel,
    `${span.booking.checkin} → ${span.booking.checkout}`,
    span.continuesBefore || span.continuesAfter ? "(continues outside this view)" : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={`pointer-events-none absolute z-[1] flex items-center gap-1.5 overflow-hidden text-white shadow-sm ${
        compact ? "px-1.5 text-[9px]" : showAvatar ? "px-1.5 text-[11px]" : "px-2 text-[10px]"
      }`}
      style={{
        left: `calc(${leftPct}% + 3px)`,
        width: `calc(${widthPct}% - 6px)`,
        top,
        height: barH,
        backgroundColor: bookingColor(span.booking),
        borderRadius: `${radiusLeft} ${radiusRight} ${radiusRight} ${radiusLeft}`,
      }}
      title={title}
      data-lanes={laneCount}
    >
      {showAvatar && !span.continuesBefore ? (
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold"
          aria-hidden
        >
          {guestInitial(span.booking)}
        </span>
      ) : null}
      <p className="min-w-0 truncate font-semibold leading-tight">
        {span.continuesBefore ? "← " : ""}
        {label}
        {!showAvatar && nightsLabel ? (
          <span className="font-medium opacity-90">{` · ${nightsLabel}`}</span>
        ) : null}
        {subtitle && showAvatar ? (
          <span className="font-medium opacity-80">{` · ${subtitle}`}</span>
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
  onToggleDay: (unit: WpAccAvailabilityUnit, day: string) => void;
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
        const busy = pendingBlock === pendingBlockKey(unit, d);
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
                onToggleDay(unit, d);
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
  onToggleDay: (unit: WpAccAvailabilityUnit, day: string) => void;
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
  onToggleDay: (unit: WpAccAvailabilityUnit, day: string) => void;
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

type MonthStay = {
  booking: WpAccBookingRow;
  unitId: number;
  unitLabel: string;
  key: string;
};

function bookingDedupeKey(booking: WpAccBookingRow, unitId: number): string {
  return (
    (typeof booking.platform_id === "string" && booking.platform_id.trim()) ||
    (typeof booking.id === "number" && booking.id > 0 ? `wp-${booking.id}` : "") ||
    `${unitId}:${booking.checkin}:${booking.checkout}:${booking.guest_name ?? ""}:${booking.source ?? booking.status ?? ""}`
  );
}

/** Unique stays overlapping the month (one bar per stay, not per night). */
function collectMonthStays(
  units: WpAccAvailabilityUnit[],
  days: string[],
  filter: BookingChannelFilter,
): MonthStay[] {
  if (!days.length) return [];
  const rangeStart = days[0]!;
  const rangeEnd = days[days.length - 1]!;
  const seen = new Set<string>();
  const out: MonthStay[] = [];

  for (const unit of units) {
    for (const booking of unit.bookings ?? []) {
      if (!booking.checkin || !booking.checkout) continue;
      if (!bookingMatchesChannel(booking, filter)) continue;
      if (booking.checkout <= rangeStart || booking.checkin > rangeEnd) continue;
      const key = bookingDedupeKey(booking, unit.id);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        booking,
        unitId: unit.id,
        unitLabel: resolveUnitLabel(unit, booking),
        key,
      });
    }
  }

  return out.sort(
    (a, b) =>
      (a.booking.checkin ?? "").localeCompare(b.booking.checkin ?? "") ||
      (a.booking.checkout ?? "").localeCompare(b.booking.checkout ?? ""),
  );
}

/** Clip a stay onto one Sunday–Saturday week row (column indices 0–6). */
function clipStayToWeek(
  stay: MonthStay,
  weekCells: (string | null)[],
): (BookingSpan & { unitLabel: string; unitId: number; key: string }) | null {
  let startIdx: number | null = null;
  let endIdx: number | null = null;
  for (let i = 0; i < weekCells.length; i += 1) {
    const day = weekCells[i];
    if (!day || !bookingOccupiesNight(stay.booking, day)) continue;
    if (startIdx == null) startIdx = i;
    endIdx = i;
  }
  if (startIdx == null || endIdx == null) return null;

  const startDay = weekCells[startIdx]!;
  const endDay = weekCells[endIdx]!;
  const lastNight = addDays(stay.booking.checkout!, -1);

  return {
    booking: stay.booking,
    unitLabel: stay.unitLabel,
    unitId: stay.unitId,
    key: stay.key,
    startIdx,
    endIdx,
    continuesBefore: Boolean(stay.booking.checkin && stay.booking.checkin < startDay),
    continuesAfter: lastNight > endDay,
    nights: stayNightCount(stay.booking),
  };
}

function MonthWeekRow({
  weekCells,
  stays,
  selected,
  pendingBlock,
  showManual,
  multiUnit,
  onToggleDay,
}: {
  weekCells: (string | null)[];
  stays: MonthStay[];
  selected: WpAccAvailabilityUnit | null;
  pendingBlock: string | null;
  showManual: boolean;
  multiUnit: boolean;
  onToggleDay: (unit: WpAccAvailabilityUnit, day: string) => void;
}) {
  const clipped = stays
    .map((stay) => clipStayToWeek(stay, weekCells))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const spanned = assignSpanLanes(clipped);
  const laneCount = Math.max(1, ...spanned.map((s) => s.lane + 1), 1);
  const barH = 26;
  const gap = 3;
  const headerH = 28;
  const padBottom = 8;
  const rowMinH = headerH + padBottom + laneCount * barH + Math.max(0, laneCount - 1) * gap;

  const bookedBySelected = new Set<string>();
  if (selected) {
    for (const stay of stays) {
      if (stay.unitId !== selected.id) continue;
      for (const day of weekCells) {
        if (day && bookingOccupiesNight(stay.booking, day)) bookedBySelected.add(day);
      }
    }
  }

  return (
    <div className="relative border-t border-slate-800" style={{ minHeight: rowMinH }}>
      <div className="grid grid-cols-7">
        {weekCells.map((day, i) => {
          const selectedBlocked =
            day && selected && showManual ? isManuallyBlocked(selected, day) : false;
          const selectedBooked = day ? bookedBySelected.has(day) : false;
          const busy =
            day && selected ? pendingBlock === pendingBlockKey(selected, day) : false;
          const canToggle = Boolean(day && selected && !selectedBooked);
          const washStay = clipped.find(
            (s) => day && s.startIdx <= i && i <= s.endIdx,
          );

          return (
            <div
              key={day ?? `pad-${i}`}
              className="min-h-full border-r border-slate-800/80 p-1.5 last:border-r-0"
              style={
                washStay
                  ? { backgroundColor: bookingWash(washStay.booking) }
                  : selectedBlocked
                    ? { backgroundColor: "rgba(51, 65, 85, 0.45)" }
                    : undefined
              }
            >
              {day ? (
                <div className="relative z-[2] flex items-center justify-between gap-1">
                  <p className="text-[11px] font-medium text-slate-400">{day.slice(8)}</p>
                  {canToggle && selected ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onToggleDay(selected, day)}
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
              ) : null}
              {day && selectedBlocked && !selectedBooked && selected && !washStay ? (
                <div
                  className="relative z-[2] mt-6 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-slate-200"
                  style={{ backgroundColor: CHANNEL_COLORS.blocked.bg }}
                  title={`Manual block · ${selected.title}`}
                >
                  Blocked
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {spanned.map((span) => (
        <StaySpanBar
          key={`${span.key}-${span.startIdx}-${span.endIdx}-${span.lane}`}
          span={span}
          dayCount={7}
          lane={span.lane}
          laneCount={laneCount}
          showAvatar
          subtitle={multiUnit ? span.unitLabel : undefined}
        />
      ))}
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
  onToggleDay: (unit: WpAccAvailabilityUnit, day: string) => void;
}) {
  const showManual = channelFilter === "all";
  const lead =
    days.length > 0
      ? new Date(`${days[0]}T12:00:00`).getDay()
      : 0;
  const cells: (string | null)[] = [
    ...Array.from({ length: Number.isFinite(lead) ? lead : 0 }, () => null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const selected =
    (selectedId != null
      ? units.find((u) => u.id === selectedId) ??
        units.find((u) => u.platform_id === String(selectedId))
      : null) ??
    units[0] ??
    null;

  const stays = collectMonthStays(units, days, channelFilter);
  const multiUnit = units.length > 1;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-slate-300">{title}</h2>
      {days.length === 0 ? (
        <div className="dg-card">
          <p className="text-sm text-slate-500">No days in this month window.</p>
        </div>
      ) : (
        <>
          <p className="text-[11px] text-slate-500">
            Stays join across nights like Airbnb (check-in inclusive, check-out day free).
            {selected
              ? ` Click empty days to toggle a manual block on ${selected.title}.`
              : null}
            {channelFilter !== "all"
              ? ` · Filtering to ${CHANNEL_FILTERS.find((f) => f.id === channelFilter)?.label}.`
              : null}
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
            <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="px-2 py-1.5 text-center text-[10px] font-medium uppercase text-slate-500"
                >
                  {d}
                </div>
              ))}
            </div>
            {weeks.map((weekCells, wi) => (
              <MonthWeekRow
                key={`week-${wi}-${weekCells.find(Boolean) ?? wi}`}
                weekCells={weekCells}
                stays={stays}
                selected={selected}
                pendingBlock={pendingBlock}
                showManual={showManual}
                multiUnit={multiUnit}
                onToggleDay={onToggleDay}
              />
            ))}
          </div>
        </>
      )}
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
