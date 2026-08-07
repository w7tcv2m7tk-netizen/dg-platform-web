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
        const created = await prisma.lead.findFirst({
          where: {
            organisationId: input.organisationId,
            source: RE_BOOKING_SOURCE,
            externalRefs: { path: ["wp_booking_id"], equals: wpId },
          },
        });
        if (created) {
          const { linkBookingToVendorLead } = await import("./reports");
          await linkBookingToVendorLead(input.organisationId, created.id);
        }
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

export async function createReBooking(input: {
  organisationId: string;
  actorId?: string;
  contactName: string;
  email?: string;
  phone?: string;
  service?: string;
  scheduledAt?: string;
  notes?: string;
  vendorLeadId?: string;
}) {
  const { prisma } = await import("@dg/database");
  const title = input.contactName.trim() || "Appraisal booking";
  const metadata: Record<string, unknown> = {
    contact_name: input.contactName.trim() || undefined,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    service: input.service?.trim() || "Appraisal",
    booking_type: "appraisal",
    scheduled_at: input.scheduledAt || undefined,
    notes: input.notes?.trim() || undefined,
    vendor_lead_id: input.vendorLeadId || undefined,
    lead_type: "booking",
  };

  let contactId: string | undefined;
  if (input.contactName || input.email || input.phone) {
    const { ensureContactForLeadFields } = await import("../contacts");
    const contact = await ensureContactForLeadFields({
      organisationId: input.organisationId,
      actorId: input.actorId,
      name: input.contactName,
      email: input.email,
      phone: input.phone,
      source: RE_BOOKING_SOURCE,
    });
    contactId = contact?.id;
    if (contactId) {
      const { ensureReContactRole } = await import("./contact-roles");
      await ensureReContactRole({
        organisationId: input.organisationId,
        contactId,
        role: "vendor",
      });
    }
  }

  const lead = await prisma.lead.create({
    data: {
      organisationId: input.organisationId,
      source: RE_BOOKING_SOURCE,
      title,
      status: "pending",
      contactId,
      description: input.notes?.trim() || undefined,
      metadata: metadata as Prisma.InputJsonValue,
      externalRefs: { source: "gen2" } as Prisma.InputJsonValue,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "Lead",
      entityId: lead.id,
      activityType: "booking_created",
      title: "Appraisal booking created",
      body: metadata.scheduled_at
        ? `Scheduled ${String(metadata.scheduled_at)}`
        : title,
      sourceApp: "real-estate",
      createdBy: input.actorId,
    },
  });

  const { linkBookingToVendorLead } = await import("./reports");
  await linkBookingToVendorLead(input.organisationId, lead.id);

  return serializeBooking(lead);
}

