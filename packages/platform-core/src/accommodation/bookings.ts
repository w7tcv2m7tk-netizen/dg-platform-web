import type { Prisma } from "@dg/database";

import { resolveOrgWordPressConnector } from "../connectors/wordpress/org-connector";

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
  status?: string;
  source?: string;
  /** Dollars (WordPress) — converted to totalCents on upsert */
  total?: number;
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
  ref?: string | null;
  guestName: string;
  email?: string | null;
  phone?: string | null;
  accommodationName?: string | null;
  accommodationWpId?: number | null;
  checkin?: string | null;
  checkout?: string | null;
  status: string;
  totalCents?: number | null;
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
    ref: row.ref,
    guestName: row.guestName,
    email: row.email,
    phone: row.phone,
    accommodationName: row.accommodationName,
    accommodationWpId: row.accommodationWpId,
    checkin: formatStayDate(row.checkin, metadata.checkin as string | undefined),
    checkout: formatStayDate(row.checkout, metadata.checkout as string | undefined),
    status: row.status,
    totalCents: row.totalCents,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
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
    status: item.status,
    total: item.totalCents != null ? item.totalCents / 100 : undefined,
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
    source: "wordpress",
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

  const { prisma } = await import("@dg/database");
  const result: SyncAccommodationBookingsResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const booking of fetched.bookings) {
    try {
      const wpId = booking.id;
      if (!Number.isFinite(wpId)) {
        result.skipped++;
        continue;
      }

      const fields = mapBookingFields(booking);
      const existing = await prisma.stayBooking.findUnique({
        where: {
          organisationId_externalWpId: {
            organisationId,
            externalWpId: wpId,
          },
        },
      });

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
          (existing.checkin?.getTime() ?? null) === (fields.checkin?.getTime() ?? null) &&
          (existing.checkout?.getTime() ?? null) === (fields.checkout?.getTime() ?? null);

        if (unchanged) {
          result.skipped++;
          continue;
        }

        await prisma.stayBooking.update({
          where: { id: existing.id },
          data: {
            ...fields,
            metadata: fields.metadata as Prisma.InputJsonValue,
          },
        });
        result.updated++;
      } else {
        await prisma.stayBooking.create({
          data: {
            organisationId,
            externalWpId: wpId,
            ...fields,
            metadata: fields.metadata as Prisma.InputJsonValue,
          },
        });
        result.created++;
      }
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

  // Upsert provided rows (used by older wordpress-sync call sites)
  const { prisma } = await import("@dg/database");
  const result: SyncAccommodationBookingsResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const booking of input.bookings) {
    try {
      const wpId = booking.id;
      if (!Number.isFinite(wpId)) {
        result.skipped++;
        continue;
      }
      const fields = mapBookingFields(booking);
      const existing = await prisma.stayBooking.findUnique({
        where: {
          organisationId_externalWpId: {
            organisationId: input.organisationId,
            externalWpId: wpId,
          },
        },
      });

      if (existing) {
        await prisma.stayBooking.update({
          where: { id: existing.id },
          data: {
            ...fields,
            metadata: fields.metadata as Prisma.InputJsonValue,
          },
        });
        result.updated++;
      } else {
        await prisma.stayBooking.create({
          data: {
            organisationId: input.organisationId,
            externalWpId: wpId,
            ...fields,
            metadata: fields.metadata as Prisma.InputJsonValue,
          },
        });
        result.created++;
      }
    } catch (err) {
      result.errors.push(
        `Booking #${booking.id}: ${err instanceof Error ? err.message : "sync failed"}`,
      );
    }
  }

  return result;
}
