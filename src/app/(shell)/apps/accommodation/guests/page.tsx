import { currentUser } from "@clerk/nextjs/server";
import { listAccommodationGuests } from "@dg/platform-core";

import { AccommodationGuestsTable } from "@/components/accommodation/AccommodationGuestsTable";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

export default async function AccommodationGuestsPage() {
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

  let guests: Awaited<ReturnType<typeof listAccommodationGuests>>["items"] = [];
  let total = 0;
  let error: string | undefined;

  if (session) {
    const listed = await listAccommodationGuests(session.organisationId, { limit: 100 });
    guests = listed.items;
    total = listed.meta.total;
  } else {
    error = "Sign in to view accommodation guests linked to Contacts.";
  }

  const siteLabel = session?.organisationName ?? "Accommodation";

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {siteLabel} · Contacts with Accommodation guest context · Platform Core / Neon
        </p>
      </div>
      <AccommodationGuestsTable
        guests={guests}
        total={total}
        error={error}
        siteLabel={siteLabel}
        sourceLabel="Contacts · StayBooking (Neon)"
      />
    </main>
  );
}
