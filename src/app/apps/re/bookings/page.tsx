import { currentUser } from "@clerk/nextjs/server";
import { resolvePlatformSession } from "@dg/platform-core";

import { ReBookingsPanel } from "@/components/re/ReBookingsPanel";
import { fetchPortalMe, fetchWpRecentBookings } from "@/lib/dg-api";

export default async function ReBookingsPage() {
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

  const bookingsResult = await fetchWpRecentBookings(50);

  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <h1 className="text-2xl font-bold text-white">Bookings</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "Real Estate"} · Live from Roe WordPress (appraisals &
          strategy calls)
        </p>
      </header>
      <main className="flex-1 p-8">
        <ReBookingsPanel
          bookings={bookingsResult.ok ? bookingsResult.bookings : []}
          error={bookingsResult.ok ? undefined : bookingsResult.message}
        />
      </main>
    </>
  );
}
