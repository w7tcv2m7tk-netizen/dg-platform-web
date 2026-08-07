"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";

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
  airbnb_ical_url: string;
  bookingcom_ical_url: string;
};

function toRows(list: WpAccUnitProp[]): EditableUnit[] {
  return list.map((u) => ({
    ...u,
    title: u.title,
    airbnb_ical_url: u.airbnb_ical_url ?? "",
    bookingcom_ical_url: u.bookingcom_ical_url ?? "",
  }));
}

function formatSync(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function hasOtaConfigured(u: EditableUnit) {
  return Boolean(u.airbnb_ical_url || u.bookingcom_ical_url || u.ical_export_url);
}

function CopyExportButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback for older browsers / denied clipboard
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="shrink-0 rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-blue-500 hover:text-white"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
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
  const [otaOpenId, setOtaOpenId] = useState<number | null>(null);
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
          Deploy plugin v10.61.0+ on CVH to sync all units (including coming soon), enable editing,
          and manage iCal URLs.
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
            "Could not sync units — deploy DG Platform plugin v10.61.0+ on CVH.",
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
            Deploy plugin v10.61.0+ so coming soon / draft units and iCal fields are included, then
            refresh.
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
            airbnb_ical_url: row.airbnb_ical_url,
            bookingcom_ical_url: row.bookingcom_ical_url,
          },
        ],
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setSaveError(
        json.error?.message ??
          "Could not save unit — deploy DG Platform plugin v10.61.0+ on CVH (Plugins → Upload dg-platform-build.zip).",
      );
      return;
    }
    const updated = Array.isArray(json.data?.updated)
      ? (json.data.updated as WpAccUnitProp[])
      : null;
    if (updated?.length) {
      const map = new Map(updated.map((u) => [u.id, u]));
      setRows((prev) =>
        prev.map((r) => {
          const next = map.get(r.id);
          return next ? { ...toRows([next])[0]! } : r;
        }),
      );
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
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Weekday</th>
              <th className="px-4 py-3">Weekend</th>
              <th className="px-4 py-3">Cleaning</th>
              <th className="px-4 py-3">Listing</th>
              <th className="px-4 py-3">Housekeeping</th>
              <th className="px-4 py-3">Calendars</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((u) => {
              const editing = editingId === u.id;
              const otaOpen = otaOpenId === u.id || editing;
              const listingLabel =
                LISTING_OPTIONS.find((o) => o.value === (u.listing_status ?? "bookable"))
                  ?.label ?? u.listing_status;
              const airbnbSync = formatSync(u.airbnb_last_sync);
              const bookingSync = formatSync(u.bookingcom_last_sync);
              return (
                <Fragment key={u.id}>
                  <tr className="hover:bg-slate-900/40">
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
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setOtaOpenId(otaOpen && !editing ? null : u.id)}
                        className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 hover:border-blue-500 hover:text-white"
                      >
                        {otaOpen ? "Hide" : hasOtaConfigured(u) ? "OTA · set" : "OTA"}
                      </button>
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
                          onClick={() => {
                            setEditingId(u.id);
                            setOtaOpenId(u.id);
                          }}
                          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:border-blue-500 hover:text-white"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                  {otaOpen ? (
                    <tr className="bg-slate-950/70">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="mx-auto max-w-3xl space-y-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              OTA calendars
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Import URLs pull bookings from Airbnb / Booking.com into DigitalGate.
                              The DigitalGate export URL is what you paste into those OTAs.
                            </p>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-1">
                            <label className="block space-y-1.5">
                              <span className="text-xs font-medium text-slate-300">
                                Airbnb import URL
                              </span>
                              {editing ? (
                                <input
                                  type="url"
                                  value={u.airbnb_ical_url}
                                  onChange={(e) =>
                                    patchRow(u.id, { airbnb_ical_url: e.target.value })
                                  }
                                  placeholder="https://www.airbnb.com/calendar/ical/..."
                                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600"
                                />
                              ) : (
                                <p className="break-all rounded border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
                                  {u.airbnb_ical_url || "Not set"}
                                </p>
                              )}
                              <p className="text-[11px] text-slate-500">
                                Airbnb → Calendar → Availability → Export calendar
                                {airbnbSync ? ` · Last synced ${airbnbSync}` : ""}
                              </p>
                              {u.airbnb_last_error ? (
                                <p className="text-[11px] text-amber-400">
                                  Last error: {u.airbnb_last_error}
                                </p>
                              ) : null}
                            </label>

                            <label className="block space-y-1.5">
                              <span className="text-xs font-medium text-slate-300">
                                Booking.com import URL
                              </span>
                              {editing ? (
                                <input
                                  type="url"
                                  value={u.bookingcom_ical_url}
                                  onChange={(e) =>
                                    patchRow(u.id, { bookingcom_ical_url: e.target.value })
                                  }
                                  placeholder="https://www.booking.com/.../ical"
                                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600"
                                />
                              ) : (
                                <p className="break-all rounded border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
                                  {u.bookingcom_ical_url || "Not set"}
                                </p>
                              )}
                              <p className="text-[11px] text-slate-500">
                                Booking.com → Calendar → iCal import link
                                {bookingSync ? ` · Last synced ${bookingSync}` : ""}
                              </p>
                              {u.bookingcom_last_error ? (
                                <p className="text-[11px] text-amber-400">
                                  Last error: {u.bookingcom_last_error}
                                </p>
                              ) : null}
                            </label>

                            <div className="space-y-1.5">
                              <span className="text-xs font-medium text-slate-300">
                                DigitalGate export URL
                              </span>
                              {u.ical_export_url ? (
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                  <input
                                    type="text"
                                    readOnly
                                    value={u.ical_export_url}
                                    onFocus={(e) => e.currentTarget.select()}
                                    className="w-full rounded border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-200"
                                  />
                                  <CopyExportButton url={u.ical_export_url} />
                                </div>
                              ) : (
                                <p className="rounded border border-dashed border-slate-700 px-3 py-2 text-xs text-slate-500">
                                  Export URL unavailable — deploy plugin v10.61.0+ so WordPress
                                  returns <code className="text-slate-400">ical_export_url</code>.
                                </p>
                              )}
                              <p className="text-[11px] text-slate-500">
                                Paste into Airbnb / Booking.com as an imported calendar (outbound
                                from DigitalGate).
                                {u.ical_export_fallback_url ? (
                                  <>
                                    {" "}
                                    ·{" "}
                                    <a
                                      href={u.ical_export_fallback_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:underline"
                                    >
                                      Alternate link
                                    </a>
                                  </>
                                ) : null}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        To pull OTA bookings after updating import URLs, use{" "}
        <span className="text-slate-400">Sync Airbnb & Booking.com</span> on the Calendar page.
      </p>
    </div>
  );
}
