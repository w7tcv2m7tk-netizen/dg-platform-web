import { currentUser } from "@clerk/nextjs/server";
import { Suspense } from "react";

import { AccommodationHousekeepingBoard } from "@/components/accommodation/AccommodationHousekeepingBoard";
import { AccommodationSitePicker } from "@/components/accommodation/AccommodationSitePicker";
import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  fetchPortalMe,
  fetchWpAccommodationHousekeeping,
  getWpAccommodationSite,
  listWpAccommodationSites,
} from "@/lib/dg-api";

interface PageProps {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function AccommodationHousekeepingPage({ searchParams }: PageProps) {
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
  const board = await fetchWpAccommodationHousekeeping(site.id, connector);
  const siteLabel = connector?.label ?? site.label;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Housekeeping</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · {siteLabel} · turnover status
        </p>
        <Suspense fallback={null}>
          <div className="mt-3">
            <AccommodationSitePicker sites={sites} />
          </div>
        </Suspense>
      </header>
      <main className="dg-page-main">
        <AccommodationHousekeepingBoard
          items={board.ok ? board.items : []}
          statuses={board.ok ? board.statuses : {}}
          summary={board.ok ? board.summary : {}}
          error={board.ok ? undefined : board.message}
          siteLabel={siteLabel}
          checkoutsToday={board.ok ? board.checkoutsToday : 0}
          today={board.ok ? board.today : undefined}
        />
      </main>
    </>
  );
}
