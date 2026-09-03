"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AccommodationBookingsTable } from "@/components/accommodation/AccommodationBookingsTable";
import { accIsSaturday, accNightsBetween } from "@/lib/acc-dates";
import type { WpAccBookingRow, WpAccUnitProp } from "@/lib/dg-api";

type NewBookingForm = {
  guest_name: string;
  email: string;
  phone: string;
  accommodation_id: string;
  checkin: string;
  checkout: string;
  guests: string;
  total: string;
  status: string;
  source: string;
  paid: string;
  payment_method: string;
  message: string;
  allow_saturday: boolean;
};

const EMPTY_FORM: NewBookingForm = {
  guest_name: "",
  email: "",
  phone: "",
  accommodation_id: "",
  checkin: "",
  checkout: "",
  guests: "2",
  total: "",
  status: "confirmed",
  source: "manual",
  paid: "no",
  payment_method: "",
  message: "",
  allow_saturday: false,
};

function estimateTotal(
  unit: WpAccUnitProp | undefined,
  checkin: string,
  checkout: string,
): number | null {
  if (!unit || !checkin || !checkout) return null;
  const nights = accNightsBetween(checkin, checkout);
  if (nights <= 0) return null;
  const weekday = Number(unit.weekday_rate ?? 0);
  const weekend = Number(unit.weekend_rate ?? weekday);
  if (!weekday && !weekend) return null;

  let subtotal = 0;
  const [y, m, d] = checkin.split("-").map(Number);
  const cursor = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12));
  for (let i = 0; i < nights; i++) {
    const dow = cursor.getUTCDay();
    subtotal += dow === 5 || dow === 6 ? weekend || weekday : weekday || weekend;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const cleaning = Number(unit.cleaning_fee ?? 0);
  return Math.round((subtotal + (Number.isFinite(cleaning) ? cleaning : 0)) * 100) / 100;
}

