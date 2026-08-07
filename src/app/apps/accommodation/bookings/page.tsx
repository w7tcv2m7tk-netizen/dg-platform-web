import { currentUser } from "@clerk/nextjs/server";
import { Suspense } from "react";

import { AccommodationBookingsPanel } from "@/components/accommodation/AccommodationBookingsPanel";
import { AccommodationSitePicker } from "@/components/accommodation/AccommodationSitePicker";
import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  fetchPortalMe,
  fetchWpAccommodationBookings,
  getWpAccommodationSite,
  listWpAccommodationSites,
} from "@/lib/dg-api";
import { autoSyncWordPressAccBookingsIfNeeded } from "@/lib/wordpress-sync";

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

  // Background mirror — ops table prefers live WP so admin/OTA edits show immediately.
  if (session) {
    void autoSyncWordPressAccBookingsIfNeeded(session);
  }

  const sites = listWpAccommodationSites();
  const site = getWpAccommodationSite(siteId);
  const connector = await accommodationConnectorForSession(session?.organisationId);
  const siteLabel = connector?.label ?? site.label;

  const live = await fetchWpAccommodationBookings(site.id, 150, connector);
  const bookings = live.ok ? live.bookings : [];
  const error = live.ok ? undefined : live.message;
  const total = live.ok ? live.total : undefined;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Bookings</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · {siteLabel} · live WordPress
          {total != null ? ` · ${total} bookings` : ""}
        </p>
        <Suspense fallback={null}>
          <div className="mt-3">
            <AccommodationSitePicker sites={sites} />
          </div>
        </Suspense>
      </header>
      <main className="dg-page-main">
        <AccommodationBookingsPanel
          bookings={bookings}
          total={total}
          error={error}
          siteLabel={siteLabel}
          source="wordpress"
        />
      </main>
    </>
  );
}
