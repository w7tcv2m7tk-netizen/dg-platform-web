import { listAccommodationGuests } from "@dg/platform-core";

import { AccommodationGuestsTable } from "@/components/accommodation/AccommodationGuestsTable";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function AccommodationGuestsPage() {
  const { session } = await getPlatformPageContext();

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
