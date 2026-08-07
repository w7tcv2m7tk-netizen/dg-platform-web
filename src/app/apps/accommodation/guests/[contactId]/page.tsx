import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getAccommodationGuest, getContact } from "@dg/platform-core";
import { notFound } from "next/navigation";

import { AccommodationGuestPanel } from "@/components/accommodation/AccommodationGuestPanel";
import { AccommodationGuestPrefsEditor } from "@/components/accommodation/AccommodationGuestPrefsEditor";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

interface PageProps {
  params: Promise<{ contactId: string }>;
}

export default async function AccommodationGuestDetailPage({ params }: PageProps) {
  const { contactId } = await params;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const session = user?.id
    ? await resolveActivePlatformSession({ clerkUserId: user.id, email, name })
    : null;

  if (!session) {
    notFound();
  }

  const guest = await getAccommodationGuest(session.organisationId, contactId);
  if (!guest) {
    notFound();
  }

  const contact = await getContact(session.organisationId, contactId);
  const displayName =
    guest.displayName ||
    (contact ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") : "Guest");

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/apps/accommodation/guests"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Guests
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{displayName}</h1>
        <p className="text-sm text-slate-400">
          {[guest.email, guest.phone, "Guest"].filter(Boolean).join(" · ")}
          {" · "}
          <Link
            href={`/apps/crm/contacts/${guest.contactId}`}
            className="text-blue-400 hover:underline"
          >
            Universal Contact
          </Link>
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <AccommodationGuestPanel guest={guest} />
        <AccommodationGuestPrefsEditor guest={guest} />
      </main>
    </>
  );
}
