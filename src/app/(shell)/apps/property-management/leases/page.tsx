import { currentUser } from "@clerk/nextjs/server";
import { listContacts, listPmLeases, listPmProperties } from "@dg/platform-core";

import { CreatePmLeaseForm } from "@/components/property-management/CreatePmLeaseForm";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

export default async function PmLeasesPage() {
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

  const [{ items }, contacts, properties] = await Promise.all([
    listPmLeases(session.organisationId),
    listContacts({ organisationId: session.organisationId, limit: 100 }),
    listPmProperties(session.organisationId),
  ]);

  const contactOptions = contacts.items.map((c) => ({
    id: c.id,
    label:
      [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
      c.email ||
      c.id.slice(0, 8),
  }));

  const propertyOptions = properties.items.map((p) => ({
    id: p.id,
    label: `${p.name} — ${p.suburb}`,
  }));

  return (
    <main className="dg-page-main space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-slate-400">
          Long-term rentals — owners &amp; tenants on Core CRM
        </p>
        <CreatePmLeaseForm contacts={contactOptions} properties={propertyOptions} />
      </div>
      {items.length === 0 ? (
        <div className="dg-card border-dashed border-slate-700">
          <p className="text-slate-400">No leases yet. Create the first PM lease.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
          {items.map((lease) => (
            <li key={lease.id} className="px-4 py-3">
              <p className="font-medium text-white">{lease.title}</p>
              <p className="text-xs text-slate-500">
                {lease.stage} · {lease.status}
                {lease.suburb ? ` · ${lease.suburb}` : ""}
                {lease.rentCents != null
                  ? ` · $${(lease.rentCents / 100).toLocaleString("en-AU")}/wk`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
