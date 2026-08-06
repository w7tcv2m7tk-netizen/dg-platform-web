import { currentUser } from "@clerk/nextjs/server";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {} from "@dg/platform-core";
import { Suspense } from "react";

import { AccommodationDashboard } from "@/components/accommodation/AccommodationDashboard";
import { AccommodationSitePicker } from "@/components/accommodation/AccommodationSitePicker";
import {
  fetchPortalMe,
  fetchWpAccommodationSummary,
  getWpAccommodationSite,
  listWpAccommodationSites,
} from "@/lib/dg-api";

interface PageProps {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function AccommodationOverviewPage({ searchParams }: PageProps) {
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
  const summaryResult = await fetchWpAccommodationSummary(site.id);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Accommodation</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · {site.label} · live from WordPress
        </p>
        <Suspense fallback={null}>
          <div className="mt-3">
            <AccommodationSitePicker sites={sites} />
          </div>
        </Suspense>
      </header>
      <main className="dg-page-main">
        <AccommodationDashboard
          summary={summaryResult.ok ? summaryResult.data : undefined}
          error={summaryResult.ok ? undefined : summaryResult.message}
          siteLabel={site.label}
        />
      </main>
    </>
  );
}
