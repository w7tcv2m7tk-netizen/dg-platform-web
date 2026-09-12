import Link from "next/link";
import { listPmPartyContacts } from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function PmTenantsPage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const { items } = await listPmPartyContacts(session.organisationId, "tenant");

  return (
    <main className="dg-page-main space-y-4">
      <p className="text-sm text-slate-400">
        {session.organisationName} · CRM Contacts linked as tenants on Property Management leases
      </p>
      {items.length === 0 ? (
        <div className="dg-card border-dashed border-slate-700">
          <p className="text-slate-400">
            No tenants yet. Link a tenant Contact from a Property Management lease.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
          {items.map((c) => {
            const label =
              [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
              c.email ||
              c.contactId.slice(0, 8);
            return (
              <li key={c.contactId} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">{label}</p>
                    <p className="text-xs text-slate-500">
                      {c.email || "No email"}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {c.leaseCount} lease{c.leaseCount === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {c.leases.map((l) => l.title).join(" · ")}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-sm text-slate-500">
        <Link
          href="/apps/crm/contacts"
          className="inline-flex min-h-11 items-center text-sky-400 hover:underline"
        >
          Open CRM Contacts →
        </Link>
      </p>
    </main>
  );
}