export function AccommodationBookingsPanel({
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
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<NewBookingForm>(EMPTY_FORM);
  const [units, setUnits] = useState<WpAccUnitProp[]>([]);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!showNew || units.length) return;
    let cancelled = false;
    (async () => {
      setUnitsError(null);
      const res = await fetch("/api/v1/accommodation?resource=units");
      const json = await res.json().catch(() => null);
      if (cancelled) return;
      if (!res.ok) {
        setUnitsError(json?.error?.message ?? "Could not load units");
        return;
      }
      setUnits(Array.isArray(json?.data) ? json.data : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [showNew, units.length]);

  const selectedUnit = useMemo(
    () => units.find((u) => String(u.id) === form.accommodation_id),
    [units, form.accommodation_id],
  );

  const nights =
    form.checkin && form.checkout ? accNightsBetween(form.checkin, form.checkout) : 0;
  const quote = estimateTotal(selectedUnit, form.checkin, form.checkout);
  const saturdayHit =
    (form.checkin && accIsSaturday(form.checkin)) ||
    (form.checkout && accIsSaturday(form.checkout));

  async function createBooking(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreateMsg(null);

    const accommodationId = Number(form.accommodation_id);
    if (!form.guest_name.trim() || !accommodationId || !form.checkin || !form.checkout) {
      setCreateError("Guest name, unit, check-in and check-out are required.");
      setCreating(false);
      return;
    }
    if (nights <= 0) {
      setCreateError("Check-out must be after check-in.");
      setCreating(false);
      return;
    }
    if (saturdayHit && !form.allow_saturday) {
      setCreateError(
        "Saturday check-in/out is blocked for CVH — tick “Allow Saturday” to override.",
      );
      setCreating(false);
      return;
    }

    const res = await fetch("/api/v1/accommodation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_booking",
        booking: {
          guest_name: form.guest_name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          accommodation_id: accommodationId,
          checkin: form.checkin,
          checkout: form.checkout,
          guests: form.guests ? Number(form.guests) : 2,
          total: form.total === "" ? (quote ?? 0) : Number(form.total),
          status: form.status,
          source: form.source,
          paid: form.paid,
          payment_method: form.payment_method || undefined,
          message: form.message.trim() || undefined,
          allow_saturday: form.allow_saturday || undefined,
        },
      }),
    });
    const json = await res.json().catch(() => null);
    setCreating(false);
    if (!res.ok) {
      setCreateError(json?.error?.message ?? "Could not create booking");
      return;
    }

    const ref = json?.data?.created?.[0]?.ref;
    setCreateMsg(ref ? `Created booking ${ref}` : "Booking created");
    setForm(EMPTY_FORM);
    setShowNew(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setShowNew((v) => !v);
            setCreateError(null);
          }}
          className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          {showNew ? "Close" : "New booking"}
        </button>
        <p className="text-sm text-slate-500">
          StayBooking SoT (Neon) — OTA iCal sync on Availability
        </p>
        {createMsg ? <p className="text-sm text-emerald-400">{createMsg}</p> : null}
      </div>

      {showNew ? (
        <form
          onSubmit={createBooking}
          className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
        >
          <h2 className="font-semibold text-white">New manual / direct booking</h2>
          <p className="text-sm text-slate-500">
            Creates StayBooking directly in Gen 2, the accommodation source of truth.
          </p>
          {unitsError ? <p className="text-sm text-amber-400">{unitsError}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm text-slate-400">
              Guest name *
              <input
                required
                value={form.guest_name}
                onChange={(e) => setForm((f) => ({ ...f, guest_name: e.target.value }))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="text-sm text-slate-400">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="text-sm text-slate-400">
              Phone
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="text-sm text-slate-400">
              Unit *
              <select
                required
                value={form.accommodation_id}
                onChange={(e) => setForm((f) => ({ ...f, accommodation_id: e.target.value }))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="">Select unit…</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-400">
              Check-in *
              <input
                type="date"
                required
                value={form.checkin}
                onChange={(e) => setForm((f) => ({ ...f, checkin: e.target.value }))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="text-sm text-slate-400">
              Check-out *
              <input
                type="date"
                required
                value={form.checkout}
                onChange={(e) => setForm((f) => ({ ...f, checkout: e.target.value }))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="text-sm text-slate-400">
              Guests
              <input
                type="number"
                min={1}
                value={form.guests}
                onChange={(e) => setForm((f) => ({ ...f, guests: e.target.value }))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="text-sm text-slate-400">
              Total (AUD)
              <input
                type="number"
                step="0.01"
                value={form.total}
                placeholder={quote != null ? String(quote) : undefined}
                onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
              {nights > 0 ? (
                <span className="mt-1 block text-xs text-slate-500">
                  {nights} night{nights === 1 ? "" : "s"}
                  {quote != null ? ` · estimate $${quote.toLocaleString("en-AU")}` : ""}
                  {form.total === "" && quote != null ? " (used if blank)" : ""}
                </span>
              ) : null}
            </label>
            <label className="text-sm text-slate-400">
              Status
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="confirmed">confirmed</option>
                <option value="pending">pending</option>
              </select>
            </label>
            <label className="text-sm text-slate-400">
              Source
              <select
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="manual">manual</option>
                <option value="direct">direct</option>
                <option value="phone">phone</option>
                <option value="email">email</option>
                <option value="website">website</option>
              </select>
            </label>
            <label className="text-sm text-slate-400">
              Paid
              <select
                value={form.paid}
                onChange={(e) => setForm((f) => ({ ...f, paid: e.target.value }))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="no">Unpaid</option>
                <option value="yes">Paid</option>
              </select>
            </label>
            <label className="text-sm text-slate-400">
              Payment method
              <select
                value={form.payment_method}
                onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="">—</option>
                <option value="payid">PayID</option>
                <option value="stripe">Stripe / card</option>
                <option value="bank">Bank transfer</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="sm:col-span-2 lg:col-span-3 text-sm text-slate-400">
              Special requests / message
              <textarea
                rows={2}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
          </div>
          {saturdayHit ? (
            <label className="flex items-center gap-2 text-sm text-amber-300">
              <input
                type="checkbox"
                checked={form.allow_saturday}
                onChange={(e) =>
                  setForm((f) => ({ ...f, allow_saturday: e.target.checked }))
                }
              />
              Allow Saturday check-in/out (CVH override)
            </label>
          ) : null}
          {createError ? <p className="text-sm text-amber-400">{createError}</p> : null}
          <button
            type="submit"
            disabled={creating}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create booking"}
          </button>
        </form>
      ) : null}

      <AccommodationBookingsTable
        bookings={bookings}
        error={error}
        total={total}
        siteLabel={siteLabel}
      />
    </div>
  );
}
