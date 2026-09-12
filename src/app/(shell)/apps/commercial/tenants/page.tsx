import Link from "next/link";
import { listCommercialTenantContacts } from "@dg/platform-core";

import { canManageCommercial } from "@/lib/commercial-page-access";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function CommercialTenantsPage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const { items } = await listCommercialTenantContacts(session.organisationId);
  const canManage = canManageCommercial(session);

  return (
    <main className="dg-page-main space-y-4">
      <div>
        <p className="text-sm text-slate-400">
          {session.organisationName} · CRM Contacts linked as tenants on commercial leases
        </p>
        {!canManage ? (
          <p className="mt-1 text-xs text-slate-500">
            Read-only tenant view. Commercial lease changes require organisation-wide edit access.
          </p>
        ) : null}
      </div>
      {items.length === 0 ? (
        <div className="dg-card border-dashed border-slate-700">
          <p className="text-slate-400">
            No tenants yet.{" "}
            <Link
              href="/apps/commercial/leases"
              className="inline-flex min-h-11 items-center text-sky-400 hover:underline"
            >
              {canManage ? "Open leases" : "View leases"}
            </Link>{" "}
            to see tenant-linked tenancy records.
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
