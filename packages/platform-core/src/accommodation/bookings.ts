import type { Prisma } from "@dg/database";

import { resolveOrgWordPressConnector } from "../connectors/wordpress/org-connector";
import { ensureContactForStayGuest } from "./guests";

export interface WpAccBookingRow {
  id: number;
  /** Neon StayBooking id when row comes from Platform sync */
  platform_id?: string;
  ref?: string;
  guest_name?: string;
  email?: string;
  phone?: string;
  accommodation?: string;
  accommodation_id?: number;
  checkin?: string;
  checkout?: string;
  nights?: number | null;
  guests?: number | null;
  status?: string;
  source?: string;
  /** Dollars (WordPress) — converted to totalCents on upsert */
  total?: number;
  paid?: string | null;
  payment_method?: string | null;
  message?: string;
}

export interface SyncAccommodationBookingsResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export type SyncAccommodationBookingsOutcome =
  | { ok: true; result: SyncAccommodationBookingsResult }
  | {
      ok: false;
      reason: "missing_key" | "fetch_failed" | "network_error";
      message: string;
    };

export interface StayBookingListItem {
  id: string;
  externalWpId: number;
  contactId?: string | null;
  ref?: string | null;
  guestName: string;
  email?: string | null;
  phone?: string | null;
  accommodationName?: string | null;
  accommodationWpId?: number | null;
  checkin?: string | null;
  checkout?: string | null;
  nights?: number | null;
  guests?: number | null;
  status: string;
  source?: string | null;
  totalCents?: number | null;
  paid?: string | null;
  paymentMethod?: string | null;
  message?: string | null;
  createdAt: string;
  updatedAt: string;
}

