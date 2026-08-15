/**
 * Accommodation units / properties — Neon SoT with WordPress mirror (WP-D-402).
 * Availability = unit.manualBlockedDates + non-cancelled StayBooking ranges.
 * Housekeeping status lives on the unit row (WP-D-404 when flag on).
 */

import type { Prisma } from "@dg/database";

import { organisationHasFlag } from "../features/flags";
import { resolveOrgWordPressConnector } from "../connectors/wordpress/org-connector";
import { sortAccommodationUnitsByDisplayOrder } from "./display-order";
import { attachPlatformIcalUrls } from "./ical-export";

export {
  CVH_UNIT_DISPLAY_ORDER,
  accommodationUnitDisplayOrderIndex,
  accommodationUnitDisplayTail,
  resolveCvhUnitDisplaySlug,
  sortAccommodationUnitsByDisplayOrder,
  type AccommodationUnitOrderable,
  type CvhUnitDisplaySlug,
} from "./display-order";

export type WpAccUnitPropRow = {
  id: number;
  /** Neon AccommodationUnit id — preferred lookup when Gen 2 is SoT */
  platform_id?: string;
  title?: string;
  slug?: string;
  post_status?: string;
  description?: string;
  accommodation_type?: string;
  address?: string;
  weekday_rate?: number | null;
  weekend_rate?: number | null;
  cleaning_fee?: number | null;
  sleeps?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  max_guests?: number | null;
  min_nights?: number | null;
  checkin_time?: string;
  checkout_time?: string;
  features?: Record<string, 0 | 1 | boolean>;
  featured_image_url?: string;
  gallery_urls?: string[];
  last_minute_discount?: number | null;
  early_bird_discount?: number | null;
  airbnb_ical_url?: string;
  bookingcom_ical_url?: string;
  ical_export_url?: string;
  airbnb_id?: string;
  bookingcom_id?: string;
  housekeeping_status?: string;
  housekeeping_notes?: string;
  last_cleaned?: string | null;
  listing_status?: string;
  checkin_url?: string;
  cleaning_form_url?: string;
  manual_blocked_dates?: string[];
  blocked_dates?: string[];
};

export type AccommodationUnitListItem = {
  id: string;
  externalWpId: number | null;
  title: string;
  slug?: string | null;
  postStatus?: string | null;
  listingStatus: string;
  description?: string | null;
  accommodationType?: string | null;
  address?: string | null;
  weekdayRate: number | null;
  weekendRate: number | null;
  cleaningFee: number | null;
  sleeps?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  maxGuests?: number | null;
  minNights?: number | null;
  checkinTime?: string | null;
  checkoutTime?: string | null;
  features?: Record<string, unknown> | null;
  featuredImageUrl?: string | null;
  galleryUrls?: string[];
  /** Percent discounts + misc listing meta (WP dg_last_minute_discount etc.) */
  metadata?: Record<string, unknown> | null;
  lastMinuteDiscount?: number | null;
  earlyBirdDiscount?: number | null;
  airbnbIcalUrl?: string | null;
  bookingcomIcalUrl?: string | null;
  icalExportUrl?: string | null;
  airbnbId?: string | null;
  bookingcomId?: string | null;
  housekeepingStatus: string;
  housekeepingNotes?: string | null;
  lastCleaned?: string | null;
  manualBlockedDates: string[];
  checkinUrl?: string | null;
  cleaningFormUrl?: string | null;
};

export type SyncAccommodationUnitsResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export type SyncAccommodationUnitsOutcome =
  | { ok: true; result: SyncAccommodationUnitsResult }
  | { ok: false; reason: string; message: string };

function dollarsToCents(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

function centsToDollars(value: number | null | undefined): number | null {
  if (value == null) return null;
  return value / 100;
}

function asDateList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
}

