"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { WpAccHousekeepingItem } from "@/lib/dg-api";

export function AccommodationHousekeepingBoard({
  items,
  statuses,
  summary,
  error,
  siteLabel,
  checkoutsToday,
  today,
}: {
  items: WpAccHousekeepingItem[];
  statuses: Record<string, string>;
  summary: Record<string, number>;
  error?: string;
  siteLabel?: string;
  checkoutsToday?: number;
  today?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(items);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="dg-card border-amber-500/30">
        <p className="text-amber-300">{error}</p>
        <p className="mt-2 text-sm text-slate-500">
          Deploy plugin v10.54.0+ on CVH and ensure the org WordPress API key can manage
          housekeeping.
        </p>
      </div>
    );
  }

  const statusOptions =
    Object.keys(statuses).length > 0
      ? statuses
      : {
          clean: "Clean & ready",
          dirty: "Needs cleaning",
          in_progress: "Cleaning in progress",
          inspection: "Awaiting inspection",
        };

  const turnoverCount =
    checkoutsToday ?? rows.filter((r) => r.checkout_today).length;

  async function saveAll() {
    setPending(true);
    setMessage(null);
    setSaveError(null);
    const res = await fetch("/api/v1/accommodation/housekeeping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        updates: rows.map((r) => ({
          property_id: r.id,
          status: r.status,
          notes: r.notes ?? "",
        })),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setSaveError(json.error?.message ?? "Could not save housekeeping");
      return;
    }
    setMessage(`Updated ${json.data?.count ?? rows.length} units`);
    router.refresh();
  }

  async function saveRow(item: WpAccHousekeepingItem) {
    setPending(true);
    setMessage(null);
    setSaveError(null);
    const res = await fetch("/api/v1/accommodation/housekeeping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        updates: [
          {
            property_id: item.id,
            status: item.status,
            notes: item.notes ?? "",
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
    setMessage(`Saved ${item.title}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {siteLabel ? <p className="text-sm text-slate-500">{siteLabel}</p> : null}

      {turnoverCount > 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
          {turnoverCount} unit{turnoverCount === 1 ? "" : "s"} with checkout
          {today ? ` on ${today}` : " today"} — suggest marking dirty after departure.
        </div>
      ) : null}

      {Object.keys(summary).length ? (
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary).map(([key, count]) => (
            <span
              key={key}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs capitalize text-slate-300"
            >
              {key.replace(/_/g, " ")}: {count}
            </span>
          ))}
        </div>
      ) : null}

      {!rows.length ? (
        <div className="dg-card border-dashed border-slate-700">
          <h2 className="text-lg font-semibold text-white">Add your first units</h2>
          <p className="mt-2 text-sm text-slate-500">
            Sync units first, then mark clean / dirty / in progress after turnovers.
          </p>
          <a
            href="/apps/accommodation/units"
            className="mt-4 inline-block rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Open units
          </a>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last cleaned</th>
                <th className="px-4 py-3">Last report</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Links</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((item, idx) => (
                <tr
                  key={item.id}
                  className={
                    item.checkout_today
                      ? "bg-amber-500/5 hover:bg-amber-500/10"
                      : "hover:bg-slate-900/40"
                  }
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {item.title}
                    {item.checkout_today ? (
                      <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-200">
                        Checkout today
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.status}
                      onChange={(e) => {
                        const next = [...rows];
                        next[idx] = { ...item, status: e.target.value };
                        setRows(next);
                      }}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
                    >
                      {Object.entries(statusOptions).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                      {!statusOptions[item.status] ? (
                        <option value={item.status}>{item.status}</option>
                      ) : null}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{item.last_cleaned ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {item.last_report_id ? `#${item.last_report_id}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={item.notes ?? ""}
                      onChange={(e) => {
                        const next = [...rows];
                        next[idx] = { ...item, notes: e.target.value };
                        setRows(next);
                      }}
                      className="w-full min-w-[160px] rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
                      placeholder="Notes…"
                    />
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex flex-col gap-1">
                      {item.cleaning_form_url ? (
                        <a
                          href={item.cleaning_form_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          Cleaning form
                        </a>
                      ) : null}
                      {item.checkin_url ? (
                        <a
                          href={item.checkin_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          Check-in
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void saveRow(rows[idx]!)}
                      className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:border-blue-500 hover:text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || !rows.length}
          onClick={() => void saveAll()}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save all statuses"}
        </button>
        {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
        {saveError ? <p className="text-sm text-amber-400">{saveError}</p> : null}
      </div>
    </div>
  );
}
