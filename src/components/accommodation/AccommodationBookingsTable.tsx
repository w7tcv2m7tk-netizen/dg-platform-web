"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { WpAccBookingRow } from "@/lib/dg-api";

const STATUS_OPTIONS = [
  "confirmed",
  "pending",
  "airbnb",
  "bookingcom",
  "completed",
  "cancelled",
];

export function AccommodationBookingsTable({
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
  const [rows, setRows] = useState(bookings);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="dg-card border-amber-500/30">
        <p className="text-amber-300">{error}</p>
        <p className="mt-2 text-sm text-slate-500">
          Deploy plugin v10.58.0+ on CVH to enable booking editing.
        </p>
      </div>
    );
  }

  function patchRow(id: number, patch: Partial<WpAccBookingRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function saveRow(row: WpAccBookingRow) {
    setPending(true);
    setMessage(null);
    setSaveError(null);
    const res = await fetch("/api/v1/accommodation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource: "bookings",
        updates: [
          {
            id: row.id,
            platform_id: row.platform_id,
            guest_name: row.guest_name,
            email: row.email,
            phone: row.phone,
            checkin: row.checkin,
            checkout: row.checkout,
            status: row.status,
            total: row.total,
            accommodation: row.accommodation,
            accommodation_id: row.accommodation_id,
            ref: row.ref,
          },
        ],
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setSaveError(json.error?.message ?? "Could not save booking");
      return;
    }
    setEditingId(null);
    setMessage(`Saved booking ${row.ref ?? row.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {siteLabel || total != null ? (
        <p className="text-sm text-slate-500">
          {siteLabel ? `${siteLabel}` : ""}
          {total != null ? ` · ${total} bookings` : ""}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {saveError ? <p className="text-sm text-amber-400">{saveError}</p> : null}

      {!rows.length ? (
        <div className="dg-card border-dashed border-slate-700">
          <p className="text-slate-300">No bookings returned.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Check-in</th>
                <th className="px-4 py-3">Check-out</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((b) => {
                const editing = editingId === b.id;
                return (
                  <tr key={b.id} className="hover:bg-slate-900/40 align-top">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {b.ref ?? b.id}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <div className="space-y-1">
                          <input
                            value={b.guest_name ?? ""}
                            onChange={(e) => patchRow(b.id, { guest_name: e.target.value })}
                            placeholder="Guest name"
                            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                          />
                          <input
                            value={b.email ?? ""}
                            onChange={(e) => patchRow(b.id, { email: e.target.value })}
                            placeholder="Email"
                            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
                          />
                          <input
                            value={b.phone ?? ""}
                            onChange={(e) => patchRow(b.id, { phone: e.target.value })}
                            placeholder="Phone"
                            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
                          />
                        </div>
                      ) : (
                        <>
                          <p className="text-white">{b.guest_name ?? "—"}</p>
                          <p className="text-xs text-slate-500">{b.email}</p>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{b.accommodation ?? "—"}</td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <input
                          type="date"
                          value={b.checkin ?? ""}
                          onChange={(e) => patchRow(b.id, { checkin: e.target.value })}
                          className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                        />
                      ) : (
                        <span className="text-slate-400">{b.checkin ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <input
                          type="date"
                          value={b.checkout ?? ""}
                          onChange={(e) => patchRow(b.id, { checkout: e.target.value })}
                          className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                        />
                      ) : (
                        <span className="text-slate-400">{b.checkout ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <input
                          type="number"
                          value={b.total ?? ""}
                          onChange={(e) =>
                            patchRow(b.id, {
                              total: e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                          className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                        />
                      ) : (
                        <span className="text-slate-300">
                          {b.total != null ? `$${b.total.toLocaleString("en-AU")}` : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <select
                          value={b.status ?? "pending"}
                          onChange={(e) => patchRow(b.id, { status: e.target.value })}
                          className="rounded border border-slate-700 bg-slate-950 px-2 py-1 capitalize text-white"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs capitalize text-slate-300">
                          {b.status ?? "pending"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => void saveRow(b)}
                            className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRows(bookings);
                              setEditingId(null);
                            }}
                            className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingId(b.id)}
                          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:border-blue-500 hover:text-white"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
