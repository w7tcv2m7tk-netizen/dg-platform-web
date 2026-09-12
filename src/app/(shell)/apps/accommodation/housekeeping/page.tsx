import {
  housekeepingBoardFromUnits,
  listAccommodationUnits,
  listStayBookings,
} from "@dg/platform-core";

import { AccommodationHousekeepingBoard } from "@/components/accommodation/AccommodationHousekeepingBoard";
import { accToday } from "@/lib/acc-dates";
import { getPlatformPageContext } from "@/lib/platform-page-context";

function safeTimeZone(value?: string | null): string {
  const fallback = "Australia/Brisbane";
  const candidate = value?.trim() || fallback;
  try {
    new Intl.DateTimeFormat("en-AU", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return fallback;
  }
}

export default async function AccommodationHousekeepingPage() {
  const { session } = await getPlatformPageContext();

  let items: Array<{
    id: number;
    platform_id?: string;
    title: string;
    status: string;
    notes?: string;
    last_cleaned?: string | null;
    checkout_today?: boolean;
    cleaning_form_url?: string;
    checkin_url?: string;
  }> = [];
  let statuses: Record<string, string> = {};
  let summary: Record<string, number> = {};
  let error: string | undefined;
  let checkoutsToday = 0;
  let today: string | undefined;

  if (session) {
    try {
      let timeZone = "Australia/Brisbane";
      if (process.env.DATABASE_URL) {
        const { prisma } = await import("@dg/database");
        const organisation = await prisma.organisation.findUnique({
          where: { id: session.organisationId },
          select: { timezone: true },
        });
        timeZone = safeTimeZone(organisation?.timezone);
      }

      today = accToday(timeZone);
      const [units, bookings] = await Promise.all([
        listAccommodationUnits(session.organisationId),
        listStayBookings(session.organisationId, 250),
      ]);
      const board = housekeepingBoardFromUnits(units, today);
      const activeCheckouts = bookings.filter((booking) => {
        const status = booking.status.toLowerCase();
        return (
          booking.checkout === today &&
          status !== "cancelled" &&
          status !== "canceled"
        );
      });

      items = board.items.map((item) => ({
        ...item,
        checkout_today: activeCheckouts.some(
          (booking) =>
            booking.accommodationUnitId === item.platform_id ||
            (item.id > 0 && booking.accommodationWpId === item.id),
        ),
      }));
      statuses = board.statuses;
      summary = board.summary;
      checkoutsToday = activeCheckouts.length;
    } catch (loadError) {
      console.error("[accommodation] housekeeping board failed", loadError);
      error = "Could not load housekeeping right now.";
    }
  } else {
    error = "Platform session unavailable.";
  }

  const siteLabel = session?.organisationName ?? "Accommodation";

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {siteLabel} · Platform Core / Neon · turnover status
        </p>
      </div>
      <AccommodationHousekeepingBoard
        items={items}
        statuses={statuses}
        summary={summary}
        error={error}
        siteLabel={siteLabel}
        checkoutsToday={checkoutsToday}
        today={today}
      />
    </main>
  );
}
