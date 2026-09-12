import Link from "next/link";
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

/**
 * The legacy-shaped availability UI still uses numeric ids for local selection.
 * Gen 2-native units have no WordPress id and therefore serialize as id=0. Give
 * those rows stable, unique negative UI ids while preserving platform_id as the
 * mutation authority. Server write paths ignore non-positive legacy ids and use
 * platform_id first.
 */
function normaliseNativeUiIds(units: WpAccAvailabilityUnit[]): WpAccAvailabilityUnit[] {
  return units.map((unit, index) =>
    unit.id > 0 || !unit.platform_id
      ? unit
      : {
          ...unit,
          id: -(index + 1),
        },
  );
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
      units = normaliseNativeUiIds(
        sortAccommodationUnitsByDisplayOrder(
          neon.units as unknown as WpAccAvailabilityUnit[],
        ),
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

      {error ? (
        <div className="dg-card border-amber-500/30">
          <h2 className="font-semibold text-white">Availability is temporarily unavailable</h2>
          <p className="mt-2 text-sm text-amber-300">{error}</p>
          <p className="mt-2 text-sm text-slate-500">
            Refresh this page to retry the native Accommodation calendar. Existing bookings and
            manual blocks are not changed by this loading error.
          </p>
          <Link
            href="/apps/accommodation/units"
            className="mt-4 inline-flex min-h-11 items-center rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-blue-500 hover:text-white"
          >
            Open units
          </Link>
        </div>
      ) : !units.length ? (
        <div className="dg-card border-dashed border-slate-700">
          <h2 className="text-lg font-semibold text-white">Add your first units</h2>
          <p className="mt-2 text-sm text-slate-500">
            Add units in DigitalGate, then use inventory, week, month and list views here. OTA
            calendar URLs can be managed on each unit.
          </p>
          <Link
            href="/apps/accommodation/units"
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Open units
          </Link>
        </div>
      ) : (
        <AccommodationAvailabilityBoard
          from={availFrom}
          to={availTo}
          units={units}
          siteLabel={siteLabel}
          horizonDays={ACC_CALENDAR_HORIZON_DAYS}
        />
      )}
    </main>
  );
}
