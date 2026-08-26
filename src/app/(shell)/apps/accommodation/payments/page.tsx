import { currentUser } from "@clerk/nextjs/server";
import { Suspense } from "react";

import { AccommodationPaymentsTable } from "@/components/accommodation/AccommodationPaymentsTable";
import { AccommodationSitePicker } from "@/components/accommodation/AccommodationSitePicker";
import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import { loadStayBookingsForOps } from "@/lib/accommodation-stay-bookings";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  fetchPortalMe,
  getWpAccommodationSite,
  listWpAccommodationSites,
} from "@/lib/dg-api";

interface PageProps {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function AccommodationPaymentsPage({ searchParams }: PageProps) {
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

  const loaded = await loadStayBookingsForOps(session, 150);
  const bookings = loaded.bookings;
  const unpaid = bookings.filter((b) => (b.paid ?? "no") !== "yes");
  const paid = bookings.filter((b) => b.paid === "yes");

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · {siteLabel} · StayBooking (Neon)
          {site.baseUrl ? " · paid status can mirror to WordPress when connected" : ""}
        </p>
        <Suspense fallback={null}>
          <div className="mt-3">
            <AccommodationSitePicker sites={sites} />
          </div>
        </Suspense>
      </div>
        {loaded.syncError && bookings.length === 0 ? (
          <div className="dg-card border-amber-500/30">
            <p className="text-amber-300">{loaded.syncError}</p>
            <p className="mt-2 text-sm text-slate-500">
              Payments follow StayBooking rows in Neon.
              {site.baseUrl
                ? " Sync from WordPress on Bookings when a live Acc host is connected, or rely on dual-write / OTA iCal."
                : " Use Availability OTA iCal sync and ops bookings — no live WordPress Acc host."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Unpaid / unknown</p>
                <p className="mt-1 text-2xl font-bold text-white">{unpaid.length}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Paid</p>
                <p className="mt-1 text-2xl font-bold text-white">{paid.length}</p>
              </div>
            </div>
            <AccommodationPaymentsTable bookings={bookings} />
          </>
        )}
      </main>
  );
}
