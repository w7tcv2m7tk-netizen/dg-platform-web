import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  getAccommodationGuest,
  getContact,
  listContactActivities,
} from "@dg/platform-core";
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

  const [contact, activities] = await Promise.all([
    getContact(session.organisationId, contactId),
    listContactActivities(session.organisationId, contactId),
  ]);
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
        <AccommodationGuestPrefsEditor
          guest={{
            ...guest,
            displayName,
            email: guest.email,
            phone: guest.phone,
            legacyWpGuestId: guest.legacyWpGuestId,
          }}
        />

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-white">Contact history</h2>
            <Link
              href={`/apps/crm/contacts/${guest.contactId}`}
              className="text-xs text-blue-400 hover:underline"
            >
              Open full timeline →
            </Link>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Notes and CRM activity on this Contact (communications appear when logged).
          </p>
          {!activities?.length ? (
            <p className="mt-4 text-sm text-slate-500">No timeline activity yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {activities.slice(0, 12).map((activity) => (
                <li
                  key={activity.id}
                  className="border-l-2 border-blue-600/40 pl-3 text-sm"
                >
                  <p className="font-medium text-white">{activity.title}</p>
                  {activity.body ? (
                    <p className="mt-0.5 text-slate-400">{activity.body}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">
                    {activity.activityType}
                    {activity.sourceApp ? ` · ${activity.sourceApp}` : ""} ·{" "}
                    {new Date(activity.createdAt).toLocaleString("en-AU")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
