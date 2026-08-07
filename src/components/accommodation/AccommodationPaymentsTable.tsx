"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { WpAccBookingRow } from "@/lib/dg-api";

function formatAud(total?: number): string {
  if (total == null || !Number.isFinite(total)) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(total);
}

function paidLabel(paid?: string | null): string {
  if (paid === "yes") return "Paid";
  if (paid === "no") return "Unpaid";
  return "Unknown";
}

function methodLabel(method?: string | null): string {
  if (!method) return "—";
  const map: Record<string, string> = {
    payid: "PayID",
    stripe: "Stripe / card",
    airbnb: "Airbnb",
    bookingcom: "Booking.com",
    bank: "Bank transfer",
    cash: "Cash",
    other: "Other",
  };
  return map[method] ?? method;
}

const METHOD_OPTIONS = [
  { value: "", label: "—" },
  { value: "payid", label: "PayID" },
  { value: "stripe", label: "Stripe / card" },
  { value: "bank", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "airbnb", label: "Airbnb" },
  { value: "bookingcom", label: "Booking.com" },
  { value: "other", label: "Other" },
];

export function AccommodationPaymentsTable({ bookings }: { bookings: WpAccBookingRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(bookings);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patchPayment(
    row: WpAccBookingRow,
    patch: { paid?: string; payment_method?: string },
  ) {
    setPendingId(row.id);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/v1/accommodation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource: "bookings",
        updates: [
          {
            id: row.id,
            platform_id: row.platform_id,
            paid: patch.paid ?? row.paid,
            payment_method: patch.payment_method ?? row.payment_method,
          },
        ],
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPendingId(null);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not update payment status");
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              paid: patch.paid ?? r.paid,
              payment_method: patch.payment_method ?? r.payment_method,
            }
          : r,
      ),
    );
    setMessage(`Updated ${row.ref ?? row.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-amber-400">{error}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((b) => {
              const busy = pendingId === b.id;
              return (
                <tr key={b.id} className="hover:bg-slate-900/40">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {b.ref ?? b.id}
                  </td>
                  <td className="px-4 py-3 text-white">{b.guest_name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{b.accommodation ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{formatAud(b.total)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={b.payment_method ?? ""}
                      disabled={busy}
                      onChange={(e) =>
                        void patchPayment(b, { payment_method: e.target.value })
                      }
                      className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200 disabled:opacity-50"
                    >
                      {METHOD_OPTIONS.map((o) => (
                        <option key={o.value || "none"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                      {b.payment_method &&
                      !METHOD_OPTIONS.some((o) => o.value === b.payment_method) ? (
                        <option value={b.payment_method}>
                          {methodLabel(b.payment_method)}
                        </option>
                      ) : null}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        b.paid === "yes"
                          ? "text-emerald-400"
                          : b.paid === "no"
                            ? "text-amber-400"
                            : "text-slate-500"
                      }
                    >
                      {paidLabel(b.paid)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.paid === "yes" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void patchPayment(b, { paid: "no" })}
                        className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:border-amber-500 hover:text-amber-200 disabled:opacity-50"
                      >
                        Mark unpaid
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void patchPayment(b, { paid: "yes" })}
                        className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        Mark paid
                      </button>
                    )}
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
