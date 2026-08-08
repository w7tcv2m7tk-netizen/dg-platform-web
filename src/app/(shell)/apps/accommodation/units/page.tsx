import { currentUser } from "@clerk/nextjs/server";
import { Suspense } from "react";

import { AccommodationSitePicker } from "@/components/accommodation/AccommodationSitePicker";
import { AccommodationUnitsTable } from "@/components/accommodation/AccommodationUnitsTable";
import { loadUnitsForOps } from "@/lib/accommodation-units";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  fetchPortalMe,
  getWpAccommodationSite,
  listWpAccommodationSites,
  type WpAccUnitProp,
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
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  const sites = listWpAccommodationSites();
  const site = getWpAccommodationSite(siteId);
  const loaded = await loadUnitsForOps(session, site.id);
  const siteLabel = loaded.siteLabel ?? site.label;
  const sourceLabel = loaded.sot ? "AccommodationUnit (Neon)" : "WordPress";

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Units</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · {siteLabel} · {sourceLabel} · all
          listings including coming soon
        </p>
        <Suspense fallback={null}>
          <div className="mt-3">
            <AccommodationSitePicker sites={sites} />
          </div>
        </Suspense>
      </header>
      <main className="dg-page-main">
        <AccommodationUnitsTable
          units={loaded.units as unknown as WpAccUnitProp[]}
          error={loaded.error}
          siteLabel={siteLabel}
        />
      </main>
    </>
  );
}
