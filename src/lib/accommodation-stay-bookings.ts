import {
  listStayBookings,
  stayBookingToWpRow,
  type PlatformSession,
  type WpAccBookingRow,
} from "@dg/platform-core";

import {
  autoSyncWordPressAccBookingsIfNeeded,
  syncWordPressAccBookings,
} from "@/lib/wordpress-sync";

export type StayBookingsOpsLoad = {
  bookings: WpAccBookingRow[];
  total: number;
  source: "postgres";
  /** True when Neon was empty and a blocking WP pull ran to seed StayBooking. */
  seededFromWp: boolean;
  syncError?: string;
};

/**
 * WP-D-401: Ops UI always reads Neon StayBooking.
 * If the cache is empty, pull once from WordPress so the table is not blank
 * after deploy — then background sync keeps it warm.
 */
export async function loadStayBookingsForOps(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId"> | null,
  limit = 150,
): Promise<StayBookingsOpsLoad> {
  if (!session) {
    return { bookings: [], total: 0, source: "postgres", seededFromWp: false };
  }

  let stored = await listStayBookings(session.organisationId, limit);
  let seededFromWp = false;
  let syncError: string | undefined;

  if (stored.length === 0) {
    const outcome = await syncWordPressAccBookings(session);
    seededFromWp = true;
    if (!outcome.ok) {
      syncError = outcome.message;
    }
    stored = await listStayBookings(session.organisationId, limit);
  } else {
    void autoSyncWordPressAccBookingsIfNeeded(session);
  }

  const bookings = stored.map(stayBookingToWpRow);
  return {
    bookings,
    total: bookings.length,
    source: "postgres",
    seededFromWp,
    syncError,
  };
}
