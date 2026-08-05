import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { listContacts, listCompanies, resolvePlatformSession } from "@dg/platform-core";

import { CreateContactForm } from "@/components/crm/CreateContactForm";
import { ContactImportExport } from "@/components/crm/ContactImportExport";

export default async function CrmContactsPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const session = user?.id
    ? await resolvePlatformSession({
        clerkUserId: user.id,
        email,
        name,
      })
    : null;

  if (!session) {
    return (
      <>
        <header className="border-b border-slate-800 px-8 py-5">
          <h1 className="text-2xl font-bold text-white">Contacts</h1>
          <p className="text-sm text-slate-400">CRM Core App</p>
        </header>
        <main className="flex-1 p-8">
          <div className="dg-card max-w-2xl">
            <p className="text-slate-300">
              Connect{" "}
              <code className="text-blue-300">DATABASE_URL</code> to enable
              Platform 1.0 CRM. Add your Neon Postgres URL to{" "}
              <code className="text-blue-300">.env.local</code>, run{" "}
              <code className="text-blue-300">npm run db:push</code>, then
              refresh.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
            >
              ← Back to overview
            </Link>
          </div>
        </main>
      </>
    );
  }

  const { items, meta } = await listContacts({
    organisationId: session.organisationId,
  });
  const { items: companies } = await listCompanies({
    organisationId: session.organisationId,
    limit: 100,
  });

  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <h1 className="text-2xl font-bold text-white">Contacts</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · {meta.total} contact
          {meta.total === 1 ? "" : "s"} in Platform
        </p>
      </header>
      <main className="flex-1 p-8">
        <div className="mb-6">
          <ContactImportExport />
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="dg-card">
            <h2 className="font-semibold text-white">Add contact</h2>
            <p className="mt-1 text-sm text-slate-400">
              Stored in Postgres — audit logged, timeline event emitted.
            </p>
            <div className="mt-4">
              <CreateContactForm companies={companies} />
            </div>
          </div>

          <div className="dg-card lg:col-span-1">
            <h2 className="font-semibold text-white">All contacts</h2>
            {items.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                No contacts yet. Add your first contact above.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-800">
                {items.map((contact) => (
                  <li key={contact.id} className="py-3">
                    <Link
                      href={`/apps/crm/contacts/${contact.id}`}
                      className="block hover:opacity-90"
                    >
                      <p className="font-medium text-white">
                        {[contact.firstName, contact.lastName]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                      <p className="text-sm text-slate-400">
                        {[contact.email, contact.phone, contact.source]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Updated{" "}
                        {new Date(contact.updatedAt).toLocaleDateString("en-AU")}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
