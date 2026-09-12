import {
  ACC_CALENDAR_HORIZON_DAYS,
  buildAvailabilityFromNeon,
  sortAccommodationUnitsByDisplayOrder,
} from "@dg/platform-core";

import { AccommodationAvailabilityBoard } from "@/components/accommodation/AccommodationAvailabilityBoard";
import { accAddDays, accToday } from "@/lib/acc-dates";
import { type WpAccAvailabilityUnit } from "@/lib/dg-api";
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

function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export default async function AccommodationCalendarPage() {
  const { session } = await getPlatformPageContext();

  let timeZone = "Australia/Brisbane";
  if (session && process.env.DATABASE_URL) {
    const { prisma } = await import("@dg/database");
    const organisation = await prisma.organisation.findUnique({
      where: { id: session.organisationId },
      select: { timezone: true },
    });
    timeZone = safeTimeZone(organisation?.timezone);
  }

  const today = accToday(timeZone);
  // Fetch from start of the tenant's current week (Sunday) so week view includes today.
  const from = accAddDays(today, -dayOfWeek(today));
  const to = accAddDays(today, ACC_CALENDAR_HORIZON_DAYS);

  let availFrom = from;
  let availTo = to;
  let units: WpAccAvailabilityUnit[] = [];
  let error: string | undefined;

  if (session) {
    try {
      const neon = await buildAvailabilityFromNeon(session.organisationId, { from, to });
      availFrom = neon.from;
      availTo = neon.to;
      units = sortAccommodationUnitsByDisplayOrder(
        neon.units as unknown as WpAccAvailabilityUnit[],
      );
    } catch (loadError) {
      console.error("[accommodation] availability failed", loadError);
      error = "Could not load availability right now.";
    }
  } else {
    error = "Platform session unavailable.";
  }

  const siteLabel = session?.organisationName ?? "Accommodation";

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {siteLabel} · Platform Core / Neon · inventory, week, month & list · Airbnb / Booking.com iCal
        </p>
      </div>
      <AccommodationAvailabilityBoard
        from={availFrom}
        to={availTo}
        units={units}
        error={error}
        siteLabel={siteLabel}
        horizonDays={ACC_CALENDAR_HORIZON_DAYS}
      />
    </main>
  );
}
