import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { listCommercialTenantContacts } from "@dg/platform-core";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";

export default async function CommercialTenantsPage() {
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
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const { items } = await listCommercialTenantContacts(session.organisationId);

  return (
    <main className="dg-page-main space-y-4">
      <p className="text-sm text-slate-400">
        CRM Contacts linked as tenants on commercial leases
      </p>
      {items.length === 0 ? (
        <div className="dg-card border-dashed border-slate-700">
          <p className="text-slate-400">
            No tenants yet.{" "}
            <Link href="/apps/commercial/leases" className="text-sky-400 hover:underline">
              Create a lease
            </Link>{" "}
            and attach a tenant Contact.
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
        <Link href="/apps/crm/contacts" className="text-sky-400 hover:underline">
          Open CRM Contacts →
        </Link>
      </p>
    </main>
  );
}
