import Link from "next/link";
import { listContacts, listFinanceApplications } from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function FinanceClientsPage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
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
    <main className="dg-page-main space-y-6">
      <p className="text-sm text-slate-400">
        {session.organisationName} · Borrowers are Core CRM contacts with applications
      </p>

      <section className="dg-card">
        <h2 className="font-semibold text-white">Borrowers ({borrowers.length})</h2>
        {borrowers.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">
            No contacts linked to finance applications yet.{" "}
            <Link
              href="/apps/finance/applications"
              className="inline-flex min-h-11 items-center text-sky-400 hover:underline"
            >
              Open applications
            </Link>
            .
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
                      {primary ? ` · ${primary.stage} · ${primary.title}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {linked.length} application{linked.length === 1 ? "" : "s"}
                    </span>
                    {primary ? (
                      <Link
                        href="/apps/finance/applications"
                        className="inline-flex min-h-11 items-center rounded-lg border border-slate-700 px-3 py-2 text-xs text-sky-300 hover:border-sky-600"
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
          <h2 className="font-semibold text-white">Other CRM contacts ({others.length})</h2>
          <Link
            href="/apps/crm/contacts"
            className="inline-flex min-h-11 items-center text-sm text-sky-400 hover:underline"
          >
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
                <li key={c.id} className="py-1">
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
  );
}
