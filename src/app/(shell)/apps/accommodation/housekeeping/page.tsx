import {
  housekeepingBoardFromUnits,
  listAccommodationUnits,
  organisationUsesHousekeepingSot,
  sortAccommodationUnitsByDisplayOrder,
} from "@dg/platform-core";
import { currentUser } from "@clerk/nextjs/server";
import { Suspense } from "react";

import { AccommodationHousekeepingBoard } from "@/components/accommodation/AccommodationHousekeepingBoard";
import { AccommodationSitePicker } from "@/components/accommodation/AccommodationSitePicker";
import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import { loadUnitsForOps } from "@/lib/accommodation-units";
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

  let items: Array<{
    id: number;
    title: string;
    status: string;
    notes?: string;
    last_cleaned?: string | null;
    checkout_today?: boolean;
    cleaning_form_url?: string;
    checkin_url?: string;
  }> = [];
  let statuses: Record<string, string> = {};
  let summary: Record<string, number> = {};
  let error: string | undefined;
  let checkoutsToday = 0;
  let today: string | undefined;
  let sotLabel = "WordPress";

  if (session && (await organisationUsesHousekeepingSot(session.organisationId))) {
    await loadUnitsForOps(session, site.id);
    const units = await listAccommodationUnits(session.organisationId);
    const board = housekeepingBoardFromUnits(units);
    items = board.items;
    statuses = board.statuses;
    summary = board.summary;
    today = board.today;
    sotLabel = "AccommodationUnit (Neon)";
  } else {
    const board = await fetchWpAccommodationHousekeeping(site.id, connector);
    if (board.ok) {
      items = sortAccommodationUnitsByDisplayOrder(board.items);
      statuses = board.statuses;
      summary = board.summary;
      checkoutsToday = board.checkoutsToday;
      today = board.today;
    } else {
      error = board.message;
    }
  }

  const siteLabel = connector?.label ?? site.label;

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · {siteLabel} · {sotLabel} · turnover
          status
        </p>
        <Suspense fallback={null}>
          <div className="mt-3">
            <AccommodationSitePicker sites={sites} />
          </div>
        </Suspense>
      </div>
        <AccommodationHousekeepingBoard
          items={items}
          statuses={statuses}
          summary={summary}
          error={error}
          siteLabel={siteLabel}
          checkoutsToday={checkoutsToday}
          today={today}
        />
      </main>
  );
}