function parseLastCleaned(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function serializeUnit(row: {
  id: string;
  externalWpId: number | null;
  title: string;
  slug: string | null;
  postStatus: string | null;
  listingStatus: string;
  description: string | null;
  accommodationType: string | null;
  address: string | null;
  weekdayRateCents: number | null;
  weekendRateCents: number | null;
  cleaningFeeCents: number | null;
  sleeps: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  maxGuests: number | null;
  minNights: number | null;
  checkinTime: string | null;
  checkoutTime: string | null;
  features: unknown;
  featuredImageUrl: string | null;
  galleryUrls: unknown;
  metadata: unknown;
  airbnbIcalUrl: string | null;
  bookingcomIcalUrl: string | null;
  icalExportUrl: string | null;
  airbnbId: string | null;
  bookingcomId: string | null;
  housekeepingStatus: string;
  housekeepingNotes: string | null;
  lastCleaned: Date | null;
  manualBlockedDates: unknown;
  checkinUrl: string | null;
  cleaningFormUrl: string | null;
}): AccommodationUnitListItem {
  const gallery = Array.isArray(row.galleryUrls)
    ? row.galleryUrls.filter((u): u is string => typeof u === "string")
    : [];
  const metadata =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : null;
  const lastMinute =
    typeof metadata?.last_minute_discount === "number"
      ? metadata.last_minute_discount
      : typeof metadata?.last_minute_discount === "string"
        ? Number(metadata.last_minute_discount)
        : null;
  const earlyBird =
    typeof metadata?.early_bird_discount === "number"
      ? metadata.early_bird_discount
      : typeof metadata?.early_bird_discount === "string"
        ? Number(metadata.early_bird_discount)
        : null;
  return {
    id: row.id,
    externalWpId: row.externalWpId,
    title: row.title,
    slug: row.slug,
    postStatus: row.postStatus,
    listingStatus: row.listingStatus,
    description: row.description,
    accommodationType: row.accommodationType,
    address: row.address,
    weekdayRate: centsToDollars(row.weekdayRateCents),
    weekendRate: centsToDollars(row.weekendRateCents),
    cleaningFee: centsToDollars(row.cleaningFeeCents),
    sleeps: row.sleeps,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    maxGuests: row.maxGuests,
    minNights: row.minNights,
    checkinTime: row.checkinTime,
    checkoutTime: row.checkoutTime,
    features:
      row.features && typeof row.features === "object"
        ? (row.features as Record<string, unknown>)
        : null,
    featuredImageUrl: row.featuredImageUrl,
    galleryUrls: gallery,
    metadata,
    lastMinuteDiscount: Number.isFinite(lastMinute) ? lastMinute : null,
    earlyBirdDiscount: Number.isFinite(earlyBird) ? earlyBird : null,
    airbnbIcalUrl: row.airbnbIcalUrl,
    bookingcomIcalUrl: row.bookingcomIcalUrl,
    icalExportUrl: row.icalExportUrl,
    airbnbId: row.airbnbId,
    bookingcomId: row.bookingcomId,
    housekeepingStatus: row.housekeepingStatus || "unknown",
    housekeepingNotes: row.housekeepingNotes,
    lastCleaned: row.lastCleaned ? row.lastCleaned.toISOString() : null,
    manualBlockedDates: asDateList(row.manualBlockedDates),
    checkinUrl: row.checkinUrl,
    cleaningFormUrl: row.cleaningFormUrl,
  };
}

/** Shape expected by existing Gen 2 Acc UI (WP property row). */
export function unitToWpProp(item: AccommodationUnitListItem): Record<string, unknown> {
  const icalUrls = attachPlatformIcalUrls({
    slug: item.slug,
    icalExportUrl: item.icalExportUrl,
  });
  return {
    id: item.externalWpId ?? 0,
    platform_id: item.id,
    title: item.title,
    slug: item.slug ?? undefined,
    post_status: item.postStatus ?? undefined,
    description: item.description ?? undefined,
    accommodation_type: item.accommodationType ?? undefined,
    address: item.address ?? undefined,
    weekday_rate: item.weekdayRate,
    weekend_rate: item.weekendRate,
    cleaning_fee: item.cleaningFee,
    sleeps: item.sleeps,
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    max_guests: item.maxGuests,
    min_nights: item.minNights,
    checkin_time: item.checkinTime ?? undefined,
    checkout_time: item.checkoutTime ?? undefined,
    features: item.features ?? undefined,
    featured_image_url: item.featuredImageUrl ?? undefined,
    gallery_urls: item.galleryUrls,
    last_minute_discount: item.lastMinuteDiscount ?? undefined,
    early_bird_discount: item.earlyBirdDiscount ?? undefined,
    airbnb_ical_url: item.airbnbIcalUrl ?? undefined,
    bookingcom_ical_url: item.bookingcomIcalUrl ?? undefined,
    // Prefer Gen 2 public export (bypasses CVH ModSecurity 406 for OTA bots).
    ical_export_url: icalUrls.ical_export_url ?? item.icalExportUrl ?? undefined,
    ical_export_airbnb_url: icalUrls.ical_export_airbnb_url,
    ical_export_bookingcom_url: icalUrls.ical_export_bookingcom_url,
    ical_export_wp_url: icalUrls.ical_export_wp_url,
    airbnb_id: item.airbnbId ?? undefined,
    bookingcom_id: item.bookingcomId ?? undefined,
    housekeeping_status: item.housekeepingStatus,
    housekeeping_notes: item.housekeepingNotes ?? undefined,
    last_cleaned: item.lastCleaned,
    listing_status: item.listingStatus,
    checkin_url: item.checkinUrl ?? undefined,
    cleaning_form_url: item.cleaningFormUrl ?? undefined,
    manual_blocked_dates: item.manualBlockedDates,
    blocked_dates: item.manualBlockedDates,
  };
}

export async function listAccommodationUnits(organisationId: string) {
  if (!process.env.DATABASE_URL) return [] as AccommodationUnitListItem[];
  const { prisma } = await import("@dg/database");
  const rows = await prisma.accommodationUnit.findMany({
    where: { organisationId },
    orderBy: { title: "asc" },
  });
  // CVH canonical order (Private Studio → … → The Shed); unknowns after, A–Z.
  return sortAccommodationUnitsByDisplayOrder(rows.map(serializeUnit));
}

export async function countAccommodationUnits(organisationId: string): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;
  const { prisma } = await import("@dg/database");
  return prisma.accommodationUnit.count({ where: { organisationId } });
}

