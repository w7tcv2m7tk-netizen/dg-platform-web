import {
  listStayBookings,
  stayBookingToWpRow,
  type PlatformSession,
  type WpAccBookingRow,
} from "@dg/platform-core";

export type StayBookingsOpsLoad = {
  bookings: WpAccBookingRow[];
  total: number;
  source: "postgres";
  seededFromWp: false;
  syncError?: string;
};

/**
 * Native Gen 2 booking operations read StayBooking directly from Platform Core.
 * WordPress import is available only through the explicit migration boundary.
 */
export async function loadStayBookingsForOps(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId"> | null,
  limit = 150,
): Promise<StayBookingsOpsLoad> {
  if (!session) {
    return { bookings: [], total: 0, source: "postgres", seededFromWp: false };
  }

  const stored = await listStayBookings(session.organisationId, limit);
  const bookings = stored.map(stayBookingToWpRow);
  return {
    bookings,
    total: bookings.length,
    source: "postgres",
    seededFromWp: false,
  };
}
