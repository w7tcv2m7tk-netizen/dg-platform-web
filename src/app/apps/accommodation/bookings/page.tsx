import { currentUser } from "@clerk/nextjs/server";
import { Suspense } from "react";

import { AccommodationBookingsTable } from "@/components/accommodation/AccommodationBookingsTable";
import { AccommodationSitePicker } from "@/components/accommodation/AccommodationSitePicker";
import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  fetchPortalMe,
  fetchWpAccommodationBookings,
  getWpAccommodationSite,
  listWpAccommodationSites,
} from "@/lib/dg-api";

interface PageProps {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function AccommodationBookingsPage({ searchParams }: PageProps) {
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
  const bookingsResult = await fetchWpAccommodationBookings(site.id, 50, connector);
  const siteLabel = connector?.label ?? site.label;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Bookings</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · {siteLabel} · reservations from
          WordPress
        </p>
        <Suspense fallback={null}>
          <div className="mt-3">
            <AccommodationSitePicker sites={sites} />
          </div>
        </Suspense>
      </header>
      <main className="dg-page-main">
        <AccommodationBookingsTable
          bookings={bookingsResult.ok ? bookingsResult.bookings : []}
          total={bookingsResult.ok ? bookingsResult.total : undefined}
          error={bookingsResult.ok ? undefined : bookingsResult.message}
          siteLabel={siteLabel}
        />
      </main>
    </>
  );
}