/** Soft SoT: Neon when rows exist (or flag on); else live WP. */
export async function organisationUsesUnitSot(organisationId: string): Promise<boolean> {
  if (await organisationHasFlag(organisationId, "acc.units_sot")) return true;
  return (await countAccommodationUnits(organisationId)) > 0;
}

export async function organisationUsesHousekeepingSot(
  organisationId: string,
): Promise<boolean> {
  if (await organisationHasFlag(organisationId, "acc.housekeeping_sot")) return true;
  return organisationUsesUnitSot(organisationId);
}

export async function upsertAccommodationUnitFromWpRow(
  organisationId: string,
  unit: WpAccUnitPropRow,
): Promise<"created" | "updated" | "skipped"> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not configured");
  const wpId = unit.id;
  const platformId =
    typeof unit.platform_id === "string" && unit.platform_id.trim()
      ? unit.platform_id.trim()
      : null;
  if ((!Number.isFinite(wpId) || wpId <= 0) && !platformId) return "skipped";

  const { prisma } = await import("@dg/database");
  const hasManualBlocks =
    unit.manual_blocked_dates !== undefined || unit.blocked_dates !== undefined;
  const manualBlockedDates = hasManualBlocks
    ? asDateList(unit.manual_blocked_dates ?? unit.blocked_dates)
    : null;

  let existing =
    platformId != null
      ? await prisma.accommodationUnit.findFirst({
          where: { id: platformId, organisationId },
        })
      : null;
  if (!existing && Number.isFinite(wpId) && wpId > 0) {
    existing = await prisma.accommodationUnit.findUnique({
      where: {
        organisationId_externalWpId: { organisationId, externalWpId: wpId },
      },
    });
  }

  const patch: Prisma.AccommodationUnitUpdateInput = {};
  if (unit.title?.trim()) patch.title = unit.title.trim();
  if (unit.slug !== undefined) patch.slug = unit.slug?.trim() || null;
  if (unit.post_status !== undefined) patch.postStatus = unit.post_status?.trim() || null;
  if (unit.listing_status?.trim()) patch.listingStatus = unit.listing_status.trim();
  if (unit.description !== undefined) patch.description = unit.description?.trim() || null;
  if (unit.accommodation_type !== undefined) {
    patch.accommodationType = unit.accommodation_type?.trim() || null;
  }
  if (unit.address !== undefined) patch.address = unit.address?.trim() || null;
  if (unit.weekday_rate !== undefined) patch.weekdayRateCents = dollarsToCents(unit.weekday_rate);
  if (unit.weekend_rate !== undefined) patch.weekendRateCents = dollarsToCents(unit.weekend_rate);
  if (unit.cleaning_fee !== undefined) patch.cleaningFeeCents = dollarsToCents(unit.cleaning_fee);
  if (unit.sleeps !== undefined) patch.sleeps = unit.sleeps ?? null;
  if (unit.bedrooms !== undefined) patch.bedrooms = unit.bedrooms ?? null;
  if (unit.bathrooms !== undefined) patch.bathrooms = unit.bathrooms ?? null;
  if (unit.max_guests !== undefined) patch.maxGuests = unit.max_guests ?? null;
  if (unit.min_nights !== undefined) patch.minNights = unit.min_nights ?? null;
  if (unit.checkin_time !== undefined) patch.checkinTime = unit.checkin_time?.trim() || null;
  if (unit.checkout_time !== undefined) patch.checkoutTime = unit.checkout_time?.trim() || null;
  if (unit.features !== undefined) {
    patch.features = (unit.features ?? null) as Prisma.InputJsonValue;
  }
  if (unit.featured_image_url !== undefined) {
    patch.featuredImageUrl = unit.featured_image_url?.trim() || null;
  }
  if (unit.gallery_urls !== undefined) {
    patch.galleryUrls = (unit.gallery_urls ?? []) as Prisma.InputJsonValue;
  }
  if (
    unit.last_minute_discount !== undefined ||
    unit.early_bird_discount !== undefined
  ) {
    const prev =
      existing?.metadata && typeof existing.metadata === "object"
        ? (existing.metadata as Record<string, unknown>)
        : {};
    const nextMeta = { ...prev };
    if (unit.last_minute_discount !== undefined) {
      nextMeta.last_minute_discount = unit.last_minute_discount;
    }
    if (unit.early_bird_discount !== undefined) {
      nextMeta.early_bird_discount = unit.early_bird_discount;
    }
    patch.metadata = nextMeta as Prisma.InputJsonValue;
  }
  if (unit.airbnb_ical_url !== undefined) {
    patch.airbnbIcalUrl = unit.airbnb_ical_url?.trim() || null;
  }
  if (unit.bookingcom_ical_url !== undefined) {
    patch.bookingcomIcalUrl = unit.bookingcom_ical_url?.trim() || null;
  }
  if (unit.ical_export_url !== undefined) {
    patch.icalExportUrl = unit.ical_export_url?.trim() || null;
  }
  if (unit.airbnb_id !== undefined) {
    patch.airbnbId = unit.airbnb_id?.trim() || null;
  }
  if (unit.bookingcom_id !== undefined) {
    patch.bookingcomId = unit.bookingcom_id?.trim() || null;
  }
  if (unit.housekeeping_status?.trim()) {
    patch.housekeepingStatus = unit.housekeeping_status.trim();
  }
  if (unit.housekeeping_notes !== undefined) {
    patch.housekeepingNotes = unit.housekeeping_notes?.trim() || null;
  }
  if (unit.last_cleaned !== undefined) {
    patch.lastCleaned = parseLastCleaned(unit.last_cleaned);
  }
  if (manualBlockedDates) {
    patch.manualBlockedDates = manualBlockedDates as Prisma.InputJsonValue;
  }
  if (unit.checkin_url !== undefined) patch.checkinUrl = unit.checkin_url?.trim() || null;
  if (unit.cleaning_form_url !== undefined) {
    patch.cleaningFormUrl = unit.cleaning_form_url?.trim() || null;
  }

  if (existing) {
    if (Object.keys(patch).length === 0) return "skipped";
    await prisma.accommodationUnit.update({
      where: { id: existing.id },
      data: patch,
    });
    return "updated";
  }

  if (!Number.isFinite(wpId) || wpId <= 0) return "skipped";

  await prisma.accommodationUnit.create({
    data: {
      organisationId,
      externalWpId: wpId,
      title: unit.title?.trim() || `Unit #${wpId}`,
      slug: unit.slug?.trim() || null,
      postStatus: unit.post_status?.trim() || null,
      listingStatus: unit.listing_status?.trim() || "bookable",
      description: unit.description?.trim() || null,
      accommodationType: unit.accommodation_type?.trim() || null,
      address: unit.address?.trim() || null,
      weekdayRateCents: dollarsToCents(unit.weekday_rate),
      weekendRateCents: dollarsToCents(unit.weekend_rate),
      cleaningFeeCents: dollarsToCents(unit.cleaning_fee),
      sleeps: unit.sleeps ?? null,
      bedrooms: unit.bedrooms ?? null,
      bathrooms: unit.bathrooms ?? null,
      maxGuests: unit.max_guests ?? null,
      minNights: unit.min_nights ?? null,
      checkinTime: unit.checkin_time?.trim() || null,
      checkoutTime: unit.checkout_time?.trim() || null,
      features: (unit.features ?? null) as Prisma.InputJsonValue,
      featuredImageUrl: unit.featured_image_url?.trim() || null,
      galleryUrls: (unit.gallery_urls ?? []) as Prisma.InputJsonValue,
      metadata: {
        ...(unit.last_minute_discount !== undefined
          ? { last_minute_discount: unit.last_minute_discount }
          : {}),
        ...(unit.early_bird_discount !== undefined
          ? { early_bird_discount: unit.early_bird_discount }
          : {}),
      } as Prisma.InputJsonValue,
      airbnbIcalUrl: unit.airbnb_ical_url?.trim() || null,
      bookingcomIcalUrl: unit.bookingcom_ical_url?.trim() || null,
      icalExportUrl: unit.ical_export_url?.trim() || null,
      airbnbId: unit.airbnb_id?.trim() || null,
      bookingcomId: unit.bookingcom_id?.trim() || null,
      housekeepingStatus: unit.housekeeping_status?.trim() || "unknown",
      housekeepingNotes: unit.housekeeping_notes?.trim() || null,
      lastCleaned: parseLastCleaned(unit.last_cleaned),
      manualBlockedDates: (manualBlockedDates ?? []) as Prisma.InputJsonValue,
      checkinUrl: unit.checkin_url?.trim() || null,
      cleaningFormUrl: unit.cleaning_form_url?.trim() || null,
    },
  });
  return "created";
}

