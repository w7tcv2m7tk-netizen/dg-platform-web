import { currentUser } from "@clerk/nextjs/server";
import { resolvePlatformSession } from "@dg/platform-core";
import { Suspense } from "react";

import { AccommodationSitePicker } from "@/components/accommodation/AccommodationSitePicker";
import { AccommodationUnitsTable } from "@/components/accommodation/AccommodationUnitsTable";
import {
  fetchPortalMe,
  fetchWpAccommodationUnits,
  getWpAccommodationSite,
  listWpAccommodationSites,
} from "@/lib/dg-api";

interface PageProps {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function AccommodationUnitsPage({ searchParams }: PageProps) {
  const { siteId } = await searchParams;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user?.id) : null;

  const session = user?.id
    ? await resolvePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  const sites = listWpAccommodationSites();
  const site = getWpAccommodationSite(siteId);
  const unitsResult = await fetchWpAccommodationUnits(site.id);

  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <h1 className="text-2xl font-bold text-white">Units</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · {site.label} · domes and short-stay units
        </p>
        <Suspense fallback={null}>
          <div className="mt-3">
            <AccommodationSitePicker sites={sites} />
          </div>
        </Suspense>
      </header>
      <main className="flex-1 p-8">
        <AccommodationUnitsTable
          units={unitsResult.ok ? unitsResult.units : []}
          error={unitsResult.ok ? undefined : unitsResult.message}
          siteLabel={site.label}
        />
      </main>
    </>
  );
}
