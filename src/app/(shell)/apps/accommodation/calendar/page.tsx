import {
  buildAvailabilityFromNeon,
  organisationUsesUnitSot,
} from "@dg/platform-core";
import { currentUser } from "@clerk/nextjs/server";
import { Suspense } from "react";

import { AccommodationAvailabilityBoard } from "@/components/accommodation/AccommodationAvailabilityBoard";
import { AccommodationSitePicker } from "@/components/accommodation/AccommodationSitePicker";
import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import { loadUnitsForOps } from "@/lib/accommodation-units";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  fetchPortalMe,
  fetchWpAccommodationAvailability,
  getWpAccommodationSite,
  listWpAccommodationSites,
  type WpAccAvailabilityUnit,
} from "@/lib/dg-api";

interface PageProps {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function AccommodationCalendarPage({ searchParams }: PageProps) {
  const { siteId } = await searchParams;
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

  const sites = listWpAccommodationSites();
  const site = getWpAccommodationSite(siteId);
  const connector = await accommodationConnectorForSession(session?.organisationId);

  const today = new Date();
  const localISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  // Fetch from start of current week so week view always has today's nights.
  const weekStartFetch = (() => {
    const d = new Date(today);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  })();
  const toDate = new Date(today);
  toDate.setDate(toDate.getDate() + 60);
  const from = localISO(weekStartFetch);
  const to = localISO(toDate);

  let availFrom = from;
  let availTo = to;
  let units: WpAccAvailabilityUnit[] = [];
  let error: string | undefined;
  let sotLabel = "WordPress";

  if (session && (await organisationUsesUnitSot(session.organisationId))) {
    await loadUnitsForOps(session, site.id);
    const neon = await buildAvailabilityFromNeon(session.organisationId, { from, to });
    availFrom = neon.from;
    availTo = neon.to;
    units = neon.units as unknown as WpAccAvailabilityUnit[];
    sotLabel = "Neon (units + StayBooking)";
  } else {
    const availability = await fetchWpAccommodationAvailability({
      siteId: site.id,
      from,
      to,
      connector,
    });
    if (availability.ok) {
      availFrom = availability.from ?? from;
      availTo = availability.to ?? to;
      units = availability.units;
    } else {
      error = availability.message;
    }
  }

  const siteLabel = connector?.label ?? site.label;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Availability</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · {siteLabel} · {sotLabel} · inventory,
          week, month & list · Airbnb / Booking.com iCal
        </p>
        <Suspense fallback={null}>
          <div className="mt-3">
            <AccommodationSitePicker sites={sites} />
          </div>
        </Suspense>
      </header>
      <main className="dg-page-main">
        <AccommodationAvailabilityBoard
          from={availFrom}
          to={availTo}
          units={units}
          error={error}
          siteLabel={siteLabel}
        />
      </main>
    </>
  );
}
