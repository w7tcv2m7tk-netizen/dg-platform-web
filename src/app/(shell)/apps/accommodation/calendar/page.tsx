import {
  ACC_CALENDAR_HORIZON_DAYS,
  buildAvailabilityFromNeon,
  sortAccommodationUnitsByDisplayOrder,
} from "@dg/platform-core";
import { currentUser } from "@clerk/nextjs/server";

import { AccommodationAvailabilityBoard } from "@/components/accommodation/AccommodationAvailabilityBoard";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe, type WpAccAvailabilityUnit } from "@/lib/dg-api";

export default async function AccommodationCalendarPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user?.id) : null;

  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  const today = new Date();
  const localISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  // Fetch from start of current week (Sunday) so week view always has today's nights.
  const weekStartFetch = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay());
    return d;
  })();
  // 2-year horizon so far-dated OTA blocks paint in month/list.
  const toDate = new Date(today);
  toDate.setDate(toDate.getDate() + ACC_CALENDAR_HORIZON_DAYS);
  const from = localISO(weekStartFetch);
  const to = localISO(toDate);

  let availFrom = from;
  let availTo = to;
  let units: WpAccAvailabilityUnit[] = [];
  let error: string | undefined;

  if (session) {
    const neon = await buildAvailabilityFromNeon(session.organisationId, { from, to });
    availFrom = neon.from;
    availTo = neon.to;
    units = sortAccommodationUnitsByDisplayOrder(
      neon.units as unknown as WpAccAvailabilityUnit[],
    );
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
