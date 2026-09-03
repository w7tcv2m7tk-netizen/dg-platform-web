import { prisma } from "@dg/database";

import {
  updateStayBooking,
  upsertStayBookingFromWpRow,
  type WpAccBookingRow,
} from "./bookings";

export type BookingAuthoritySyncResult = {
  outcome: "created" | "updated" | "skipped";
  platformId: string | null;
};

function canonicalPlatformId(row: WpAccBookingRow): string | null {
  const value = row.platform_id?.trim();
  return value ? value : null;
}

/**
 * Apply a WordPress booking projection without allowing the connector's numeric
 * post id to overrule an established Gen 2 StayBooking identity.
 *
 * During migration, rows without platform_id bootstrap through the legacy
 * organisationId + externalWpId key. The canonical StayBooking id returned by
 * this function must then be persisted by WordPress and sent on later writes.
 */
export async function syncWpBookingWithPlatformAuthority(
  organisationId: string,
  row: WpAccBookingRow,
): Promise<BookingAuthoritySyncResult> {
  const platformId = canonicalPlatformId(row);

  if (platformId) {
    const existing = await prisma.stayBooking.findFirst({
      where: { id: platformId, organisationId },
      select: { id: true, externalWpId: true },
    });

    if (!existing) {
      throw new Error(`Canonical StayBooking ${platformId} was not found for this organisation`);
    }

    if (
      typeof row.id === "number" &&
      row.id > 0 &&
      existing.externalWpId != null &&
      existing.externalWpId !== row.id
    ) {
      throw new Error(
        `Canonical StayBooking ${platformId} is linked to WordPress booking ${existing.externalWpId}, not ${row.id}`,
      );
    }

    if (typeof row.id === "number" && row.id > 0 && existing.externalWpId == null) {
      await prisma.stayBooking.update({
        where: { id: existing.id },
        data: { externalWpId: row.id },
      });
    }

    const updated = await updateStayBooking(organisationId, {
      platformId,
      guestName: row.guest_name,
      email: row.email,
      phone: row.phone,
      accommodationName: row.accommodation,
      accommodationWpId: row.accommodation_id,
      checkin: row.checkin,
      checkout: row.checkout,
      status: row.status,
      total: row.total,
      ref: row.ref,
      paid: row.paid,
      paymentMethod: row.payment_method,
      source: row.source,
      guests: row.guests,
      nights: row.nights,
      message: row.message,
    });

    if (!updated) {
      throw new Error(`Canonical StayBooking ${platformId} could not be updated`);
    }

    return { outcome: "updated", platformId: updated.id };
  }

  // Legacy WP identity fallback: bootstrap only. Once a platform id is returned,
  // the connector must persist and use that canonical identity on later writes.
  const outcome = await upsertStayBookingFromWpRow(organisationId, row);
  if (outcome === "conflict") {
    throw new Error("WordPress booking projection conflicts with an existing StayBooking");
  }
  if (typeof row.id !== "number" || row.id <= 0) {
    return { outcome, platformId: null };
  }

  const canonical = await prisma.stayBooking.findUnique({
    where: {
      organisationId_externalWpId: {
        organisationId,
        externalWpId: row.id,
      },
    },
    select: { id: true },
  });

  return { outcome, platformId: canonical?.id ?? null };
}
