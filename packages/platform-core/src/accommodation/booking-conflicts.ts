/**
 * Booking overlap detection and per-unit serialisation (H-9).
 *
 * Three paths create StayBooking rows — direct Gen 2, WordPress ingestion and
 * OTA iCal import. Only the direct path checked availability, and it did so as
 * a read followed by a separate insert, so two concurrent requests could both
 * pass the check. The import paths performed no overlap check at all and would
 * silently create a second overlapping row.
 *
 * This module centralises two things:
 *
 *   1. `withUnitBookingLock` — a PostgreSQL transaction-scoped advisory lock
 *      keyed on (organisation, unit). Concurrent bookings for the same unit
 *      serialise; different units and different organisations do not contend.
 *      The same pg_advisory_xact_lock pattern is already used by the WordPress
 *      property sync.
 *
 *   2. `findOverlappingBookings` — one definition of "overlap", shared by every
 *      write path so they cannot drift apart.
 *
 * Date semantics match the existing `checkStayAvailability`: intervals are
 * half-open, so a booking checking out on the 10th does not conflict with one
 * checking in on the 10th. Same-day turnover is legitimate and stays allowed.
 * Cancelled bookings never block.
 */

import type { Prisma, PrismaClient } from "@dg/database";

/** Statuses that do not occupy the unit. */
export const NON_BLOCKING_STAY_STATUSES = ["cancelled", "canceled"] as const;

export type BookingOverlapQuery = {
  organisationId: string;
  /** Gen 2 unit id. */
  accommodationUnitId?: string | null;
  /** Legacy WordPress unit id, matched alongside the Gen 2 id. */
  accommodationWpId?: number | null;
  checkin: Date;
  checkout: Date;
  /** Exclude the row being updated. */
  excludeStayBookingId?: string | null;
};

export type OverlappingBooking = {
  id: string;
  guestName: string | null;
  checkin: Date | null;
  checkout: Date | null;
  status: string;
};

type PrismaLike = PrismaClient | Prisma.TransactionClient;

/**
 * Advisory lock key for a unit. Distinct organisations and units never collide
 * because the organisation id is part of the string.
 */
export function unitBookingLockKey(
  organisationId: string,
  unitId: string,
): string {
  return `stay-booking:${organisationId}:${unitId}`;
}

/**
 * Run `fn` holding a transaction-scoped advisory lock for this unit.
 *
 * The lock is released when the transaction ends, including on error, so a
 * failed booking cannot strand it. Do not perform network calls inside `fn` —
 * it holds both a lock and a transaction.
 */
export async function withUnitBookingLock<T>(
  organisationId: string,
  unitId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const { prisma } = await import("@dg/database");
  const key = unitBookingLockKey(organisationId, unitId);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
    return fn(tx);
  });
}

/**
 * Bookings that occupy any night in [checkin, checkout).
 *
 * Half-open comparison: an existing booking conflicts when it starts before the
 * new checkout and ends after the new checkin. Equal boundaries are adjacent,
 * not overlapping.
 */
export async function findOverlappingBookings(
  db: PrismaLike,
  query: BookingOverlapQuery,
): Promise<OverlappingBooking[]> {
  const unitMatch: Prisma.StayBookingWhereInput[] = [];
  if (query.accommodationUnitId) {
    unitMatch.push({ accommodationUnitId: query.accommodationUnitId });
  }
  if (query.accommodationWpId != null) {
    unitMatch.push({ accommodationWpId: query.accommodationWpId });
  }
  if (!unitMatch.length) return [];

  const rows = await db.stayBooking.findMany({
    where: {
      organisationId: query.organisationId,
      id: query.excludeStayBookingId
        ? { not: query.excludeStayBookingId }
        : undefined,
      status: { notIn: [...NON_BLOCKING_STAY_STATUSES] },
      OR: unitMatch,
      checkin: { lt: query.checkout },
      checkout: { gt: query.checkin },
    },
    select: {
      id: true,
      guestName: true,
      checkin: true,
      checkout: true,
      status: true,
    },
    take: 10,
  });

  return rows;
}

/**
 * Flag an import clash on the bookings already holding the dates.
 *
 * Uses the existing `StayBooking.metadata` JSON rather than adding a new table
 * or status: the row stays valid and bookable, but carries an
 * `import_conflicts` entry that operations can surface and clear. The incoming
 * row is not created, so the calendar never silently double-books.
 */
export async function recordImportConflict(
  db: PrismaLike,
  input: {
    conflicts: OverlappingBooking[];
    detail: Record<string, unknown>;
  },
): Promise<void> {
  for (const conflict of input.conflicts) {
    const row = await db.stayBooking.findUnique({
      where: { id: conflict.id },
      select: { metadata: true },
    });
    const meta = (row?.metadata as Record<string, unknown> | null) ?? {};
    const existing = Array.isArray(meta.import_conflicts)
      ? (meta.import_conflicts as unknown[])
      : [];

    await db.stayBooking.update({
      where: { id: conflict.id },
      data: {
        metadata: {
          ...meta,
          // Bounded so a repeatedly failing feed cannot grow the row without limit.
          import_conflicts: [...existing, input.detail].slice(-10),
        } as Prisma.InputJsonValue,
      },
    });
  }
}

/** Human-readable summary for conflict metadata and sync error surfaces. */
export function describeBookingConflict(
  conflicts: OverlappingBooking[],
): string {
  return conflicts
    .map((c) => {
      const from = c.checkin?.toISOString().slice(0, 10) ?? "?";
      const to = c.checkout?.toISOString().slice(0, 10) ?? "?";
      return `${c.id} (${c.status} ${from}→${to})`;
    })
    .join(", ");
}
