import {
  housekeepingBoardFromUnits,
  listAccommodationUnits,
} from "@dg/platform-core";
import { currentUser } from "@clerk/nextjs/server";

import { AccommodationHousekeepingBoard } from "@/components/accommodation/AccommodationHousekeepingBoard";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

export default async function AccommodationHousekeepingPage() {
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

  if (session) {
    const units = await listAccommodationUnits(session.organisationId);
    const board = housekeepingBoardFromUnits(units);
    items = board.items;
    statuses = board.statuses;
    summary = board.summary;
    today = board.today;
  } else {
    error = "Platform session unavailable.";
  }

  const siteLabel = session?.organisationName ?? "Accommodation";

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {siteLabel} · Platform Core / Neon · turnover status
        </p>
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
