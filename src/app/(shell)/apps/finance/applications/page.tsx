import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { listContacts, listFinanceApplications } from "@dg/platform-core";

import { CreateFinanceApplicationForm } from "@/components/finance/CreateFinanceApplicationForm";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

export default async function FinanceApplicationsPage() {
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
          <h1 className="text-2xl font-bold text-white">Applications</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-slate-400">Sign in required.</p>
        </main>
      </>
    );
  }

  const [{ items }, contacts] = await Promise.all([
    listFinanceApplications({ organisationId: session.organisationId }),
    listContacts({ organisationId: session.organisationId, limit: 100 }),
  ]);

  const contactOptions = contacts.items.map((c) => ({
    id: c.id,
    label:
      [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
      c.email ||
      c.id.slice(0, 8),
  }));

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/finance" className="text-sm text-sky-400 hover:underline">
          ← Finance
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Applications</h1>
            <p className="text-sm text-slate-400">
              Broker loan applications on Core CRM contacts · Track C floor
            </p>
          </div>
          <CreateFinanceApplicationForm contacts={contactOptions} />
        </div>
      </header>
      <main className="dg-page-main space-y-4">
        {items.length === 0 ? (
          <div className="dg-card border-dashed border-slate-700">
            <p className="text-slate-400">No applications yet. Create the first one.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
            {items.map((app) => (
              <li key={app.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="font-medium text-white">{app.title}</p>
                  <p className="text-xs text-slate-500">
                    {app.stage} · {app.status}
                    {app.lenderName ? ` · ${app.lenderName}` : ""}
                    {app.loanAmountCents != null
                      ? ` · $${(app.loanAmountCents / 100).toLocaleString("en-AU")}`
                      : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