async function fetchWpUnitsViaConnector(
  organisationId: string,
): Promise<
  | { ok: true; units: WpAccUnitPropRow[] }
  | { ok: false; reason: string; message: string }
> {
  const connector = await resolveOrgWordPressConnector(organisationId);
  if (!connector.baseUrl) {
    return { ok: false, reason: "no_connector", message: "WordPress connector not configured" };
  }

  // Gen 2 marketing apex — no /wp-json Acc APIs.
  try {
    const host = new URL(
      connector.baseUrl.includes("://") ? connector.baseUrl : `https://${connector.baseUrl}`,
    ).hostname.replace(/^www\./i, "");
    if (
      /currumbinvalleyhideaway\.com\.au$/i.test(host) ||
      /roerealty\.com\.au$/i.test(host) ||
      /^digitalgate\.com\.au$/i.test(host) ||
      /aetherra\.com\.au$/i.test(host)
    ) {
      return {
        ok: false,
        reason: "gen2_apex",
        message:
          "WordPress unit import is unavailable on the public Gen 2 site. Units already in Neon remain the source of truth.",
      };
    }
  } catch {
    /* continue to fetch attempt */
  }

  const apiKey = connector.apiKey?.trim();
  if (!apiKey) {
    return { ok: false, reason: "missing_key", message: "WordPress API key missing" };
  }

  const url = `${connector.baseUrl.replace(/\/$/, "")}/accommodation/properties`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-API-Key": apiKey,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    return {
      ok: false,
      reason: "fetch_failed",
      message: `WordPress units fetch failed (${res.status})`,
    };
  }
  const json = (await res.json()) as { properties?: WpAccUnitPropRow[] };
  return { ok: true, units: json.properties ?? [] };
}