function parseStayDate(value?: string | null): Date | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const parsed = new Date(raw.includes("T") ? raw : `${raw}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatStayDate(value: Date | null | undefined, fallback?: string | null): string | null {
  if (fallback?.trim()) return fallback.trim();
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function toTotalCents(total?: number): number | null {
  if (total == null || !Number.isFinite(total)) return null;
  return Math.round(total * 100);
}

function serializeStayBooking(row: {
  id: string;
  externalWpId: number;
  contactId?: string | null;
  ref: string | null;
  guestName: string;
  email: string | null;
  phone: string | null;
  accommodationName: string | null;
  accommodationWpId: number | null;
  checkin: Date | null;
  checkout: Date | null;
  status: string;
  totalCents: number | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}): StayBookingListItem {
  const metadata = (row.metadata as Record<string, unknown> | null) ?? {};
  return {
    id: row.id,
    externalWpId: row.externalWpId,
    contactId: row.contactId ?? null,
    ref: row.ref,
    guestName: row.guestName,
    email: row.email,
    phone: row.phone,
    accommodationName: row.accommodationName,
    accommodationWpId: row.accommodationWpId,
    checkin: formatStayDate(row.checkin, metadata.checkin as string | undefined),
    checkout: formatStayDate(row.checkout, metadata.checkout as string | undefined),
    nights: typeof metadata.nights === "number" ? metadata.nights : null,
    guests: typeof metadata.guests === "number" ? metadata.guests : null,
    status: row.status,
    source: typeof metadata.source === "string" ? metadata.source : null,
    totalCents: row.totalCents,
    paid: typeof metadata.paid === "string" ? metadata.paid : null,
    paymentMethod:
      typeof metadata.payment_method === "string" ? metadata.payment_method : null,
    message: typeof metadata.message === "string" ? metadata.message : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function resolveGuestContactId(
  organisationId: string,
  fields: {
    guestName: string;
    email: string | null;
    phone: string | null;
    accommodationName: string | null;
  },
  actorId?: string,
  existingContactId?: string | null,
): Promise<string | null> {
  if (existingContactId) return existingContactId;
  return ensureContactForStayGuest({
    organisationId,
    actorId,
    guestName: fields.guestName,
    email: fields.email,
    phone: fields.phone,
    favouriteUnit: fields.accommodationName,
  });
}

/** Map Postgres stay bookings into the WpAccBookingRow shape used by UI tables. */
export function stayBookingToWpRow(item: StayBookingListItem): WpAccBookingRow {
  return {
    id: item.externalWpId,
    platform_id: item.id,
    ref: item.ref ?? undefined,
    guest_name: item.guestName,
    email: item.email ?? undefined,
    phone: item.phone ?? undefined,
    accommodation: item.accommodationName ?? undefined,
    accommodation_id: item.accommodationWpId ?? undefined,
    checkin: item.checkin ?? undefined,
    checkout: item.checkout ?? undefined,
    nights: item.nights ?? undefined,
    guests: item.guests ?? undefined,
    status: item.status,
    source: item.source ?? undefined,
    total: item.totalCents != null ? item.totalCents / 100 : undefined,
    paid: item.paid ?? undefined,
    payment_method: item.paymentMethod ?? undefined,
    message: item.message ?? undefined,
  };
}

/** Patch a synced StayBooking after a WordPress booking edit. */
export async function updateStayBooking(
  organisationId: string,
  input: {
    platformId?: string;
    externalWpId?: number;
    guestName?: string;
    email?: string | null;
    phone?: string | null;
    accommodationName?: string | null;
    accommodationWpId?: number | null;
    checkin?: string | null;
    checkout?: string | null;
    status?: string;
    total?: number | null;
    ref?: string | null;
    paid?: string | null;
    paymentMethod?: string | null;
    source?: string | null;
    guests?: number | null;
    nights?: number | null;
    message?: string | null;
  },
): Promise<StayBookingListItem | null> {
  if (!process.env.DATABASE_URL) return null;
  const { prisma } = await import("@dg/database");

  const existing = input.platformId
    ? await prisma.stayBooking.findFirst({
        where: { id: input.platformId, organisationId },
      })
    : input.externalWpId != null
      ? await prisma.stayBooking.findFirst({
          where: { organisationId, externalWpId: input.externalWpId },
        })
      : null;

  if (!existing) return null;

  const data: Prisma.StayBookingUpdateInput = {};
  if (input.guestName !== undefined) data.guestName = input.guestName.trim() || existing.guestName;
  if (input.email !== undefined) data.email = input.email?.trim() || null;
  if (input.phone !== undefined) data.phone = input.phone?.trim() || null;
  if (input.accommodationName !== undefined) {
    data.accommodationName = input.accommodationName?.trim() || null;
  }
  if (input.accommodationWpId !== undefined) {
    data.accommodationWpId = input.accommodationWpId;
  }
  if (input.checkin !== undefined) data.checkin = parseStayDate(input.checkin);
  if (input.checkout !== undefined) data.checkout = parseStayDate(input.checkout);
  if (input.status !== undefined) data.status = input.status;
  if (input.total !== undefined) data.totalCents = toTotalCents(input.total ?? undefined);
  if (input.ref !== undefined) data.ref = input.ref?.trim() || null;

  const metaTouched =
    input.paid !== undefined ||
    input.paymentMethod !== undefined ||
    input.source !== undefined ||
    input.guests !== undefined ||
    input.nights !== undefined ||
    input.message !== undefined ||
    input.checkin !== undefined ||
    input.checkout !== undefined;

  if (metaTouched) {
    const prev = (existing.metadata as Record<string, unknown> | null) ?? {};
    const next: Record<string, unknown> = { ...prev };
    if (input.paid !== undefined) next.paid = input.paid;
    if (input.paymentMethod !== undefined) next.payment_method = input.paymentMethod;
    if (input.source !== undefined) next.source = input.source;
    if (input.guests !== undefined) next.guests = input.guests;
    if (input.nights !== undefined) next.nights = input.nights;
    if (input.message !== undefined) next.message = input.message;
    if (input.checkin !== undefined) next.checkin = input.checkin;
    if (input.checkout !== undefined) next.checkout = input.checkout;
    data.metadata = next as Prisma.InputJsonValue;
  }

  const updated = await prisma.stayBooking.update({
    where: { id: existing.id },
    data,
  });
  return serializeStayBooking(updated);
}

export async function listStayBookings(organisationId: string, limit = 50) {
  if (!process.env.DATABASE_URL) return [];
  const { prisma } = await import("@dg/database");
  const items = await prisma.stayBooking.findMany({
    where: { organisationId },
    orderBy: [{ checkin: "desc" }, { createdAt: "desc" }],
    take: Math.min(limit, 200),
  });
  return items.map(serializeStayBooking);
}

async function fetchWpAccommodationBookings(
  organisationId: string,
  limit: number,
): Promise<
  | { ok: true; bookings: WpAccBookingRow[] }
  | { ok: false; reason: "missing_key" | "fetch_failed" | "network_error"; message: string }
> {
  const connector = await resolveOrgWordPressConnector(organisationId);
  if (!connector.apiKey?.trim()) {
    return {
      ok: false,
      reason: "missing_key",
      message: "WordPress API key not configured for this organisation",
    };
  }

  try {
    const res = await fetch(
      `${connector.baseUrl}/accommodation/bookings?limit=${Math.min(limit, 200)}`,
      {
        headers: {
          Accept: "application/json",
          "X-API-Key": connector.apiKey,
        },
        cache: "no-store",
      },
    );

    const data = (await res.json().catch(() => null)) as {
      bookings?: WpAccBookingRow[];
      message?: string;
    } | null;

    if (!res.ok) {
      return {
        ok: false,
        reason: "fetch_failed",
        message:
          data?.message ??
          (res.status === 404
            ? "WordPress accommodation bookings endpoint not found"
            : `WordPress returned HTTP ${res.status}`),
      };
    }

    return { ok: true, bookings: data?.bookings ?? [] };
  } catch (err) {
    return {
      ok: false,
      reason: "network_error",
      message: err instanceof Error ? err.message : "Network error fetching bookings",
    };
  }
}

function mapBookingFields(booking: WpAccBookingRow) {
  const guestName = booking.guest_name?.trim() || booking.ref?.trim() || `Booking #${booking.id}`;
  const status = booking.status?.trim() || "pending";
  const checkin = parseStayDate(booking.checkin);
  const checkout = parseStayDate(booking.checkout);
  const totalCents = toTotalCents(booking.total);
  const metadata = {
    checkin: booking.checkin ?? null,
    checkout: booking.checkout ?? null,
    total: booking.total ?? null,
    nights: booking.nights ?? null,
    guests: booking.guests ?? null,
    paid: booking.paid ?? null,
    payment_method: booking.payment_method ?? null,
    message: booking.message ?? null,
    source: booking.source ?? "wordpress",
  };

  return {
    ref: booking.ref?.trim() || null,
    guestName,
    email: booking.email?.trim() || null,
    phone: booking.phone?.trim() || null,
    accommodationName: booking.accommodation?.trim() || null,
    accommodationWpId: booking.accommodation_id ?? null,
    checkin,
    checkout,
    status,
    totalCents,
    metadata,
  };
}

