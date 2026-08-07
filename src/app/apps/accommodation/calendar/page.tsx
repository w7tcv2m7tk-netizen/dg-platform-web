import { currentUser } from "@clerk/nextjs/server";
import { Suspense } from "react";

import { AccommodationAvailabilityBoard } from "@/components/accommodation/AccommodationAvailabilityBoard";
import { AccommodationSitePicker } from "@/components/accommodation/AccommodationSitePicker";
import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  fetchPortalMe,
  fetchWpAccommodationAvailability,
  getWpAccommodationSite,
  listWpAccommodationSites,
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

  // Local calendar dates (avoid UTC off-by-one). Start at month boundary so
  // month view can paint stays that began earlier in the current month.
  const today = new Date();
  const localISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const toDate = new Date(today);
  toDate.setDate(toDate.getDate() + 60);
  const from = localISO(monthStart);
  const to = localISO(toDate);

  const availability = await fetchWpAccommodationAvailability({
    siteId: site.id,
    from,
    to,
    connector,
  });
  const siteLabel = connector?.label ?? site.label;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Availability</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · {siteLabel} · inventory, week, month &
          list · Airbnb / Booking.com iCal
        </p>
        <Suspense fallback={null}>
          <div className="mt-3">
            <AccommodationSitePicker sites={sites} />
          </div>
        </Suspense>
      </header>
      <main className="dg-page-main">
        <AccommodationAvailabilityBoard
          from={availability.ok ? availability.from ?? from : from}
          to={availability.ok ? availability.to ?? to : to}
          units={availability.ok ? availability.units : []}
          error={availability.ok ? undefined : availability.message}
          siteLabel={siteLabel}
        />
      </main>
    </>
  );
}
