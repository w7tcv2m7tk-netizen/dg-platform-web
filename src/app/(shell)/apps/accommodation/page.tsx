import { currentUser } from "@clerk/nextjs/server";

import { AccommodationDashboard } from "@/components/accommodation/AccommodationDashboard";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { buildAccommodationSummary } from "@/lib/accommodation-summary";
import { fetchPortalMe } from "@/lib/dg-api";

export default async function AccommodationOverviewPage() {
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

  const summary = session ? await buildAccommodationSummary(session.organisationId) : undefined;
  const siteLabel = session?.organisationName ?? "Accommodation";

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {siteLabel} · Platform Core / Neon · Ops
        </p>
      </div>
      <AccommodationDashboard
        summary={summary}
        error={session ? undefined : "Platform session unavailable."}
        siteLabel={siteLabel}
      />
    </main>
  );
}
