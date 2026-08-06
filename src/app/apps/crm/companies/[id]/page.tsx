import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import {
  getCompany,
  listCompanyContacts,
  resolvePlatformSession,
} from "@dg/platform-core";

import { EditCompanyForm } from "@/components/crm/EditCompanyForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: PageProps) {
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

  if (!session) notFound();

  const company = await getCompany(session.organisationId, id);
  if (!company) notFound();

  const contacts = await listCompanyContacts(session.organisationId, id);

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/crm/companies" className="text-sm text-blue-400 hover:underline">
          ← Companies
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{company.name}</h1>
        <p className="text-sm text-slate-400">
          {[company.industry, company.email, company.website].filter(Boolean).join(" · ")}
        </p>
      </header>
      <main className="dg-page-main">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="dg-card">
            <h2 className="font-semibold text-white">Edit company</h2>
            <div className="mt-4">
              <EditCompanyForm company={company} />
            </div>
          </div>

          <div className="dg-card">
            <h2 className="font-semibold text-white">Contacts</h2>
            {!contacts?.length ? (
              <p className="mt-3 text-sm text-slate-400">
                No contacts linked yet — assign companyId when creating or editing a contact.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-800">
                {contacts.map((contact) => (
                  <li key={contact.id} className="py-3">
                    <Link
                      href={`/apps/crm/contacts/${contact.id}`}
                      className="font-medium text-blue-400 hover:underline"
                    >
                      {[contact.firstName, contact.lastName].filter(Boolean).join(" ")}
                    </Link>
                    <p className="text-sm text-slate-400">
                      {[contact.email, contact.phone].filter(Boolean).join(" · ")}
                    </p>
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
