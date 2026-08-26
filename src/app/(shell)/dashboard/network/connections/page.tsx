import Link from "next/link";
import { listCompanies } from "@dg/platform-core";
import { currentUser } from "@clerk/nextjs/server";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

export default async function NetworkConnectionsPage() {
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

  const companies = session
    ? (
        await listCompanies({
          organisationId: session.organisationId,
          limit: 40,
        })
      ).items
    : [];

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Connections</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Businesses and partners you&apos;re connected with — your network, not DigitalGate&apos;s
          partner administration.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to view your connections.</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="dg-card border-dashed">
            <p className="text-sm text-slate-400">
              No connected businesses yet. Referrals and CRM companies appear here as your network
              grows.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link href="/dashboard/network/referrals" className="text-sky-400 hover:underline">
                View Referrals →
              </Link>
              <Link href="/apps/crm/companies" className="text-sky-400 hover:underline">
                CRM Companies →
              </Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
            {companies.map((company) => (
              <li key={company.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{company.name}</p>
                  {company.industry ? (
                    <p className="truncate text-xs text-slate-500">{company.industry}</p>
                  ) : null}
                </div>
                <Link
                  href={`/apps/crm/companies/${company.id}`}
                  className="shrink-0 text-sm text-sky-400 hover:underline"
                >
                  Open →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
