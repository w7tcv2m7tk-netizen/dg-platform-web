import { currentUser } from "@clerk/nextjs/server";
import { Suspense } from "react";

import { AccommodationBookingsPanel } from "@/components/accommodation/AccommodationBookingsPanel";
import { AccommodationSitePicker } from "@/components/accommodation/AccommodationSitePicker";
import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import { loadStayBookingsForOps } from "@/lib/accommodation-stay-bookings";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  fetchPortalMe,
  getWpAccommodationSite,
  hasLiveAccWordPressHost,
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
  const siteLabel = connector?.label ?? site.label;
  const wpSyncAvailable = hasLiveAccWordPressHost(connector);

  const loaded = await loadStayBookingsForOps(session, 150);
  const error =
    loaded.syncError && loaded.bookings.length === 0 ? loaded.syncError : undefined;

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · {siteLabel} · StayBooking (Neon)
          {loaded.total != null ? ` · ${loaded.total} bookings` : ""}
        </p>
        <Suspense fallback={null}>
          <div className="mt-3">
            <AccommodationSitePicker sites={sites} />
          </div>
        </Suspense>
      </div>
        <AccommodationBookingsPanel
          bookings={loaded.bookings}
          total={loaded.total}
          error={error}
          siteLabel={siteLabel}
          source="postgres"
          wpSyncAvailable={wpSyncAvailable}
        />
      </main>
  );
}