export async function syncAccommodationUnitsFromWordPress(
  organisationId: string,
): Promise<SyncAccommodationUnitsOutcome> {
  const fetched = await fetchWpUnitsViaConnector(organisationId);
  if (!fetched.ok) {
    return { ok: false, reason: fetched.reason, message: fetched.message };
  }

  const result: SyncAccommodationUnitsResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const unit of fetched.units) {
    try {
      const outcome = await upsertAccommodationUnitFromWpRow(organisationId, unit);
      if (outcome === "created") result.created++;
      else if (outcome === "updated") result.updated++;
      else result.skipped++;
    } catch (err) {
      result.errors.push(
        `Unit #${unit.id}: ${err instanceof Error ? err.message : "sync failed"}`,
      );
    }
  }

  return { ok: true, result };
}

export async function updateUnitHousekeeping(
  organisationId: string,
  updates: Array<{
    property_id?: number;
    id?: number;
    platform_id?: string;
    status: string;
    notes?: string;
  }>,
): Promise<{ updated: string[]; count: number }> {
  const { prisma } = await import("@dg/database");
  const updated: string[] = [];

  for (const patch of updates) {
    const status = patch.status?.trim();
    if (!status) continue;

    let unit =
      typeof patch.platform_id === "string" && patch.platform_id
        ? await prisma.accommodationUnit.findFirst({
            where: { id: patch.platform_id, organisationId },
          })
        : null;

    const wpId =
      typeof patch.property_id === "number"
        ? patch.property_id
        : typeof patch.id === "number"
          ? patch.id
          : Number(patch.property_id ?? patch.id);
    if (!unit && Number.isFinite(wpId) && wpId > 0) {
      unit = await prisma.accommodationUnit.findUnique({
        where: {
          organisationId_externalWpId: { organisationId, externalWpId: wpId },
        },
      });
    }
    if (!unit) continue;

    const wasClean = unit.housekeepingStatus === "clean";
    const data: Prisma.AccommodationUnitUpdateInput = {
      housekeepingStatus: status,
    };
    if (typeof patch.notes === "string") {
      data.housekeepingNotes = patch.notes;
    }
    if (status === "clean" && !wasClean) {
      data.lastCleaned = new Date();
    }

    await prisma.accommodationUnit.update({ where: { id: unit.id }, data });
    updated.push(unit.id);
  }

  return { updated, count: updated.length };
}

