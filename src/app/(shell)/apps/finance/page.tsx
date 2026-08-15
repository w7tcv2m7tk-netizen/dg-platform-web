import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { listContacts, listFinanceApplications } from "@dg/platform-core";

import { FinanceNav } from "@/components/finance/FinanceNav";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

export default async function FinanceOverviewPage() {
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
          <h1 className="text-2xl font-bold text-white">Finance</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-slate-400">Sign in required.</p>
        </main>
      </>
    );
  }

  const [{ items, meta }, contacts] = await Promise.all([
    listFinanceApplications({ organisationId: session.organisationId, limit: 100 }),
    listContacts({ organisationId: session.organisationId, limit: 100 }),
  ]);

  const byStage = new Map<string, number>();
  for (const app of items) {
    const stage = app.stage || "enquiry";
    byStage.set(stage, (byStage.get(stage) ?? 0) + 1);
  }
  const open = items.filter((a) => a.status === "open");
  const borrowerIds = new Set(
    items.map((a) => a.contactId).filter((id): id is string => Boolean(id)),
  );

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Finance</h1>
        <p className="mt-1 text-sm text-slate-400">
          {session.organisationName} · Broker loan pipeline on Core CRM contacts
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <FinanceNav active="overview" />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Applications</p>
            <p className="mt-1 text-2xl font-semibold text-white">{meta.total}</p>
          </div>
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Open</p>
            <p className="mt-1 text-2xl font-semibold text-white">{open.length}</p>
          </div>
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Borrowers linked</p>
            <p className="mt-1 text-2xl font-semibold text-white">{borrowerIds.size}</p>
          </div>
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">CRM contacts</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {contacts.meta.total}
            </p>
          </div>
        </div>

        <section className="dg-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-white">Pipeline by stage</h2>
            <Link href="/apps/finance/pipeline" className="text-sm text-sky-400 hover:underline">
              Open pipeline →
            </Link>
          </div>
          {byStage.size === 0 ? (
            <p className="mt-3 text-sm text-slate-400">
              No applications yet.{" "}
              <Link href="/apps/finance/applications" className="text-sky-400 hover:underline">
                Create the first one
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[...byStage.entries()].map(([stage, count]) => (
                <li
                  key={stage}
                  className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-sm"
                >
                  <span className="capitalize text-slate-300">{stage.replace(/_/g, " ")}</span>
                  <span className="font-medium text-white">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Recent applications</h2>
          {items.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">Nothing in the pipeline yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-800">
              {items.slice(0, 8).map((app) => (
                <li key={app.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="font-medium text-white">{app.title}</p>
                    <p className="text-xs text-slate-500">
                      {app.stage} · {app.status}
                      {app.lenderName ? ` · ${app.lenderName}` : ""}
                    </p>
                  </div>
                  {app.loanAmountCents != null ? (
                    <p className="text-sm text-slate-300">
                      ${(app.loanAmountCents / 100).toLocaleString("en-AU")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/apps/finance/applications"
              className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 hover:bg-blue-500/15"
            >
              Manage applications
            </Link>
            <Link
              href="/apps/finance/clients"
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-600"
            >
              View clients
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
