import type { Prisma } from "@dg/database";

export const ACC_BOOKING_SOURCE = "acc_booking";

export interface WpAccBookingSyncRow {
  id: number;
  ref?: string;
  guest_name?: string;
  email?: string;
  accommodation?: string;
  accommodation_id?: number;
  checkin?: string;
  checkout?: string;
  status?: string;
  total?: number;
}

export interface SyncAccBookingsResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

function serializeAccBooking(lead: {
  id: string;
  title: string | null;
  status: string;
  metadata: unknown;
  externalRefs: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  const metadata = (lead.metadata as Record<string, unknown> | null) ?? {};
  const externalRefs = (lead.externalRefs as Record<string, unknown> | null) ?? {};
  return {
    id: lead.id,
    guestName: (metadata.guest_name as string | undefined) ?? lead.title,
    email: metadata.email as string | undefined,
    accommodation: metadata.accommodation as string | undefined,
    accommodationId: metadata.accommodation_id as number | undefined,
    checkin: metadata.checkin as string | undefined,
    checkout: metadata.checkout as string | undefined,
    ref: metadata.ref as string | undefined,
    total: metadata.total as number | undefined,
    status: lead.status,
    wpBookingId: externalRefs.wp_booking_id as number | undefined,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export async function listAccBookings(organisationId: string, limit = 50) {
  if (!process.env.DATABASE_URL) return [];
  const { prisma } = await import("@dg/database");
  const items = await prisma.lead.findMany({
    where: { organisationId, source: ACC_BOOKING_SOURCE },
    orderBy: { updatedAt: "desc" },
    take: Math.min(limit, 100),
  });
  return items.map(serializeAccBooking);
}

export async function syncAccBookingsFromWordPress(input: {
  organisationId: string;
  bookings: WpAccBookingSyncRow[];
}): Promise<SyncAccBookingsResult> {
  const { prisma } = await import("@dg/database");
  const result: SyncAccBookingsResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (const booking of input.bookings) {
    try {
      const wpId = booking.id;
      const existing = await prisma.lead.findFirst({
        where: {
          organisationId: input.organisationId,
          source: ACC_BOOKING_SOURCE,
          externalRefs: { path: ["wp_booking_id"], equals: wpId },
        },
      });

      const metadata = {
        guest_name: booking.guest_name,
        email: booking.email,
        accommodation: booking.accommodation,
        accommodation_id: booking.accommodation_id,
        checkin: booking.checkin,
        checkout: booking.checkout,
        ref: booking.ref,
        total: booking.total,
      };
      const title =
        booking.guest_name?.trim() ||
        booking.ref?.trim() ||
        `Stay #${wpId}`;
      const status = booking.status ?? "pending";

      if (existing) {
        const prev = JSON.stringify(existing.metadata);
        const next = JSON.stringify(metadata);
        if (prev === next && existing.status === status && existing.title === title) {
          result.skipped++;
          continue;
        }
        await prisma.lead.update({
          where: { id: existing.id },
          data: {
            title,
            status,
            metadata: metadata as Prisma.InputJsonValue,
          },
        });
        result.updated++;
      } else {
        await prisma.lead.create({
          data: {
            organisationId: input.organisationId,
            source: ACC_BOOKING_SOURCE,
            title,
            status,
            metadata: metadata as Prisma.InputJsonValue,
            externalRefs: { wp_booking_id: wpId } as Prisma.InputJsonValue,
          },
        });
        result.created++;
      }
    } catch (err) {
      result.errors.push(
        `Stay #${booking.id}: ${err instanceof Error ? err.message : "sync failed"}`,
      );
    }
  }

  return result;
}
