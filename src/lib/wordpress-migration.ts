import {
  syncAccommodationBookingsFromWordPress,
  syncAccommodationUnitsFromWordPress,
} from "@dg/platform-core";

/**
 * WordPress is an import source only.
 *
 * Native Gen 2 runtime code must not call this module for reads, writes,
 * availability, OTA sync, housekeeping, booking management or guest updates.
 * It exists solely to help an organisation migrate legacy WordPress data into
 * Platform Core before the WordPress connector is disconnected.
 */
export async function migrateAccommodationFromWordPress(input: {
  organisationId: string;
  actorId?: string;
  resource: "units" | "bookings" | "all";
  limit?: number;
}) {
  const units =
    input.resource === "units" || input.resource === "all"
      ? await syncAccommodationUnitsFromWordPress(input.organisationId)
      : null;

  if (units && !units.ok) {
    return {
      ok: false as const,
      resource: "units" as const,
      reason: units.reason,
      message: units.message,
    };
  }

  const bookings =
    input.resource === "bookings" || input.resource === "all"
      ? await syncAccommodationBookingsFromWordPress(input.organisationId, {
          actorId: input.actorId,
          limit: input.limit,
        })
      : null;

  if (bookings && !bookings.ok) {
    return {
      ok: false as const,
      resource: "bookings" as const,
      reason: bookings.reason,
      message: bookings.message,
    };
  }

  return {
    ok: true as const,
    mode: "migration_only" as const,
    imported: {
      units: units?.ok ? units.result : null,
      bookings: bookings?.ok ? bookings.result : null,
    },
  };
}
