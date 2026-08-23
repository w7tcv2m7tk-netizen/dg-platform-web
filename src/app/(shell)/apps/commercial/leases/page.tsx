import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  listCommercialLeases,
  listCommercialProperties,
  listContacts,
} from "@dg/platform-core";

import { CommercialNav } from "@/components/commercial/CommercialNav";
import { CreateCommercialLeaseForm } from "@/components/commercial/CreateCommercialLeaseForm";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

export default async function CommercialLeasesPage() {
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
          <h1 className="text-2xl font-bold text-white">Leases</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-slate-400">Sign in required.</p>
        </main>
      </>
    );
  }

  const [{ items }, properties, contacts] = await Promise.all([
    listCommercialLeases(session.organisationId),
    listCommercialProperties(session.organisationId),
    listContacts({ organisationId: session.organisationId, limit: 100 }),
  ]);

  const propertyName = new Map(properties.items.map((p) => [p.id, p.name]));

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/commercial" className="text-sm text-sky-400 hover:underline">
          ← Commercial Property
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Leases</h1>
            <p className="text-sm text-slate-400">
              Commercial tenancies — landlords &amp; tenants on Core CRM
            </p>
          </div>
          <CreateCommercialLeaseForm
            properties={properties.items.map((p) => ({
              id: p.id,
              label: `${p.name} — ${p.suburb}`,
            }))}
            contacts={contacts.items.map((c) => ({
              id: c.id,
              label:
                [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
                c.email ||
                c.id.slice(0, 8),
            }))}
          />
        </div>
      </header>
      <main className="dg-page-main space-y-4">
        <CommercialNav active="leases" />
        {items.length === 0 ? (
          <div className="dg-card border-dashed border-slate-700">
            <p className="text-slate-400">No commercial leases yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
            {items.map((lease) => (
              <li key={lease.id} className="px-4 py-3">
                <p className="font-medium text-white">{lease.title}</p>
                <p className="text-xs text-slate-500">
                  {lease.stage} · {lease.status}
                  {lease.commercialPropertyId &&
                  propertyName.has(lease.commercialPropertyId)
                    ? ` · ${propertyName.get(lease.commercialPropertyId)}`
                    : ""}
                  {lease.rentCents != null
                    ? ` · $${(lease.rentCents / 100).toLocaleString("en-AU")}/yr`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
