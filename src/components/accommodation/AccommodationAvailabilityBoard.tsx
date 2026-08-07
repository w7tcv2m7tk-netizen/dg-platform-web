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
      rows.push({ ...b, unitTitle: unit.title });
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
  const [view, setView] = useState<CalendarView>("inventory");
  const [anchor, setAnchor] = useState(from);
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
          Click an open or blocked cell to toggle a manual block
        </span>
      </div>

      {view === "inventory" ? (
        <InventoryGrid
          units={units}
          days={inventoryDays}
          selectedId={selectedId}
          pendingBlock={pendingBlock}
          onSelectUnit={setSelectedId}
          onToggleDay={(unitId, day) => void toggleManualBlock(unitId, day)}
        />
      ) : null}
      {view === "week" ? (
        <WeekGrid
          units={units}
          days={weekDays}
          title={`${formatDayLabel(weekStart, "long")} – ${formatDayLabel(weekDays[6]!, "long")}`}
          selectedId={selectedId}
          pendingBlock={pendingBlock}
          onSelectUnit={setSelectedId}
          onToggleDay={(unitId, day) => void toggleManualBlock(unitId, day)}
        />
      ) : null}
      {view === "month" ? (
        <MonthGrid
          units={units}
          days={monthDays}
          title={new Date(`${monthStart}T12:00:00`).toLocaleDateString("en-AU", {
            month: "long",
            year: "numeric",
          })}
          selectedId={selectedId}
          pendingBlock={pendingBlock}
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
  monthHint: boolean;
}) {
  const selected = units.find((u) => u.id === selectedId) ?? null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[180px] flex-1 flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-slate-500">
            Unit pricing
          </span>
          <select
            value={selectedId ?? ""}
            onChange={(e) => onSelect(Number(e.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.title}
                {u.weekday_rate != null || u.weekend_rate != null
                  ? ` · ${formatMoney(u.weekday_rate)} / ${formatMoney(u.weekend_rate)}`
                  : ""}
              </option>
            ))}
          </select>
        </label>
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

function InventoryGrid({
  units,
  days,
  selectedId,
  pendingBlock,
  onSelectUnit,
  onToggleDay,
}: {
  units: WpAccAvailabilityUnit[];
  days: string[];
  selectedId: number | null;
  pendingBlock: string | null;
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
                {days.map((d) => {
                  const booking = bookingOnDay(unit, d);
                  const isBlocked = isManuallyBlocked(unit, d);
                  const busy = pendingBlock === `${unit.id}:${d}`;
                  const bg = booking
                    ? bookingColor(booking)
                    : isBlocked
                      ? CHANNEL_COLORS.blocked.bg
                      : CHANNEL_COLORS.open.bg;
                  const title = booking
                    ? `${booking.guest_name ?? "Guest"} (${booking.source || booking.status})`
                    : isBlocked
                      ? "Manual block — click to unblock"
                      : "Open — click to block";
                  return (
                    <td key={d} className="px-1 py-2">
                      {booking ? (
                        <div
                          title={title}
                          className="mx-auto h-6 w-6 rounded-sm"
                          style={{ backgroundColor: bg }}
                        />
                      ) : (
                        <button
                          type="button"
                          title={title}
                          disabled={busy}
                          onClick={() => {
                            onSelectUnit(unit.id);
                            onToggleDay(unit.id, d);
                          }}
                          className={`mx-auto block h-6 w-6 rounded-sm outline-none ring-offset-1 ring-offset-slate-950 transition hover:ring-2 hover:ring-white/40 focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50 ${
                            isBlocked ? "ring-1 ring-slate-400/50" : ""
                          }`}
                          style={{ backgroundColor: bg }}
                          aria-label={
                            isBlocked
                              ? `Unblock ${unit.title} on ${d}`
                              : `Block ${unit.title} on ${d}`
                          }
                        />
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
  );
}

function WeekGrid({
  units,
  days,
  title,
  selectedId,
  pendingBlock,
  onSelectUnit,
  onToggleDay,
}: {
  units: WpAccAvailabilityUnit[];
  days: string[];
  title: string;
  selectedId: number | null;
  pendingBlock: string | null;
  onSelectUnit: (id: number) => void;
  onToggleDay: (unitId: number, day: string) => void;
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
              return (
                <tr
                  key={unit.id}
                  className={`border-t border-slate-800 align-top ${
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
                  {days.map((d) => {
                    const booking = bookingOnDay(unit, d);
                    const isBlocked = isManuallyBlocked(unit, d);
                    const busy = pendingBlock === `${unit.id}:${d}`;
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
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              onSelectUnit(unit.id);
                              onToggleDay(unit.id, d);
                            }}
                            className={`w-full rounded-md px-2 py-3 text-center text-[10px] transition hover:brightness-110 disabled:opacity-50 ${
                              isBlocked ? "font-medium text-slate-200" : "text-slate-500"
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
                          >
                            {busy ? "…" : isBlocked ? "Blocked" : "Open"}
                          </button>
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
  selectedId,
  pendingBlock,
  onToggleDay,
}: {
  units: WpAccAvailabilityUnit[];
  days: string[];
  title: string;
  selectedId: number | null;
  pendingBlock: string | null;
  onToggleDay: (unitId: number, day: string) => void;
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

  const selected = units.find((u) => u.id === selectedId) ?? units[0] ?? null;

  // Every occupied night in the stay range (check-in inclusive, check-out exclusive),
  // including stays that started before this month.
  const byDay = new Map<
    string,
    Array<{ unit: string; booking: WpAccBookingRow; isCheckin: boolean }>
  >();
  for (const unit of units) {
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
      </p>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-slate-950 px-2 py-1.5 text-center text-[10px] font-medium uppercase text-slate-500">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const entries = day ? byDay.get(day) ?? [] : [];
          const primary = entries[0];
          const selectedBlocked =
            day && selected ? isManuallyBlocked(selected, day) : false;
          const selectedBooked =
            day && selected ? Boolean(bookingOnDay(selected, day)) : false;
          const busy =
            day && selected ? pendingBlock === `${selected.id}:${day}` : false;
          const canToggle = Boolean(day && selected && !selectedBooked);

          return (
            <div
              key={day ?? `pad-${i}`}
              className="min-h-[88px] bg-slate-950 p-1.5"
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
                    {entries.slice(0, 3).map(({ unit, booking, isCheckin }) => {
                      const guest = booking.guest_name?.trim() || "Guest";
                      // Unit first so multi-unit days stay distinguishable when truncated.
                      const label = `${unit} · ${guest}`;
                      return (
                        <div
                          key={`${booking.id}-${unit}-${day}`}
                          className="truncate rounded px-1 py-0.5 text-[10px] text-white"
                          style={{
                            backgroundColor: bookingColor(booking),
                            opacity: isCheckin ? 1 : 0.85,
                          }}
                          title={`${unit}: ${guest} · ${booking.checkin} → ${booking.checkout}`}
                        >
                          {isCheckin ? label : `→ ${label}`}
                        </div>
                      );
                    })}
                    {entries.length > 3 ? (
                      <p className="text-[10px] text-slate-500">
                        +{entries.length - 3} more
                      </p>
                    ) : null}
                    {selectedBlocked && !selectedBooked ? (
                      <div
                        className="truncate rounded px-1 py-0.5 text-[10px] text-slate-300"
                        style={{ backgroundColor: CHANNEL_COLORS.blocked.bg }}
                        title={`Manual block · ${selected?.title}`}
                      >
                        Blocked · {selected?.title}
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
