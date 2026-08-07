import { currentUser } from "@clerk/nextjs/server";
import {
  listAccommodationGuests,
  upsertGuestFromWpRow,
} from "@dg/platform-core";
import { Suspense } from "react";

import { AccommodationGuestsTable } from "@/components/accommodation/AccommodationGuestsTable";
import { AccommodationSitePicker } from "@/components/accommodation/AccommodationSitePicker";
import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  fetchPortalMe,
  fetchWpAccommodationGuests,
  getWpAccommodationSite,
  listWpAccommodationSites,
} from "@/lib/dg-api";

interface PageProps {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function AccommodationGuestsPage({ searchParams }: PageProps) {
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
  const siteLabel = connector?.label ?? site.label;

  let guests: Awaited<ReturnType<typeof listAccommodationGuests>>["items"] = [];
  let total = 0;
  let error: string | undefined;
  let sourceLabel = "Platform Contacts";

  if (session) {
    // Bridge WP guests → Contact + AccommodationGuestProfile when connector available
    const wpGuests = await fetchWpAccommodationGuests(site.id, 100, connector);
    if (wpGuests.ok) {
      for (const row of wpGuests.guests) {
        await upsertGuestFromWpRow(session.organisationId, row, {
          actorId: user?.id,
        });
      }
    }

    const listed = await listAccommodationGuests(session.organisationId, { limit: 100 });
    guests = listed.items;
    total = listed.meta.total;
    if (!guests.length && wpGuests.ok === false) {
      error = wpGuests.message;
      sourceLabel = "WordPress (unavailable)";
    } else if (wpGuests.ok) {
      sourceLabel = "Contacts · synced from WordPress + stay bookings";
    } else {
      sourceLabel = "Contacts · stay bookings";
    }
  } else {
    error = "Sign in to view accommodation guests linked to Contacts.";
  }

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Guests</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · {siteLabel} · Contacts with Accommodation
          guest context
        </p>
        <Suspense fallback={null}>
          <div className="mt-3">
            <AccommodationSitePicker sites={sites} />
          </div>
        </Suspense>
      </header>
      <main className="dg-page-main">
        <AccommodationGuestsTable
          guests={guests}
          total={total}
          error={error}
          siteLabel={siteLabel}
          sourceLabel={sourceLabel}
        />
      </main>
    </>
  );
}