function metadataFingerprint(meta: unknown): string {
  const m = (meta as Record<string, unknown> | null) ?? {};
  return JSON.stringify({
    paid: m.paid ?? null,
    payment_method: m.payment_method ?? null,
    nights: m.nights ?? null,
    guests: m.guests ?? null,
    message: m.message ?? null,
    source: m.source ?? null,
    checkin: m.checkin ?? null,
    checkout: m.checkout ?? null,
  });
}

/**
 * Upsert a single StayBooking from a WordPress (or dual-write) booking row.
 * Idempotent on organisationId + externalWpId.
 */
export async function upsertStayBookingFromWpRow(
  organisationId: string,
  booking: WpAccBookingRow,
  options?: { actorId?: string },
): Promise<"created" | "updated" | "skipped"> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not configured");
  }
  const wpId = booking.id;
  if (!Number.isFinite(wpId)) {
    return "skipped";
  }

  const { prisma } = await import("@dg/database");
  const fields = mapBookingFields(booking);
  const existing = await prisma.stayBooking.findUnique({
    where: {
      organisationId_externalWpId: {
        organisationId,
        externalWpId: wpId,
      },
    },
  });

  const contactId = await resolveGuestContactId(
    organisationId,
    fields,
    options?.actorId,
    existing?.contactId,
  );

  if (existing) {
    const unchanged =
      existing.ref === fields.ref &&
      existing.guestName === fields.guestName &&
      existing.email === fields.email &&
      existing.phone === fields.phone &&
      existing.accommodationName === fields.accommodationName &&
      existing.accommodationWpId === fields.accommodationWpId &&
      existing.status === fields.status &&
      existing.totalCents === fields.totalCents &&
      existing.contactId === contactId &&
      (existing.checkin?.getTime() ?? null) === (fields.checkin?.getTime() ?? null) &&
      (existing.checkout?.getTime() ?? null) === (fields.checkout?.getTime() ?? null) &&
      metadataFingerprint(existing.metadata) === metadataFingerprint(fields.metadata);

    if (unchanged) return "skipped";

    await prisma.stayBooking.update({
      where: { id: existing.id },
      data: {
        ...fields,
        contactId,
        metadata: fields.metadata as Prisma.InputJsonValue,
      },
    });
    return "updated";
  }

  await prisma.stayBooking.create({
    data: {
      organisationId,
      externalWpId: wpId,
      ...fields,
      contactId,
      metadata: fields.metadata as Prisma.InputJsonValue,
    },
  });
  return "created";
}