/** How far ahead Gen 2 Acc calendars + OTA Neon pulls load (2 years). */
export const ACC_CALENDAR_HORIZON_DAYS = 730;

export async function buildAvailabilityFromNeon(
  organisationId: string,
  opts?: { from?: string; to?: string; propertyId?: number },
) {
  const units = await listAccommodationUnits(organisationId);
  const filtered =
    opts?.propertyId != null
      ? units.filter((u) => u.externalWpId === opts.propertyId)
      : units;

  const from = opts?.from ?? new Date().toISOString().slice(0, 10);
  /** Default horizon: 2 years when caller omits `to`. */
  const toDate = opts?.to
    ? new Date(opts.to)
    : new Date(Date.now() + ACC_CALENDAR_HORIZON_DAYS * 24 * 60 * 60 * 1000);
  const to = opts?.to ?? toDate.toISOString().slice(0, 10);

  const { prisma } = await import("@dg/database");
  const bookings = await prisma.stayBooking.findMany({
    where: {
      organisationId,
      status: { notIn: ["cancelled", "canceled"] },
      checkin: { lt: new Date(`${to}T23:59:59.999Z`) },
      checkout: { gt: new Date(`${from}T00:00:00.000Z`) },
    },
    select: {
      id: true,
      externalWpId: true,
      guestName: true,
      accommodationWpId: true,
      accommodationUnitId: true,
      checkin: true,
      checkout: true,
      status: true,
      ref: true,
      metadata: true,
    },
  });

  const unitRows = filtered.map((unit) => {
    const unitBookings = bookings
      .filter(
        (b) =>
          b.accommodationUnitId === unit.id ||
          (unit.externalWpId != null && b.accommodationWpId === unit.externalWpId),
      )
      .map((b) => {
        const meta = (b.metadata as Record<string, unknown> | null) ?? {};
        const source =
          typeof meta.source === "string" && meta.source.trim()
            ? meta.source.trim()
            : undefined;
        return {
          // Prefer real WP id; omit 0 so calendar span keys don't collapse OTA rows.
          id: b.externalWpId && b.externalWpId > 0 ? b.externalWpId : undefined,
          platform_id: b.id,
          guest_name: b.guestName,
          accommodation_id: unit.externalWpId ?? undefined,
          // Prefer metadata calendar strings (avoid UTC shift from Date.toISOString).
          checkin:
            (typeof meta.checkin === "string" && /^\d{4}-\d{2}-\d{2}$/.test(meta.checkin)
              ? meta.checkin
              : null) ||
            (b.checkin
              ? `${b.checkin.getUTCFullYear()}-${String(b.checkin.getUTCMonth() + 1).padStart(2, "0")}-${String(b.checkin.getUTCDate()).padStart(2, "0")}`
              : undefined),
          checkout:
            (typeof meta.checkout === "string" && /^\d{4}-\d{2}-\d{2}$/.test(meta.checkout)
              ? meta.checkout
              : null) ||
            (b.checkout
              ? `${b.checkout.getUTCFullYear()}-${String(b.checkout.getUTCMonth() + 1).padStart(2, "0")}-${String(b.checkout.getUTCDate()).padStart(2, "0")}`
              : undefined),
          status: b.status,
          source,
          ref: b.ref ?? undefined,
        };
      });

    const bookingDates = new Set<string>();
    for (const b of unitBookings) {
      if (!b.checkin || !b.checkout) continue;
      const start = new Date(`${b.checkin}T00:00:00Z`);
      const end = new Date(`${b.checkout}T00:00:00Z`);
      for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
        bookingDates.add(d.toISOString().slice(0, 10));
      }
    }
    const manual = unit.manualBlockedDates;
    const blocked = Array.from(new Set([...manual, ...bookingDates])).sort();

    return {
      id: unit.externalWpId ?? 0,
      platform_id: unit.id,
      title: unit.title,
      listing_status: unit.listingStatus,
      weekday_rate: unit.weekdayRate ?? undefined,
      weekend_rate: unit.weekendRate ?? undefined,
      cleaning_fee: unit.cleaningFee ?? undefined,
      manual_blocked_dates: manual,
      blocked_dates: blocked,
      bookings: unitBookings,
    };
  });

  return { from, to, units: unitRows, total: unitRows.length };
}

