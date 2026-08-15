"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState, type ReactNode } from "react";

import type { WpAccUnitFeatures, WpAccUnitProp } from "@/lib/dg-api";

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

const POST_STATUS_OPTIONS = [
  { value: "publish", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "private", label: "Private" },
  { value: "pending", label: "Pending" },
];

const DEFAULT_FEATURE_LABELS: Record<string, string> = {
  fire_pit: "Fire Pit",
  mountain_views: "Mountain Views",
  sauna: "Sauna",
  outdoor_shower: "Outdoor Shower",
  air_conditioning: "Air Conditioning",
  pet_friendly: "Pet Friendly",
  wifi: "WiFi",
  kitchenette: "Kitchenette",
  bbq: "BBQ",
  parking: "Parking",
  private_deck: "Private Deck",
  spa: "Spa",
};

type EditableUnit = WpAccUnitProp & {
  title: string;
  description: string;
  address: string;
  airbnb_ical_url: string;
  bookingcom_ical_url: string;
  airbnb_id: string;
  bookingcom_id: string;
  video_url: string;
  virtual_tour: string;
  gallery: string;
  gallery_urls: string[];
  featured_image_url: string;
  checkin_time: string;
  checkout_time: string;
  peak_season_start: string;
  peak_season_end: string;
  latitude: string;
  longitude: string;
  housekeeping_notes: string;
  features: WpAccUnitFeatures;
};

function unitRowKey(u: Pick<WpAccUnitProp, "id" | "platform_id">): string {
  if (typeof u.platform_id === "string" && u.platform_id.trim()) {
    return u.platform_id.trim();
  }
  return `wp-${u.id}`;
}

function emptyFeatures(labels?: Record<string, string>): WpAccUnitFeatures {
  const out: WpAccUnitFeatures = {};
  for (const key of Object.keys(labels ?? DEFAULT_FEATURE_LABELS)) {
    out[key] = 0;
  }
  return out;
}

