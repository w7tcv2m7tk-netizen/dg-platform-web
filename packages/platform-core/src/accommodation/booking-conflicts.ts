/**
 * Shared H-9 booking overlap detection and per-unit serialisation.
 *
 * All accommodation booking writes must use the same overlap definition and
 * serialise on the organisation/unit pair so concurrent writers cannot both
 * pass an availability check and then insert overlapping stays.
 */

import type { Prisma, PrismaClient } from "@dg/database";

export const NON_BLOCKING_STAY_STATUSES = ["cancelled", "canceled"] as const;

export type BookingOverlapQuery = {
  organisationId: string;
  accommodationUnitId?: string | null;
  accommodationWpId?: number | null;
  checkin: Date;
  checkout: Date;
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

export function unitBookingLockKey(
  organisationId: string,
  unitId: string,
): string {
  return `stay-booking:${organisationId}:${unitId}`;
}

/**
 * Hold a transaction-scoped advisory lock while checking and writing a booking.
 * Keep network calls outside the callback because the lock remains held until
 * the transaction finishes.
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
 * Find active bookings overlapping [checkin, checkout).
 * Equal boundaries are adjacent, not overlapping, so same-day turnover stays
 * legal. Cancelled bookings never block.
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

/**
 * Record an import clash on the existing booking rather than creating the
 * incoming overlapping row. Metadata is bounded so a repeatedly failing feed
 * cannot grow without limit.
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
          import_conflicts: [...existing, input.detail].slice(-10),
        } as Prisma.InputJsonValue,
      },
    });
  }
}