/**
 * Resolve which Neon organisation owns CVH / accommodation StayBooking rows.
 * Used by WP → Gen 2 dual-write webhooks.
 */
export async function resolveOrganisationIdForStaySync(input?: {
  organisationId?: string;
  siteUrl?: string;
}): Promise<string | null> {
  const explicit = input?.organisationId?.trim();
  if (explicit) return explicit;

  const envId =
    process.env.DG_ACC_ORGANISATION_ID?.trim() ||
    process.env.DG_CVH_ORGANISATION_ID?.trim();
  if (envId) return envId;

  if (!process.env.DATABASE_URL) return null;

  const { prisma } = await import("@dg/database");
  const { resolveOrgBrandPresetKey } = await import("../org/brand-presets");

  let targetHost = "currumbinvalleyhideaway.com.au";
  if (input?.siteUrl?.trim()) {
    try {
      targetHost = new URL(input.siteUrl.trim()).hostname.toLowerCase();
    } catch {
      /* keep default */
    }
  }

  const orgs = await prisma.organisation.findMany({
    select: { id: true, name: true, slug: true, industry: true, settings: true },
    take: 200,
  });

  for (const org of orgs) {
    if (resolveOrgBrandPresetKey(org) === "cvh") return org.id;
  }

  for (const org of orgs) {
    const base = (
      org.settings as { connectors?: { wordpress?: { baseUrl?: string } } } | null
    )?.connectors?.wordpress?.baseUrl;
    if (!base) continue;
    try {
      if (new URL(base).hostname.toLowerCase() === targetHost) return org.id;
    } catch {
      if (base.toLowerCase().includes(targetHost)) return org.id;
    }
  }

  return null;
}

/**
 * Resolve the org WordPress connector, fetch `/accommodation/bookings`,
 * and upsert StayBooking rows by organisationId + externalWpId.
 */
export async function syncAccommodationBookingsFromWordPress(
  organisationId: string,
  options?: { limit?: number; actorId?: string },
): Promise<SyncAccommodationBookingsOutcome> {
  const fetched = await fetchWpAccommodationBookings(organisationId, options?.limit ?? 100);
  if (!fetched.ok) {
    return { ok: false, reason: fetched.reason, message: fetched.message };
  }

  const result: SyncAccommodationBookingsResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const booking of fetched.bookings) {
    try {
      const outcome = await upsertStayBookingFromWpRow(organisationId, booking, {
        actorId: options?.actorId,
      });
      if (outcome === "created") result.created++;
      else if (outcome === "updated") result.updated++;
      else result.skipped++;
    } catch (err) {
      result.errors.push(
        `Booking #${booking.id}: ${err instanceof Error ? err.message : "sync failed"}`,
      );
    }
  }

  return { ok: true, result };
}

/** Alias for listStayBookings */
export const listAccBookings = listStayBookings;

/**
 * Compatibility wrapper — prefer syncAccommodationBookingsFromWordPress(organisationId).
 * Accepts either organisationId string or { organisationId, bookings? }.
 * When bookings are provided, upserts those rows without re-fetching.
 */
export async function syncAccBookingsFromWordPress(
  input:
    | string
    | {
        organisationId: string;
        bookings?: WpAccBookingRow[];
        actorId?: string;
        limit?: number;
      },
): Promise<SyncAccommodationBookingsResult | SyncAccommodationBookingsOutcome> {
  if (typeof input === "string") {
    return syncAccommodationBookingsFromWordPress(input);
  }

  if (!input.bookings) {
    return syncAccommodationBookingsFromWordPress(input.organisationId, {
      actorId: input.actorId,
      limit: input.limit,
    });
  }

  const result: SyncAccommodationBookingsResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const booking of input.bookings) {
    try {
      const outcome = await upsertStayBookingFromWpRow(input.organisationId, booking, {
        actorId: input.actorId,
      });
      if (outcome === "created") result.created++;
      else if (outcome === "updated") result.updated++;
      else result.skipped++;
    } catch (err) {
      result.errors.push(
        `Booking #${booking.id}: ${err instanceof Error ? err.message : "sync failed"}`,
      );
    }
  }

  return result;
}
