import { listContacts, listPmLeases, listPmProperties } from "@dg/platform-core";

import { CreatePmLeaseForm } from "@/components/property-management/CreatePmLeaseForm";
import { formatMoneyFromCents, getOrganisationMoneySettings } from "@/lib/organisation-money";
import { canManagePropertyManagement } from "@/lib/property-management-page-access";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function PmLeasesPage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const canManage = canManagePropertyManagement(session);
  const [{ items }, contacts, properties, money] = await Promise.all([
    listPmLeases(session.organisationId),
    canManage
      ? listContacts({ organisationId: session.organisationId, limit: 100 })
      : Promise.resolve({ items: [], meta: { total: 0, limit: 0, offset: 0 } }),
    listPmProperties(session.organisationId),
    getOrganisationMoneySettings(session.organisationId),
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
        <div>
          <p className="text-sm text-slate-400">
            {session.organisationName} · Long-term rentals — owners &amp; tenants on Core CRM
          </p>
          {!canManage ? (
            <p className="mt-1 text-xs text-slate-500">
              Read-only leases. Organisation-wide Property Management edit access is required to create tenancies.
            </p>
          ) : null}
        </div>
        {canManage ? (
          <CreatePmLeaseForm
            contacts={contactOptions}
            properties={propertyOptions}
            currency={money.currency}
          />
        ) : null}
      </div>
      {items.length === 0 ? (
        <div className="dg-card border-dashed border-slate-700">
          <p className="text-slate-400">
            {canManage ? "No leases yet. Create the first property management lease." : "No leases yet."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
          {items.map((lease) => {
            const rent = formatMoneyFromCents(lease.rentCents, money);
            return (
              <li key={lease.id} className="px-4 py-3">
                <p className="font-medium text-white">{lease.title}</p>
                <p className="text-xs text-slate-500">
                  {lease.stage} · {lease.status}
                  {lease.suburb ? ` · ${lease.suburb}` : ""}
                  {rent ? ` · ${rent}/wk` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
