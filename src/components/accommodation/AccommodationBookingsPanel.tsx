"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AccommodationBookingsTable } from "@/components/accommodation/AccommodationBookingsTable";
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
};

export function AccommodationBookingsPanel({
  bookings,
  error,
  total,
  siteLabel,
  source,
}: {
  bookings: WpAccBookingRow[];
  error?: string;
  total?: number;
  siteLabel?: string;
  source?: "postgres" | "wordpress";
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<NewBookingForm>(EMPTY_FORM);
  const [units, setUnits] = useState<WpAccUnitProp[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!showNew || units.length) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/v1/accommodation?resource=units");
      const json = await res.json().catch(() => null);
      if (cancelled || !res.ok) return;
      setUnits(Array.isArray(json?.data) ? json.data : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [showNew, units.length]);

  async function syncFromWordPress() {
    setSyncing(true);
    setSyncMsg(null);
    const res = await fetch("/api/v1/accommodation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync_wordpress" }),
    });
    const json = await res.json().catch(() => null);
    setSyncing(false);
    if (!res.ok) {
      setSyncMsg(json?.error?.message ?? "Sync failed");
      return;
    }
    setSyncMsg(
      `Synced: ${json.data.created} new, ${json.data.updated} updated, ${json.data.skipped} unchanged`,
    );
    router.refresh();
  }

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
          total: form.total === "" ? 0 : Number(form.total),
          status: form.status,
          source: form.source,
          paid: form.paid,
          payment_method: form.payment_method || undefined,
          message: form.message.trim() || undefined,
        },
      }),
    });
    const json = await res.json().catch(() => null);
    setCreating(false);
    if (!res.ok) {
      setCreateError(
        json?.error?.message ??
          "Could not create booking — deploy DG Platform plugin v10.65.0+ on CVH.",
      );
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
        <button
          type="button"
          onClick={syncFromWordPress}
          disabled={syncing}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync bookings from WordPress"}
        </button>
        {source ? (
          <p className="text-sm text-slate-500">
            Showing {source === "postgres" ? "Platform (Postgres)" : "live WordPress"} data
          </p>
        ) : null}
        {syncMsg ? <p className="text-sm text-slate-400">{syncMsg}</p> : null}
        {createMsg ? <p className="text-sm text-emerald-400">{createMsg}</p> : null}
      </div>

      {showNew ? (
        <form
          onSubmit={createBooking}
          className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
        >
          <h2 className="font-semibold text-white">New manual / direct booking</h2>
          <p className="text-sm text-slate-500">
            Creates on WordPress CVH and rebuilds blocked dates for the unit. Requires plugin
            v10.65.0+.
          </p>
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
                onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
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
