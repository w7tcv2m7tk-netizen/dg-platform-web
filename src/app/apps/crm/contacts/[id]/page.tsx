import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getContact, listCompanies, listContactActivities, resolvePlatformSession } from "@dg/platform-core";

import { AddContactNoteForm } from "@/components/crm/AddContactNoteForm";
import { EditContactForm } from "@/components/crm/EditContactForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const session = user?.id
    ? await resolvePlatformSession({ clerkUserId: user.id, email, name })
    : null;

  if (!session) {
    notFound();
  }

  const contact = await getContact(session.organisationId, id);
  if (!contact) {
    notFound();
  }

  const activities = await listContactActivities(session.organisationId, id);
  const { items: companies } = await listCompanies({
    organisationId: session.organisationId,
    limit: 100,
  });
  const company = contact.companyId
    ? companies.find((c) => c.id === contact.companyId)
    : null;

  const displayName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");

  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <Link
          href="/apps/crm/contacts"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Contacts
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{displayName}</h1>
        <p className="text-sm text-slate-400">
          {[contact.email, contact.phone, contact.source].filter(Boolean).join(" · ")}
          {company ? (
            <>
              {" · "}
              <Link
                href={`/apps/crm/companies/${company.id}`}
                className="text-blue-400 hover:underline"
              >
                {company.name}
              </Link>
            </>
          ) : null}
        </p>
      </header>
      <main className="flex-1 p-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="dg-card">
            <h2 className="font-semibold text-white">Edit contact</h2>
            <div className="mt-4">
              <EditContactForm contact={contact} companies={companies} />
            </div>
            <dl className="mt-6 space-y-3 border-t border-slate-800 pt-4 text-sm">
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="text-white capitalize">{contact.status}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="text-white">
                  {new Date(contact.createdAt).toLocaleString("en-AU")}
                </dd>
              </div>
            </dl>
          </div>

          <div className="dg-card">
            <h2 className="font-semibold text-white">Timeline</h2>
            {!activities?.length ? (
              <p className="mt-3 text-sm text-slate-400">No activity yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {activities.map((activity) => (
                  <li
                    key={activity.id}
                    className="border-l-2 border-blue-600/50 pl-4"
                  >
                    <p className="font-medium text-white">{activity.title}</p>
                    {activity.body ? (
                      <p className="text-sm text-slate-400">{activity.body}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500">
                      {activity.activityType} · {activity.sourceApp ?? "platform"} ·{" "}
                      {new Date(activity.createdAt).toLocaleString("en-AU")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <AddContactNoteForm contactId={contact.id} />
          </div>
        </div>
      </main>
    </>
  );
}
