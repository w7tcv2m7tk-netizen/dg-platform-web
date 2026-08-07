import Link from "next/link";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { currentUser } from "@clerk/nextjs/server";
import { listOpportunities } from "@dg/platform-core";

export default async function CrmOpportunitiesPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
      })
    : null;

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Opportunities</h1>
          <p className="text-sm text-slate-400">CRM Core App</p>
        </header>
        <main className="dg-page-main">
          <div className="dg-card max-w-2xl">
            <p className="text-slate-300">Sign in with DATABASE_URL configured.</p>
          </div>
        </main>
      </>
    );
  }

  const { items, meta } = await listOpportunities({
    organisationId: session.organisationId,
  });

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Opportunities</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · {meta.total} opportunit
          {meta.total === 1 ? "y" : "ies"} · convert from vendor/buyer leads
        </p>
      </header>
      <main className="dg-page-main">
        <div className="dg-card">
          <p className="text-sm text-slate-400">
            Smoke path: Add lead on RE pipeline → open lead →{" "}
            <strong className="text-slate-200">Convert to opportunity</strong> → appears
            here with linked contact.
          </p>
          {items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No opportunities yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-800">
              {items.map((opp) => (
                <li key={opp.id} className="py-3">
                  <Link
                    href={`/apps/crm/opportunities/${opp.id}`}
                    className="block hover:opacity-90"
                  >
                    <p className="font-medium text-white">{opp.title}</p>
                    <p className="text-sm text-slate-400">
                      {opp.stage.replace(/_/g, " ")} · {opp.status}
                      {opp.leadId ? " · from lead" : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
