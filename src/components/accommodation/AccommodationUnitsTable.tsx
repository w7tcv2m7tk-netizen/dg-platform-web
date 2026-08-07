"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { WpAccUnitProp } from "@/lib/dg-api";

const LISTING_OPTIONS = [
  { value: "bookable", label: "Open for bookings" },
  { value: "coming_soon", label: "Coming soon" },
  { value: "events_future", label: "Events & functions" },
];

const HK_OPTIONS = [
  { value: "clean", label: "Clean" },
  { value: "dirty", label: "Dirty" },
  { value: "in_progress", label: "In progress" },
  { value: "inspection", label: "Inspection" },
];

type EditableUnit = WpAccUnitProp & {
  title: string;
};

export function AccommodationUnitsTable({
  units,
  error,
  siteLabel,
}: {
  units: WpAccUnitProp[];
  error?: string;
  siteLabel?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<EditableUnit[]>(
    units.map((u) => ({ ...u, title: u.title })),
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="dg-card border-amber-500/30">
        <p className="text-amber-300">{error}</p>
        <p className="mt-2 text-sm text-slate-500">
          Deploy plugin v10.58.0+ on CVH to enable unit editing.
        </p>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="dg-card border-dashed border-slate-700">
        <p className="text-slate-300">No accommodation units returned from WordPress.</p>
        {siteLabel ? <p className="mt-1 text-sm text-slate-500">Site: {siteLabel}</p> : null}
      </div>
    );
  }

  function patchRow(id: number, patch: Partial<EditableUnit>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function saveRow(row: EditableUnit) {
    setPending(true);
    setMessage(null);
    setSaveError(null);
    const res = await fetch("/api/v1/accommodation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource: "units",
        updates: [
          {
            id: row.id,
            title: row.title,
            weekday_rate: row.weekday_rate,
            weekend_rate: row.weekend_rate,
            cleaning_fee: row.cleaning_fee,
            listing_status: row.listing_status,
            housekeeping_status: row.housekeeping_status,
          },
        ],
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setSaveError(json.error?.message ?? "Could not save unit");
      return;
    }
    setEditingId(null);
    setMessage(`Saved ${row.title}`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {siteLabel ? <p className="text-sm text-slate-500">{siteLabel}</p> : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {saveError ? <p className="text-sm text-amber-400">{saveError}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Weekday</th>
              <th className="px-4 py-3">Weekend</th>
              <th className="px-4 py-3">Cleaning</th>
              <th className="px-4 py-3">Listing</th>
              <th className="px-4 py-3">Housekeeping</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((u) => {
              const editing = editingId === u.id;
              return (
                <tr key={u.id} className="hover:bg-slate-900/40">
                  <td className="px-4 py-3">
                    {editing ? (
                      <input
                        value={u.title}
                        onChange={(e) => patchRow(u.id, { title: e.target.value })}
                        className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                      />
                    ) : (
                      <span className="font-medium text-white">{u.title}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editing ? (
                      <input
                        type="number"
                        value={u.weekday_rate ?? ""}
                        onChange={(e) =>
                          patchRow(u.id, {
                            weekday_rate: e.target.value === "" ? undefined : Number(e.target.value),
                          })
                        }
                        className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                      />
                    ) : (
                      <span className="text-slate-300">
                        {u.weekday_rate != null ? `$${u.weekday_rate}` : "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editing ? (
                      <input
                        type="number"
                        value={u.weekend_rate ?? ""}
                        onChange={(e) =>
                          patchRow(u.id, {
                            weekend_rate: e.target.value === "" ? undefined : Number(e.target.value),
                          })
                        }
                        className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                      />
                    ) : (
                      <span className="text-slate-300">
                        {u.weekend_rate != null ? `$${u.weekend_rate}` : "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editing ? (
                      <input
                        type="number"
                        value={u.cleaning_fee ?? ""}
                        onChange={(e) =>
                          patchRow(u.id, {
                            cleaning_fee: e.target.value === "" ? undefined : Number(e.target.value),
                          })
                        }
                        className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                      />
                    ) : (
                      <span className="text-slate-300">
                        {u.cleaning_fee != null ? `$${u.cleaning_fee}` : "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editing ? (
                      <select
                        value={u.listing_status ?? "bookable"}
                        onChange={(e) => patchRow(u.id, { listing_status: e.target.value })}
                        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                      >
                        {LISTING_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="capitalize text-slate-400">{u.listing_status ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editing ? (
                      <select
                        value={u.housekeeping_status ?? "unknown"}
                        onChange={(e) => patchRow(u.id, { housekeeping_status: e.target.value })}
                        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                      >
                        {HK_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="capitalize text-slate-400">
                        {u.housekeeping_status ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editing ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => void saveRow(u)}
                          className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRows(units.map((x) => ({ ...x, title: x.title })));
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
                        onClick={() => setEditingId(u.id)}
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
    </div>
  );
}
