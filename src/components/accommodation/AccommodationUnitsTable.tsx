"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

function toRows(list: WpAccUnitProp[]): EditableUnit[] {
  return list.map((u) => ({ ...u, title: u.title }));
}

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
  const [rows, setRows] = useState<EditableUnit[]>(() => toRows(units));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setRows(toRows(units));
  }, [units]);

  const comingSoonCount = rows.filter((r) => r.listing_status === "coming_soon").length;
  const eventsCount = rows.filter((r) => r.listing_status === "events_future").length;

  if (error && !rows.length) {
    return (
      <div className="dg-card border-amber-500/30">
        <p className="text-amber-300">{error}</p>
        <p className="mt-2 text-sm text-slate-500">
          Deploy plugin v10.59.0+ on CVH to sync all units (including coming soon) and enable
          editing.
        </p>
      </div>
    );
  }

  async function refreshUnits() {
    setSyncing(true);
    setMessage(null);
    setSaveError(null);
    try {
      const res = await fetch("/api/v1/accommodation?resource=properties");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(
          json.error?.message ??
            "Could not sync units — deploy DG Platform plugin v10.59.0+ on CVH.",
        );
        return;
      }
      const next = Array.isArray(json.data) ? (json.data as WpAccUnitProp[]) : [];
      setRows(toRows(next));
      setEditingId(null);
      const soon = next.filter((u) => u.listing_status === "coming_soon").length;
      const events = next.filter((u) => u.listing_status === "events_future").length;
      const extras = [
        soon ? `${soon} coming soon` : null,
        events ? `${events} events/future` : null,
      ]
        .filter(Boolean)
        .join(", ");
      setMessage(
        `Synced ${next.length} unit${next.length === 1 ? "" : "s"} from WordPress` +
          (extras ? ` (${extras})` : " (includes coming soon / drafts when present)") +
          ".",
      );
      router.refresh();
    } catch {
      setSaveError("Network error while syncing units from WordPress.");
    } finally {
      setSyncing(false);
    }
  }

  if (!rows.length) {
    return (
      <div className="space-y-3">
        <div className="dg-card border-dashed border-slate-700">
          <p className="text-slate-300">No accommodation units returned from WordPress.</p>
          {siteLabel ? <p className="mt-1 text-sm text-slate-500">Site: {siteLabel}</p> : null}
          <p className="mt-2 text-sm text-slate-500">
            Deploy plugin v10.59.0+ so coming soon / draft units are included, then refresh.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshUnits()}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Sync units from WordPress
        </button>
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
      setSaveError(
        json.error?.message ??
          "Could not save unit — deploy DG Platform plugin v10.58.0+ on CVH (Plugins → Upload dg-platform-build.zip).",
      );
      return;
    }
    setEditingId(null);
    setMessage(`Saved ${row.title}`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          {siteLabel ? `${siteLabel} · ` : ""}
          {rows.length} unit{rows.length === 1 ? "" : "s"}
          {comingSoonCount ? ` · ${comingSoonCount} coming soon` : ""}
          {eventsCount ? ` · ${eventsCount} events/future` : ""}
        </div>
        <button
          type="button"
          disabled={syncing}
          onClick={() => void refreshUnits()}
          className="rounded-full border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500 disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync all units from WordPress"}
        </button>
      </div>
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
              const listingLabel =
                LISTING_OPTIONS.find((o) => o.value === (u.listing_status ?? "bookable"))
                  ?.label ?? u.listing_status;
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
                      <div>
                        <span className="font-medium text-white">{u.title}</span>
                        {u.post_status && u.post_status !== "publish" ? (
                          <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] uppercase text-amber-300">
                            {u.post_status}
                          </span>
                        ) : null}
                      </div>
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
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          u.listing_status === "coming_soon"
                            ? "bg-amber-500/20 text-amber-300"
                            : u.listing_status === "events_future"
                              ? "bg-violet-500/20 text-violet-300"
                              : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        {listingLabel}
                      </span>
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
                            setRows(toRows(units));
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
