import type { Prisma } from "@dg/database";

export const RE_BOOKING_SOURCE = "re_booking";

export interface WpReBookingRow {
  id: number;
  contact?: string;
  email?: string;
  phone?: string;
  service?: string;
  type?: string;
  date?: string;
  time?: string;
  status?: string;
  created_at?: string;
}

export interface SyncReBookingsInput {
  organisationId: string;
  actorId?: string;
  bookings: WpReBookingRow[];
}

export interface SyncReBookingsResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

function parseScheduledAt(booking: WpReBookingRow): Date | undefined {
  if (!booking.date) return undefined;
  const time = booking.time ? String(booking.time).slice(0, 5) : "09:00";
  const parsed = new Date(`${booking.date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function serializeBooking(lead: {
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
    contactName: (metadata.contact_name as string | undefined) ?? lead.title,
    email: metadata.email as string | undefined,
    phone: metadata.phone as string | undefined,
    service: metadata.service as string | undefined,
    bookingType: metadata.booking_type as string | undefined,
    scheduledAt: metadata.scheduled_at as string | undefined,
    status: lead.status,
    wpBookingId: externalRefs.wp_booking_id as number | undefined,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export async function listReBookings(organisationId: string, limit = 50) {
  const { prisma } = await import("@dg/database");
  const items = await prisma.lead.findMany({
    where: { organisationId, source: RE_BOOKING_SOURCE },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
  });
  return items.map(serializeBooking);
}

export async function syncReBookingsFromWordPress(
  input: SyncReBookingsInput,
): Promise<SyncReBookingsResult> {
  const { prisma } = await import("@dg/database");
  const result: SyncReBookingsResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (const booking of input.bookings) {
    try {
      const wpId = booking.id;
      const existing = await prisma.lead.findFirst({
        where: {
          organisationId: input.organisationId,
          source: RE_BOOKING_SOURCE,
          externalRefs: { path: ["wp_booking_id"], equals: wpId },
        },
      });

      const scheduledAt = parseScheduledAt(booking);
      const metadata = {
        contact_name: booking.contact,
        email: booking.email,
        phone: booking.phone,
        service: booking.service ?? booking.type,
        booking_type: booking.type,
        scheduled_at: scheduledAt?.toISOString(),
      };
      const title = booking.contact?.trim() || `Booking #${wpId}`;
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
            source: RE_BOOKING_SOURCE,
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
        `Booking #${booking.id}: ${err instanceof Error ? err.message : "sync failed"}`,
      );
    }
  }

  return result;
}
