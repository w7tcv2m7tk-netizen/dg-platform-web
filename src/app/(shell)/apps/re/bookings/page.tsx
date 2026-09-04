import { currentUser } from "@clerk/nextjs/server";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { listReBookings } from "@dg/platform-core";

import { ReBookingsPanel } from "@/components/re/ReBookingsPanel";
import { fetchPortalMe } from "@/lib/dg-api";

export default async function ReBookingsPage() {
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

  const bookings = session ? await listReBookings(session.organisationId, 50) : [];

  return (
    <main className="dg-page-main space-y-6">
      <p className="text-sm text-slate-400">
        {session?.organisationName ?? "Real Estate"} · Platform Core / Neon bookings
      </p>
      <ReBookingsPanel bookings={bookings} />
    </main>
  );
}
