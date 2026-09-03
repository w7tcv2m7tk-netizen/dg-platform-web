import { currentUser } from "@clerk/nextjs/server";

import { AccommodationBookingsPanel } from "@/components/accommodation/AccommodationBookingsPanel";
import { loadStayBookingsForOps } from "@/lib/accommodation-stay-bookings";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

export default async function AccommodationBookingsPage() {
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

  const loaded = await loadStayBookingsForOps(session, 150);
  const error =
    loaded.syncError && loaded.bookings.length === 0 ? loaded.syncError : undefined;

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · Accommodation · StayBooking (Neon)
          {loaded.total != null ? ` · ${loaded.total} bookings` : ""}
        </p>
      </div>
      <AccommodationBookingsPanel
        bookings={loaded.bookings}
        total={loaded.total}
        error={error}
        siteLabel="Accommodation"
        source="postgres"
        wpSyncAvailable={false}
      />
    </main>
  );
}
