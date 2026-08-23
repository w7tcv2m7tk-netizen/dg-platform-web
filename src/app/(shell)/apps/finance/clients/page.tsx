import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { listContacts, listFinanceApplications } from "@dg/platform-core";

import { FinanceNav } from "@/components/finance/FinanceNav";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

export default async function FinanceClientsPage() {
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
          <h1 className="text-2xl font-bold text-white">Clients</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-slate-400">Sign in required.</p>
        </main>
      </>
    );
  }

  const [{ items: applications }, contacts] = await Promise.all([
    listFinanceApplications({ organisationId: session.organisationId, limit: 100 }),
    listContacts({ organisationId: session.organisationId, limit: 100 }),
  ]);

  const appsByContact = new Map<string, typeof applications>();
  for (const app of applications) {
    if (!app.contactId) continue;
    const list = appsByContact.get(app.contactId) ?? [];
    list.push(app);
    appsByContact.set(app.contactId, list);
  }

  const borrowers = contacts.items.filter((c) => appsByContact.has(c.id));
  const others = contacts.items.filter((c) => !appsByContact.has(c.id));

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Clients</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · Borrowers are Core CRM contacts with applications
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <FinanceNav active="clients" />

        <section className="dg-card">
          <h2 className="font-semibold text-white">
            Borrowers ({borrowers.length})
          </h2>
          {borrowers.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">
              No contacts linked to finance applications yet.{" "}
              <Link href="/apps/finance/applications" className="text-sky-400 hover:underline">
                Create an application
              </Link>{" "}
              and attach a contact.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-800">
              {borrowers.map((c) => {
                const label =
                  [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
                  c.email ||
                  c.id.slice(0, 8);
                const linked = appsByContact.get(c.id) ?? [];
                const primary = linked[0];
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div>
                      <p className="font-medium text-white">{label}</p>
                      <p className="text-xs text-slate-500">
                        {c.email || "No email"}
                        {c.phone ? ` · ${c.phone}` : ""}
                        {primary
                          ? ` · ${primary.stage} · ${primary.title}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {linked.length} application{linked.length === 1 ? "" : "s"}
                      </span>
                      {primary ? (
                        <Link
                          href="/apps/finance/applications"
                          className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-sky-300 hover:border-sky-600"
                        >
                          Open application
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="dg-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-white">
              Other CRM contacts ({others.length})
            </h2>
            <Link href="/apps/crm/contacts" className="text-sm text-sky-400 hover:underline">
              Open CRM →
            </Link>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Same Contact object as the rest of the platform — not a separate people list.
          </p>
          {others.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">All contacts are already borrowers.</p>
          ) : (
            <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto text-sm text-slate-400">
              {others.slice(0, 40).map((c) => {
                const label =
                  [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
                  c.email ||
                  c.id.slice(0, 8);
                return (
                  <li key={c.id}>
                    {label}
                    {c.email ? ` · ${c.email}` : ""}
                  </li>
                );
              })}
              {others.length > 40 ? (
                <li className="text-slate-600">+{others.length - 40} more</li>
              ) : null}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