function toRows(list: WpAccUnitProp[]): EditableUnit[] {
  return list.map((u) => ({
    ...u,
    title: u.title,
    description: u.description ?? "",
    address: u.address ?? "",
    airbnb_ical_url: u.airbnb_ical_url ?? "",
    bookingcom_ical_url: u.bookingcom_ical_url ?? "",
    airbnb_id: u.airbnb_id ?? "",
    bookingcom_id: u.bookingcom_id ?? "",
    video_url: u.video_url ?? "",
    virtual_tour: u.virtual_tour ?? "",
    gallery: u.gallery ?? "",
    gallery_urls: Array.isArray(u.gallery_urls)
      ? u.gallery_urls.filter((url): url is string => typeof url === "string" && url.trim() !== "")
      : [],
    featured_image_url: u.featured_image_url ?? "",
    checkin_time: u.checkin_time ?? "",
    checkout_time: u.checkout_time ?? "",
    peak_season_start: u.peak_season_start ?? "",
    peak_season_end: u.peak_season_end ?? "",
    latitude: u.latitude ?? "",
    longitude: u.longitude ?? "",
    housekeeping_notes: u.housekeeping_notes ?? "",
    features: { ...emptyFeatures(u.feature_labels), ...(u.features ?? {}) },
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

function numOrEmpty(v: number | null | undefined) {
  return v == null ? "" : String(v);
}

function parseOptionalNumber(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-xs font-medium text-slate-300">{children}</span>;
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-[11px] text-slate-500">{children}</p>;
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function TextInput({
  value,
  onChange,
  type = "text",
  placeholder,
  readOnly,
  className = "",
}: {
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      onFocus={readOnly ? (e) => e.currentTarget.select() : undefined}
      className={`w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 read-only:bg-slate-900/80 read-only:text-slate-200 ${className}`}
    />
  );
}

function CopyExportButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
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
      className="shrink-0 rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:border-blue-500 hover:text-white"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function OtaCalendarsSection({
  u,
  editing,
  patchRow,
}: {
  u: EditableUnit;
  editing: boolean;
  patchRow: (unit: EditableUnit, patch: Partial<EditableUnit>) => void;
}) {
  const airbnbSync = formatSync(u.airbnb_last_sync);
  const bookingSync = formatSync(u.bookingcom_last_sync);

  return (
    <Section
      title="OTA calendars"
      hint="Import URLs pull bookings from Airbnb / Booking.com into DigitalGate. Paste the DigitalGate export URL into each OTA — not between OTAs."
    >
      <div className="grid gap-4">
        <label className="block space-y-1.5">
          <FieldLabel>Airbnb import URL</FieldLabel>
          {editing ? (
            <TextInput
              value={u.airbnb_ical_url}
              onChange={(v) => patchRow(u, { airbnb_ical_url: v })}
              placeholder="https://www.airbnb.com/calendar/ical/..."
            />
          ) : (
            <p className="break-all rounded border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
              {u.airbnb_ical_url || "Not set"}
            </p>
          )}
          <FieldHint>
            Airbnb → Calendar → Availability → Export calendar
            {airbnbSync ? ` · Last synced ${airbnbSync}` : ""}
          </FieldHint>
          {u.airbnb_last_error ? (
            <p className="text-[11px] text-amber-400">Last error: {u.airbnb_last_error}</p>
          ) : null}
        </label>

        <label className="block space-y-1.5">
          <FieldLabel>Booking.com import URL</FieldLabel>
          {editing ? (
            <TextInput
              value={u.bookingcom_ical_url}
              onChange={(v) => patchRow(u, { bookingcom_ical_url: v })}
              placeholder="https://admin.booking.com/.../ical.html?t=..."
            />
          ) : (
            <p className="break-all rounded border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
              {u.bookingcom_ical_url || "Not set"}
            </p>
          )}
          <FieldHint>
            Booking.com Extranet → Rates &amp; Availability → Sync calendars →{" "}
            <span className="text-slate-300">Export calendar</span> → copy link into DigitalGate
            (not the Import calendar field — that is for the DigitalGate export URL below)
            {bookingSync ? ` · Last synced ${bookingSync}` : ""}
          </FieldHint>
          {u.bookingcom_last_error ? (
            <p className="text-[11px] text-amber-400">Last error: {u.bookingcom_last_error}</p>
          ) : null}
        </label>

        <div className="space-y-1.5">
          <FieldLabel>DigitalGate export → Airbnb</FieldLabel>
          {u.ical_export_airbnb_url || u.ical_export_url ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <TextInput
                readOnly
                value={u.ical_export_airbnb_url || u.ical_export_url || ""}
                className="text-xs"
              />
              <CopyExportButton url={u.ical_export_airbnb_url || u.ical_export_url || ""} />
            </div>
          ) : (
            <p className="rounded border border-dashed border-slate-700 px-3 py-2 text-xs text-slate-500">
              Export URL unavailable — ensure the unit has a slug so Gen 2 can mint a public iCal
              export link.
            </p>
          )}
          <FieldHint>
            Paste into Airbnb → Availability → Connect calendars → Import. Includes Booking.com /
            direct / manual blocks from DigitalGate; omits Airbnb&apos;s own rows. Booking.com must
            be imported into DigitalGate first (Sync Airbnb &amp; Booking.com) — this is not
            Booking.com→Airbnb direct.
          </FieldHint>
        </div>

        <div className="space-y-1.5">
          <FieldLabel>DigitalGate export → Booking.com</FieldLabel>
          {u.ical_export_bookingcom_url || u.ical_export_url ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <TextInput
                readOnly
                value={u.ical_export_bookingcom_url || u.ical_export_url || ""}
                className="text-xs"
              />
              <CopyExportButton url={u.ical_export_bookingcom_url || u.ical_export_url || ""} />
            </div>
          ) : null}
          <FieldHint>
            Paste into Booking.com Extranet → Sync calendars → Import calendar. Omits Booking.com
            sourced rows; keeps Airbnb + direct blocks.
            {u.ical_export_wp_url ? (
              <>
                {" "}
                · Legacy WP link (often blocked for OTA bots):{" "}
                <a
                  href={u.ical_export_wp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  open
                </a>
              </>
            ) : null}
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
                  Alternate WP link
                </a>
              </>
            ) : null}
          </FieldHint>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <FieldLabel>Airbnb listing ID</FieldLabel>
            {editing ? (
              <TextInput
                value={u.airbnb_id}
                onChange={(v) => patchRow(u, { airbnb_id: v })}
                placeholder="12345678"
              />
            ) : (
              <p className="text-sm text-slate-300">{u.airbnb_id || "—"}</p>
            )}
          </label>
          <label className="block space-y-1.5">
            <FieldLabel>Booking.com listing ID</FieldLabel>
            {editing ? (
              <TextInput
                value={u.bookingcom_id}
                onChange={(v) => patchRow(u, { bookingcom_id: v })}
                placeholder="123456789"
              />
            ) : (
              <p className="text-sm text-slate-300">{u.bookingcom_id || "—"}</p>
            )}
          </label>
        </div>
      </div>
    </Section>
  );
}

export function AccommodationUnitsTable({
  units,
  error,
  siteLabel,
  wpImportAvailable = false,
  source = "postgres",
}: {
  units: WpAccUnitProp[];
  error?: string;
  siteLabel?: string;
  /** Show migration Import when connector is a live WordPress Acc host. */
  wpImportAvailable?: boolean;
  source?: "postgres" | "wordpress";
}) {
  const router = useRouter();
  const [rows, setRows] = useState<EditableUnit[]>(() => toRows(units));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [panelOpenKey, setPanelOpenKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setRows(toRows(units));
  }, [units]);

  const comingSoonCount = rows.filter((r) => r.listing_status === "coming_soon").length;
  const eventsCount = rows.filter((r) => r.listing_status === "events_future").length;
  const sourceHint =
    source === "postgres"
      ? "Platform (Neon)"
      : wpImportAvailable
        ? "WordPress (live)"
        : "WordPress";

  if (error && !rows.length) {
    return (
      <div className="space-y-3">
        <div className="dg-card border-amber-500/30">
          <p className="text-amber-300">{error}</p>
          <p className="mt-2 text-sm text-slate-500">
            {wpImportAvailable
              ? "Check the WordPress connector (Settings → Connectors), then try Import from WordPress."
              : "Units load from Neon on Gen 2 sites. Point the connector at a legacy WP host only if you need a one-time migration import."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refreshUnits()}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Refresh units
          </button>
          {wpImportAvailable ? (
            <button
              type="button"
              onClick={() => void importFromWordPress()}
              className="rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-blue-500"
            >
              Import from WordPress
            </button>
          ) : null}
        </div>
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
            "Could not load units from the platform.",
        );
        return;
      }
      const next = Array.isArray(json.data) ? (json.data as WpAccUnitProp[]) : [];
      setRows(toRows(next));
      setEditingKey(null);
      const soon = next.filter((u) => u.listing_status === "coming_soon").length;
      const events = next.filter((u) => u.listing_status === "events_future").length;
      const extras = [
        soon ? `${soon} coming soon` : null,
        events ? `${events} events/future` : null,
      ]
        .filter(Boolean)
        .join(", ");
      setMessage(
        `Loaded ${next.length} unit${next.length === 1 ? "" : "s"} from platform` +
          (extras ? ` (${extras})` : "") +
          ".",
      );
      router.refresh();
    } catch {
      setSaveError("Network error while loading units.");
    } finally {
      setSyncing(false);
    }
  }

  async function importFromWordPress() {
    if (!wpImportAvailable) return;
    setImporting(true);
    setMessage(null);
    setSaveError(null);
    try {
      const res = await fetch("/api/v1/accommodation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_units" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(
          json.error?.message ??
            "WordPress import failed — check the connector base URL and API key.",
        );
        return;
      }
      const created = Number(json.data?.created ?? 0);
      const updated = Number(json.data?.updated ?? 0);
      const skipped = Number(json.data?.skipped ?? 0);
      setMessage(
        `Imported from WordPress — ${created} created, ${updated} updated` +
          (skipped ? `, ${skipped} skipped` : "") +
          ".",
      );
      await refreshUnits();
    } catch {
      setSaveError("Network error while importing from WordPress.");
    } finally {
      setImporting(false);
    }
  }

  if (!rows.length) {
    return (
      <div className="space-y-3">
        <div className="dg-card border-dashed border-slate-700">
          <h2 className="text-lg font-semibold text-white">Add your first units</h2>
          {siteLabel ? <p className="mt-1 text-sm text-slate-500">Site: {siteLabel}</p> : null}
          <p className="mt-2 text-sm text-slate-500">
            {wpImportAvailable
              ? "Import listings from your WordPress Acc plugin into Neon (one-time or catch-up), then manage OTA calendar URLs here."
              : "Units live in Neon on Gen 2. Refresh to reload platform data. For a migrating customer still on WordPress, point Settings → Connectors at their WP host to enable Import."}
          </p>
          {error ? <p className="mt-2 text-sm text-amber-300">{error}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={syncing || importing}
            onClick={() => void refreshUnits()}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {syncing ? "Refreshing…" : "Refresh units"}
          </button>
          {wpImportAvailable ? (
            <button
              type="button"
              disabled={syncing || importing}
              onClick={() => void importFromWordPress()}
              className="rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-blue-500 disabled:opacity-50"
            >
              {importing ? "Importing…" : "Import from WordPress"}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  function patchRow(unit: EditableUnit, patch: Partial<EditableUnit>) {
    const key = unitRowKey(unit);
    setRows((prev) =>
      prev.map((r) => (unitRowKey(r) === key ? { ...r, ...patch } : r)),
    );
  }

  async function uploadUnitImage(unit: EditableUnit, file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    form.append("unitKey", unitRowKey(unit));
    const res = await fetch("/api/v1/accommodation/media", {
      method: "POST",
      body: form,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.error?.message ?? "Upload failed");
    }
    return json.data.url as string;
  }

  async function onGalleryFilesSelected(unit: EditableUnit, files: FileList | null) {
    if (!files?.length) return;
    const key = unitRowKey(unit);
    setUploadingKey(key);
    setSaveError(null);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        urls.push(await uploadUnitImage(unit, file));
      }
      const next = [...(unit.gallery_urls ?? [])];
      for (const url of urls) {
        if (!next.includes(url)) next.push(url);
      }
      const featured = unit.featured_image_url?.trim() || next[0] || "";
      patchRow(unit, {
        gallery_urls: next,
        featured_image_url: featured,
      });
      setMessage(
        `Uploaded ${urls.length} image${urls.length === 1 ? "" : "s"} — click Save unit to publish to the stay page.`,
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingKey(null);
    }
  }

  async function onFeaturedFileSelected(unit: EditableUnit, file: File | null) {
    if (!file) return;
    const key = unitRowKey(unit);
    setUploadingKey(key);
    setSaveError(null);
    try {
      const url = await uploadUnitImage(unit, file);
      const gallery = [...(unit.gallery_urls ?? [])];
      if (!gallery.includes(url)) gallery.unshift(url);
      patchRow(unit, {
        featured_image_url: url,
        gallery_urls: gallery,
      });
      setMessage("Featured image uploaded — click Save unit to publish.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingKey(null);
    }
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
            platform_id: row.platform_id,
            title: row.title,
            post_status: row.post_status,
            description: row.description,
            address: row.address,
            latitude: row.latitude,
            longitude: row.longitude,
            weekday_rate: row.weekday_rate,
            weekend_rate: row.weekend_rate,
            weekday_peak_rate: row.weekday_peak_rate,
            weekend_peak_rate: row.weekend_peak_rate,
            peak_season_start: row.peak_season_start,
            peak_season_end: row.peak_season_end,
            last_minute_discount: row.last_minute_discount,
            early_bird_discount: row.early_bird_discount,
            cleaning_fee: row.cleaning_fee,
            security_deposit: row.security_deposit,
            extra_guest_fee: row.extra_guest_fee,
            sleeps: row.sleeps,
            bedrooms: row.bedrooms,
            bathrooms: row.bathrooms,
            max_guests: row.max_guests,
            min_nights: row.min_nights,
            size: row.size,
            checkin_time: row.checkin_time,
            checkout_time: row.checkout_time,
            features: row.features,
            gallery: row.gallery,
            gallery_urls: row.gallery_urls ?? [],
            featured_image_url: row.featured_image_url ?? "",
            video_url: row.video_url,
            virtual_tour: row.virtual_tour,
            featured: row.featured,
            landing_page_id: row.landing_page_id,
            airbnb_id: row.airbnb_id,
            bookingcom_id: row.bookingcom_id,
            listing_status: row.listing_status,
            housekeeping_status: row.housekeeping_status,
            housekeeping_notes: row.housekeeping_notes,
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
          "Could not save unit to Neon. Check the unit id and try again.",
      );
      return;
    }
    const updated = Array.isArray(json.data?.updated)
      ? (json.data.updated as WpAccUnitProp[])
      : null;
    if (updated?.length) {
      const map = new Map(
        updated.map((u) => [unitRowKey(u), u] as const),
      );
      setRows((prev) =>
        prev.map((r) => {
          const next = map.get(unitRowKey(r));
          return next ? { ...toRows([next])[0]! } : r;
        }),
      );
    }
    setEditingKey(null);
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
          {` · ${sourceHint}`}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={syncing || importing}
            onClick={() => void refreshUnits()}
            className="rounded-full border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500 disabled:opacity-50"
          >
            {syncing ? "Refreshing…" : "Refresh units"}
          </button>
          {wpImportAvailable ? (
            <button
              type="button"
              disabled={syncing || importing}
              onClick={() => void importFromWordPress()}
              className="rounded-full border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500 disabled:opacity-50"
              title="One-time or catch-up import from the WordPress Acc plugin into Neon"
            >
              {importing ? "Importing…" : "Import from WordPress"}
            </button>
          ) : null}
        </div>
      </div>
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {saveError ? <p className="text-sm text-amber-400">{saveError}</p> : null}
      <p className="text-xs text-slate-500">
        Click <span className="text-slate-300">Edit</span> on a unit for full meta +{" "}
        <span className="text-slate-300">OTA calendars</span> (Airbnb / Booking.com import +
        DigitalGate export URL with Copy).
        {wpImportAvailable
          ? " Import from WordPress seeds or refreshes Neon from a live WP Acc connector (migration / catch-up)."
          : " Gen 2 sites use Neon only — Import appears when the connector points at a legacy WordPress host."}
      </p>

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
              const rowKey = unitRowKey(u);
              const editing = editingKey === rowKey;
              const panelOpen = panelOpenKey === rowKey || editing;
              const uploading = uploadingKey === rowKey;
              const listingLabel =
                LISTING_OPTIONS.find((o) => o.value === (u.listing_status ?? "bookable"))
                  ?.label ?? u.listing_status;
              const featureLabels = u.feature_labels ?? DEFAULT_FEATURE_LABELS;

              return (
                <Fragment key={rowKey}>
                  <tr className="hover:bg-slate-900/40">
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-white">{u.title}</span>
                        {u.post_status && u.post_status !== "publish" ? (
                          <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] uppercase text-amber-300">
                            {u.post_status}
                          </span>
                        ) : null}
                        {u.accommodation_type ? (
                          <p className="mt-0.5 text-xs text-slate-500">{u.accommodation_type}</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {u.weekday_rate != null ? `$${u.weekday_rate}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {u.weekend_rate != null ? `$${u.weekend_rate}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {u.cleaning_fee != null ? `$${u.cleaning_fee}` : "—"}
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-400">
                      {u.housekeeping_status ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          setPanelOpenKey(panelOpen && !editing ? null : rowKey)
                        }
                        className={`rounded-full border px-2.5 py-1 text-[11px] ${
                          hasOtaConfigured(u)
                            ? "border-emerald-700/60 text-emerald-300 hover:border-emerald-500"
                            : "border-slate-700 text-slate-300 hover:border-blue-500 hover:text-white"
                        }`}
                      >
                        {panelOpen
                          ? "Hide"
                          : hasOtaConfigured(u)
                            ? "iCal · set"
                            : "iCal / OTA"}
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
                              setEditingKey(null);
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
                            setEditingKey(rowKey);
                            setPanelOpenKey(rowKey);
                          }}
                          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:border-blue-500 hover:text-white"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                  {panelOpen ? (
                    <tr className="bg-slate-950/70">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="mx-auto grid max-w-4xl gap-4">
                          <OtaCalendarsSection
                            u={u}
                            editing={editing}
                            patchRow={patchRow}
                          />

                          {editing ? (
                            <>
                              <Section title="Basics / listing">
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <label className="block space-y-1.5 sm:col-span-2">
                                    <FieldLabel>Title</FieldLabel>
                                    <TextInput
                                      value={u.title}
                                      onChange={(v) => patchRow(u, { title: v })}
                                    />
                                  </label>
                                  <label className="block space-y-1.5 sm:col-span-2">
                                    <FieldLabel>Description</FieldLabel>
                                    <textarea
                                      value={u.description}
                                      onChange={(e) =>
                                        patchRow(u, { description: e.target.value })
                                      }
                                      rows={4}
                                      className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                                    />
                                  </label>
                                  <label className="block space-y-1.5">
                                    <FieldLabel>Listing status</FieldLabel>
                                    <select
                                      value={u.listing_status ?? "bookable"}
                                      onChange={(e) =>
                                        patchRow(u, { listing_status: e.target.value })
                                      }
                                      className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                                    >
                                      {LISTING_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                          {o.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="block space-y-1.5">
                                    <FieldLabel>Post status</FieldLabel>
                                    <select
                                      value={u.post_status ?? "publish"}
                                      onChange={(e) =>
                                        patchRow(u, { post_status: e.target.value })
                                      }
                                      className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                                    >
                                      {POST_STATUS_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                          {o.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="block space-y-1.5">
                                    <FieldLabel>Housekeeping</FieldLabel>
                                    <select
                                      value={u.housekeeping_status ?? "unknown"}
                                      onChange={(e) =>
                                        patchRow(u, { housekeeping_status: e.target.value })
                                      }
                                      className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                                    >
                                      {HK_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                          {o.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="flex items-end gap-2 pb-2">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(u.featured)}
                                      onChange={(e) =>
                                        patchRow(u, { featured: e.target.checked })
                                      }
                                      className="rounded border-slate-600"
                                    />
                                    <FieldLabel>Featured listing</FieldLabel>
                                  </label>
                                  <label className="block space-y-1.5 sm:col-span-2">
                                    <FieldLabel>Housekeeping notes</FieldLabel>
                                    <TextInput
                                      value={u.housekeeping_notes}
                                      onChange={(v) =>
                                        patchRow(u, { housekeeping_notes: v })
                                      }
                                    />
                                    {u.last_cleaned ? (
                                      <FieldHint>
                                        Last cleaned {formatSync(u.last_cleaned)}
                                      </FieldHint>
                                    ) : null}
                                  </label>
                                </div>
                              </Section>

                              <Section title="Rates & fees">
                                <div className="grid gap-3 sm:grid-cols-3">
                                  {(
                                    [
                                      ["weekday_rate", "Weekday rate"],
                                      ["weekend_rate", "Weekend rate"],
                                      ["cleaning_fee", "Cleaning fee"],
                                      ["security_deposit", "Security deposit"],
                                      ["extra_guest_fee", "Extra guest fee"],
                                      ["weekday_peak_rate", "Weekday peak"],
                                      ["weekend_peak_rate", "Weekend peak"],
                                    ] as const
                                  ).map(([key, label]) => (
                                    <label key={key} className="block space-y-1.5">
                                      <FieldLabel>{label}</FieldLabel>
                                      <TextInput
                                        type="number"
                                        value={numOrEmpty(u[key])}
                                        onChange={(v) =>
                                          patchRow(u, { [key]: parseOptionalNumber(v) })
                                        }
                                      />
                                    </label>
                                  ))}
                                  <label className="block space-y-1.5">
                                    <FieldLabel>Peak start (MM-DD)</FieldLabel>
                                    <TextInput
                                      value={u.peak_season_start}
                                      onChange={(v) =>
                                        patchRow(u, { peak_season_start: v })
                                      }
                                      placeholder="12-15"
                                    />
                                  </label>
                                  <label className="block space-y-1.5">
                                    <FieldLabel>Peak end (MM-DD)</FieldLabel>
                                    <TextInput
                                      value={u.peak_season_end}
                                      onChange={(v) =>
                                        patchRow(u, { peak_season_end: v })
                                      }
                                      placeholder="01-15"
                                    />
                                  </label>
                                  <label className="block space-y-1.5">
                                    <FieldLabel>Last-minute discount %</FieldLabel>
                                    <TextInput
                                      type="number"
                                      value={numOrEmpty(u.last_minute_discount)}
                                      onChange={(v) =>
                                        patchRow(u, {
                                          last_minute_discount: parseOptionalNumber(v),
                                        })
                                      }
                                    />
                                  </label>
                                  <label className="block space-y-1.5">
                                    <FieldLabel>Early-bird discount %</FieldLabel>
                                    <TextInput
                                      type="number"
                                      value={numOrEmpty(u.early_bird_discount)}
                                      onChange={(v) =>
                                        patchRow(u, {
                                          early_bird_discount: parseOptionalNumber(v),
                                        })
                                      }
                                    />
                                  </label>
                                </div>
                              </Section>

                              <Section title="Capacity & stay rules">
                                <div className="grid gap-3 sm:grid-cols-3">
                                  {(
                                    [
                                      ["sleeps", "Sleeps"],
                                      ["bedrooms", "Bedrooms"],
                                      ["bathrooms", "Bathrooms"],
                                      ["max_guests", "Max guests"],
                                      ["min_nights", "Min nights"],
                                      ["size", "Size (m²)"],
                                    ] as const
                                  ).map(([key, label]) => (
                                    <label key={key} className="block space-y-1.5">
                                      <FieldLabel>{label}</FieldLabel>
                                      <TextInput
                                        type="number"
                                        value={numOrEmpty(u[key])}
                                        onChange={(v) =>
                                          patchRow(u, { [key]: parseOptionalNumber(v) })
                                        }
                                      />
                                    </label>
                                  ))}
                                  <label className="block space-y-1.5">
                                    <FieldLabel>Check-in time</FieldLabel>
                                    <TextInput
                                      type="time"
                                      value={u.checkin_time}
                                      onChange={(v) => patchRow(u, { checkin_time: v })}
                                    />
                                  </label>
                                  <label className="block space-y-1.5">
                                    <FieldLabel>Check-out time</FieldLabel>
                                    <TextInput
                                      type="time"
                                      value={u.checkout_time}
                                      onChange={(v) => patchRow(u, { checkout_time: v })}
                                    />
                                  </label>
                                </div>
                              </Section>

                              <Section title="Location">
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <label className="block space-y-1.5 sm:col-span-2">
                                    <FieldLabel>Address</FieldLabel>
                                    <TextInput
                                      value={u.address}
                                      onChange={(v) => patchRow(u, { address: v })}
                                    />
                                  </label>
                                  <label className="block space-y-1.5">
                                    <FieldLabel>Latitude</FieldLabel>
                                    <TextInput
                                      value={u.latitude}
                                      onChange={(v) => patchRow(u, { latitude: v })}
                                    />
                                  </label>
                                  <label className="block space-y-1.5">
                                    <FieldLabel>Longitude</FieldLabel>
                                    <TextInput
                                      value={u.longitude}
                                      onChange={(v) => patchRow(u, { longitude: v })}
                                    />
                                  </label>
                                </div>
                              </Section>

                              <Section title="Amenities">
                                <div className="grid gap-2 sm:grid-cols-3">
                                  {Object.entries(featureLabels).map(([key, label]) => (
                                    <label key={key} className="flex items-center gap-2 text-sm text-slate-300">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(u.features[key])}
                                        onChange={(e) =>
                                          patchRow(u, {
                                            features: {
                                              ...u.features,
                                              [key]: e.target.checked ? 1 : 0,
                                            },
                                          })
                                        }
                                        className="rounded border-slate-600"
                                      />
                                      {label}
                                    </label>
                                  ))}
                                </div>
                              </Section>

                              <Section
                                title="Media"
                                hint="Upload images for the public stay page gallery and lightbox. First image (or featured) is the hero."
                              >
                                <div className="grid gap-4">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500">
                                      <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/gif"
                                        multiple
                                        className="hidden"
                                        disabled={uploading || pending}
                                        onChange={(e) => {
                                          void onGalleryFilesSelected(u, e.target.files);
                                          e.target.value = "";
                                        }}
                                      />
                                      {uploading ? "Uploading…" : "Upload gallery images"}
                                    </label>
                                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500">
                                      <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/gif"
                                        className="hidden"
                                        disabled={uploading || pending}
                                        onChange={(e) => {
                                          void onFeaturedFileSelected(
                                            u,
                                            e.target.files?.[0] ?? null,
                                          );
                                          e.target.value = "";
                                        }}
                                      />
                                      Set featured image
                                    </label>
                                    <FieldHint>PNG/JPG/WebP up to 5 MB each</FieldHint>
                                  </div>

                                  {(u.gallery_urls?.length || u.featured_image_url) ? (
                                    <div className="flex flex-wrap gap-3">
                                      {(u.gallery_urls?.length
                                        ? u.gallery_urls
                                        : u.featured_image_url
                                          ? [u.featured_image_url]
                                          : []
                                      ).map((url) => {
                                        const isFeatured =
                                          url === u.featured_image_url ||
                                          (!u.featured_image_url &&
                                            url === u.gallery_urls?.[0]);
                                        return (
                                          <div
                                            key={url}
                                            className="relative overflow-hidden rounded-lg border border-slate-700"
                                          >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={url}
                                              alt=""
                                              className="h-24 w-24 object-cover"
                                            />
                                            {isFeatured ? (
                                              <span className="absolute left-1 top-1 rounded bg-blue-600/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
                                                Featured
                                              </span>
                                            ) : null}
                                            <div className="flex gap-1 border-t border-slate-800 bg-slate-950/90 p-1">
                                              {!isFeatured ? (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    patchRow(u, {
                                                      featured_image_url: url,
                                                    })
                                                  }
                                                  className="flex-1 rounded px-1 py-0.5 text-[9px] text-slate-300 hover:bg-slate-800 hover:text-white"
                                                >
                                                  Feature
                                                </button>
                                              ) : null}
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const next = (u.gallery_urls ?? []).filter(
                                                    (x) => x !== url,
                                                  );
                                                  patchRow(u, {
                                                    gallery_urls: next,
                                                    featured_image_url:
                                                      u.featured_image_url === url
                                                        ? next[0] ?? ""
                                                        : u.featured_image_url,
                                                  });
                                                }}
                                                className="flex-1 rounded px-1 py-0.5 text-[9px] text-amber-300 hover:bg-slate-800"
                                              >
                                                Remove
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-500">
                                      No gallery images yet — upload photos to show on the unit stay
                                      page.
                                    </p>
                                  )}

                                  <label className="block space-y-1.5">
                                    <FieldLabel>Featured image URL</FieldLabel>
                                    <TextInput
                                      type="url"
                                      value={u.featured_image_url}
                                      onChange={(v) =>
                                        patchRow(u, { featured_image_url: v })
                                      }
                                      placeholder="https://… (or upload above)"
                                    />
                                  </label>

                                  <label className="block space-y-1.5">
                                    <FieldLabel>Legacy WP gallery IDs</FieldLabel>
                                    <TextInput
                                      value={u.gallery}
                                      onChange={(v) => patchRow(u, { gallery: v })}
                                      placeholder="Optional — WordPress attachment IDs"
                                    />
                                    <FieldHint>
                                      Prefer uploads above on Gen 2. WP IDs only matter if mirroring
                                      to WordPress.
                                    </FieldHint>
                                  </label>

                                  <label className="block space-y-1.5">
                                    <FieldLabel>Video URL</FieldLabel>
                                    <TextInput
                                      type="url"
                                      value={u.video_url}
                                      onChange={(v) => patchRow(u, { video_url: v })}
                                    />
                                  </label>
                                  <label className="block space-y-1.5">
                                    <FieldLabel>Virtual tour URL</FieldLabel>
                                    <TextInput
                                      type="url"
                                      value={u.virtual_tour}
                                      onChange={(v) => patchRow(u, { virtual_tour: v })}
                                    />
                                  </label>
                                  {(u.checkin_url || u.cleaning_form_url) && (
                                    <div className="space-y-1 text-xs text-slate-500">
                                      {u.checkin_url ? (
                                        <p>
                                          Check-in form:{" "}
                                          <a
                                            href={u.checkin_url}
                                            className="text-blue-400 hover:underline"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            open
                                          </a>
                                        </p>
                                      ) : null}
                                      {u.cleaning_form_url ? (
                                        <p>
                                          Cleaning form:{" "}
                                          <a
                                            href={u.cleaning_form_url}
                                            className="text-blue-400 hover:underline"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            open
                                          </a>
                                        </p>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              </Section>
                            </>
                          ) : (
                            <p className="text-xs text-slate-500">
                              Click Edit to change rates, listing details, amenities, and OTA import
                              URLs.
                            </p>
                          )}
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
        After updating import URLs, use{" "}
        <span className="text-slate-400">Sync Airbnb & Booking.com</span> on the Calendar page to
        pull OTA bookings.
      </p>
    </div>
  );
}
