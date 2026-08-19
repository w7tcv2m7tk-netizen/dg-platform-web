import Link from "next/link";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { currentUser } from "@clerk/nextjs/server";
import { listCompanies,} from "@dg/platform-core";

import { CreateCompanyForm } from "@/components/crm/CreateCompanyForm";
import { CrmDeleteButton } from "@/components/crm/CrmDeleteButton";

export default async function CrmCompaniesPage() {
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
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Companies</h1>
        </header>
        <main className="dg-page-main">
          <div className="dg-card max-w-2xl">
            <p className="text-slate-300">Configure DATABASE_URL to enable Companies.</p>
          </div>
        </main>
      </>
    );
  }

  const { items, meta } = await listCompanies({ organisationId: session.organisationId });

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/crm/contacts" className="text-sm text-blue-400 hover:underline">
          ← CRM
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Companies</h1>
        <p className="text-sm text-slate-400">
          {meta.total} compan{meta.total === 1 ? "y" : "ies"} · B2B accounts linked to contacts
        </p>
      </header>
      <main className="dg-page-main">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="dg-card">
            <h2 className="font-semibold text-white">Add company</h2>
            <p className="mt-1 text-sm text-slate-400">
              Group contacts under a business account for pipeline and reporting.
            </p>
            <div className="mt-4">
              <CreateCompanyForm />
            </div>
          </div>

          <div className="dg-card">
            <h2 className="font-semibold text-white">All companies</h2>
            {items.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">No companies yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-800">
                {items.map((company) => (
                  <li key={company.id} className="flex items-start justify-between gap-3 py-3">
                    <Link
                      href={`/apps/crm/companies/${company.id}`}
                      className="min-w-0 flex-1 block hover:opacity-90"
                    >
                      <p className="font-medium text-white">{company.name}</p>
                      <p className="text-sm text-slate-400">
                        {[company.industry, company.email, company.phone]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {company.contactCount} contact{company.contactCount === 1 ? "" : "s"}
                      </p>
                    </Link>
                    <CrmDeleteButton
                      resource="companies"
                      id={company.id}
                      name={company.name}
                      compact
                    />
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
