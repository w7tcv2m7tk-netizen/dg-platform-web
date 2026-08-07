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

  const today = new Date();
  const from = today.toISOString().slice(0, 10);
  const toDate = new Date(today);
  toDate.setDate(toDate.getDate() + 45);
  const to = toDate.toISOString().slice(0, 10);

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
          {session?.organisationName ?? "DigitalGate"} · {siteLabel} · next 45 days
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
