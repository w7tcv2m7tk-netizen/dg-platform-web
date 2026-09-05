import Link from "next/link";
import { listContacts, listCompanies,} from "@dg/platform-core";

import { CreateContactForm } from "@/components/crm/CreateContactForm";
import { ContactImportExport } from "@/components/crm/ContactImportExport";
import { CrmDeleteButton } from "@/components/crm/CrmDeleteButton";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function CrmContactsPage() {
  const session = await getAuthorisedPlatformPageSession("crm.contacts.read");

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Contacts</h1>
          <p className="mt-1 text-sm text-slate-400">
            CRM ·{" "}
            <Link href="/apps/communications" className="text-sky-400 hover:underline">
              Communications
            </Link>
            {" · "}
            <Link href="/apps/crm/timeline" className="text-sky-400 hover:underline">
              Timeline
            </Link>
          </p>
        </header>
        <main className="dg-page-main">
          <div className="dg-card max-w-2xl">
            <p className="text-slate-300">
              Sign in to view contacts for this business.
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
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Contacts</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · {meta.total} contact
          {meta.total === 1 ? "" : "s"} in Platform
          {" · "}
          <Link href="/apps/communications" className="text-sky-400 hover:underline">
            Communications
          </Link>
          {" · "}
          <Link href="/apps/crm/timeline" className="text-sky-400 hover:underline">
            Timeline
          </Link>
        </p>
      </header>
      <main className="dg-page-main">
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
                {items.map((contact) => {
                  const displayName = [contact.firstName, contact.lastName]
                    .filter(Boolean)
                    .join(" ");
                  return (
                  <li key={contact.id} className="flex items-start justify-between gap-3 py-3">
                    <Link
                      href={`/apps/crm/contacts/${contact.id}`}
                      className="dg-list-row min-w-0 flex-1 block hover:opacity-90"
                      prefetch
                    >
                      <p className="dg-break-anywhere font-medium text-white">
                        {displayName}
                      </p>
                      <p className="dg-break-anywhere text-sm text-slate-400">
                        {[contact.email, contact.phone, contact.source]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Updated{" "}
                        {new Date(contact.updatedAt).toLocaleDateString("en-AU")}
                      </p>
                    </Link>
                    <CrmDeleteButton
                      resource="contacts"
                      id={contact.id}
                      name={displayName || contact.email || "this contact"}
                      compact
                    />
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