export type StayConflictCheck = {
  ok: boolean;
  conflictDates?: string[];
  message?: string;
  unitId?: string;
};

function eachNight(checkin: string, checkout: string): string[] {
  const nights: string[] = [];
  const start = new Date(`${checkin}T00:00:00Z`);
  const end = new Date(`${checkout}T00:00:00Z`);
  if (!(start < end)) return nights;
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    nights.push(d.toISOString().slice(0, 10));
  }
  return nights;
}

/** Gen 2 availability conflict check (WP-D-403 Gen 2-first path). */
export async function checkStayAvailability(
  organisationId: string,
  input: {
    accommodationWpId?: number;
    accommodationUnitId?: string;
    checkin: string;
    checkout: string;
    excludeStayBookingId?: string;
  },
): Promise<StayConflictCheck> {
  const { prisma } = await import("@dg/database");

  let unit =
    input.accommodationUnitId != null
      ? await prisma.accommodationUnit.findFirst({
          where: { id: input.accommodationUnitId, organisationId },
        })
      : null;

  if (!unit && input.accommodationWpId != null) {
    unit = await prisma.accommodationUnit.findUnique({
      where: {
        organisationId_externalWpId: {
          organisationId,
          externalWpId: input.accommodationWpId,
        },
      },
    });
  }

  if (!unit) {
    return {
      ok: false,
      message: "Unit not found in Neon — sync units first (WP-D-402)",
    };
  }

  if (unit.listingStatus !== "bookable") {
    return { ok: false, message: `Unit listing status is ${unit.listingStatus}`, unitId: unit.id };
  }

  const nights = eachNight(input.checkin, input.checkout);
  if (!nights.length) {
    return { ok: false, message: "checkout must be after checkin", unitId: unit.id };
  }

  const manual = new Set(asDateList(unit.manualBlockedDates));
  const conflictDates: string[] = [];
  for (const night of nights) {
    if (manual.has(night)) conflictDates.push(night);
  }

  const bookings = await prisma.stayBooking.findMany({
    where: {
      organisationId,
      id: input.excludeStayBookingId ? { not: input.excludeStayBookingId } : undefined,
      status: { notIn: ["cancelled", "canceled"] },
      OR: [
        { accommodationUnitId: unit.id },
        unit.externalWpId != null ? { accommodationWpId: unit.externalWpId } : undefined,
      ].filter(Boolean) as Prisma.StayBookingWhereInput[],
      checkin: { lt: new Date(`${input.checkout}T00:00:00.000Z`) },
      checkout: { gt: new Date(`${input.checkin}T00:00:00.000Z`) },
    },
    select: { checkin: true, checkout: true },
  });

  for (const b of bookings) {
    if (!b.checkin || !b.checkout) continue;
    const booked = eachNight(
      b.checkin.toISOString().slice(0, 10),
      b.checkout.toISOString().slice(0, 10),
    );
    for (const night of nights) {
      if (booked.includes(night) && !conflictDates.includes(night)) {
        conflictDates.push(night);
      }
    }
  }

  if (conflictDates.length) {
    return {
      ok: false,
      conflictDates: conflictDates.sort(),
      message: "dates_unavailable",
      unitId: unit.id,
    };
  }

  return { ok: true, unitId: unit.id };
}

export function housekeepingBoardFromUnits(
  units: AccommodationUnitListItem[],
  today = new Date().toISOString().slice(0, 10),
) {
  const statuses: Record<string, string> = {
    clean: "Clean & ready",
    dirty: "Dirty",
    in_progress: "In progress",
    inspection: "Inspection",
    unknown: "Unknown",
  };
  const summary: Record<string, number> = {
    clean: 0,
    dirty: 0,
    in_progress: 0,
    inspection: 0,
    unknown: 0,
  };
  const items = units.map((u) => {
    const status = u.housekeepingStatus in summary ? u.housekeepingStatus : "unknown";
    summary[status] = (summary[status] ?? 0) + 1;
    return {
      id: u.externalWpId ?? 0,
      platform_id: u.id,
      title: u.title,
      status,
      notes: u.housekeepingNotes ?? undefined,
      last_cleaned: u.lastCleaned,
      checkout_today: false,
      cleaning_form_url: u.cleaningFormUrl ?? undefined,
      checkin_url: u.checkinUrl ?? undefined,
    };
  });
  return {
    items,
    summary,
    statuses,
    checkouts_today: 0,
    today,
    total: items.length,
  };
}
