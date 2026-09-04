import {
  housekeepingBoardFromUnits,
  listAccommodationGuests,
  listAccommodationUnits,
  listStayBookings,
  stayBookingToWpRow,
  type WpAccBookingRow,
} from "@dg/platform-core";

import { accAddDays, accDayKey, accToday } from "@/lib/acc-dates";

export type AccommodationSummary = {
  site?: string;
  properties: number;
  guests: number;
  upcoming_30d: number;
  checkins_today: number;
  checkouts_today: number;
  checkins_tomorrow: number;
  occupancy_rate: number;
  revenue_mtd: number;
  housekeeping: Record<string, number>;
  recent_bookings: WpAccBookingRow[];
};

function isCancelled(status: string | null | undefined): boolean {
  const value = (status ?? "").toLowerCase();
  return value === "cancelled" || value === "canceled";
}

function overlapNights(
  checkin: string | null | undefined,
  checkout: string | null | undefined,
  from: string,
  toExclusive: string,
): number {
  if (!checkin || !checkout) return 0;
  const start = checkin > from ? checkin : from;
  const end = checkout < toExclusive ? checkout : toExclusive;
  if (end <= start) return 0;
  const startMs = new Date(`${start}T00:00:00Z`).getTime();
  const endMs = new Date(`${end}T00:00:00Z`).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  return Math.max(0, Math.round((endMs - startMs) / 86_400_000));
}

/** Native Accommodation overview summary derived only from Platform Core / Neon. */
export async function buildAccommodationSummary(
  organisationId: string,
): Promise<AccommodationSummary> {
  const [units, bookings, guests] = await Promise.all([
    listAccommodationUnits(organisationId),
    listStayBookings(organisationId, 250),
    listAccommodationGuests(organisationId, { limit: 200 }),
  ]);

  const today = accToday();
  const tomorrow = accAddDays(today, 1);
  const in30Days = accAddDays(today, 30);
  const occupancyTo = accAddDays(today, 30);
  const monthPrefix = today.slice(0, 7);
  const active = bookings.filter((booking) => !isCancelled(booking.status));

  const checkinsToday = active.filter((booking) => accDayKey(booking.checkin) === today).length;
  const checkoutsToday = active.filter((booking) => accDayKey(booking.checkout) === today).length;
  const checkinsTomorrow = active.filter(
    (booking) => accDayKey(booking.checkin) === tomorrow,
  ).length;
  const upcoming30d = active.filter((booking) => {
    const day = accDayKey(booking.checkin);
    return Boolean(day && day >= today && day <= in30Days);
  }).length;

  const denominator = units.length * 30;
  const occupiedNights = active.reduce(
    (sum, booking) => sum + overlapNights(booking.checkin, booking.checkout, today, occupancyTo),
    0,
  );
  const occupancyRate = denominator > 0 ? Math.min(1, occupiedNights / denominator) : 0;

  const revenueMtdCents = active.reduce((sum, booking) => {
    if (!booking.checkin?.startsWith(monthPrefix)) return sum;
    return sum + (booking.totalCents ?? 0);
  }, 0);

  const housekeeping = housekeepingBoardFromUnits(units);
  const recentBookings = [...bookings]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 10)
    .map(stayBookingToWpRow);

  return {
    site: "Platform Core / Neon",
    properties: units.length,
    guests: guests.meta.total,
    upcoming_30d: upcoming30d,
    checkins_today: checkinsToday,
    checkouts_today: checkoutsToday,
    checkins_tomorrow: checkinsTomorrow,
    occupancy_rate: occupancyRate,
    revenue_mtd: revenueMtdCents / 100,
    housekeeping: housekeeping.summary,
    recent_bookings: recentBookings,
  };
}
