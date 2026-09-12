import {
  listCommercialLeases,
  listCommercialProperties,
  listContacts,
} from "@dg/platform-core";

import { CreateCommercialLeaseForm } from "@/components/commercial/CreateCommercialLeaseForm";
import { canManageCommercial } from "@/lib/commercial-page-access";
import { formatMoneyFromCents, getOrganisationMoneySettings } from "@/lib/organisation-money";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function CommercialLeasesPage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const canManage = canManageCommercial(session);
  const [{ items }, properties, contacts, money] = await Promise.all([
    listCommercialLeases(session.organisationId),
    listCommercialProperties(session.organisationId),
    canManage
      ? listContacts({ organisationId: session.organisationId, limit: 100 })
      : Promise.resolve({ items: [], meta: { total: 0, limit: 0, offset: 0 } }),
    getOrganisationMoneySettings(session.organisationId),
  ]);

  const propertyName = new Map(properties.items.map((p) => [p.id, p.name]));

  return (
    <main className="dg-page-main space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">
            {session.organisationName} · Commercial tenancies — landlords &amp; tenants on Core CRM
          </p>
          {!canManage ? (
            <p className="mt-1 text-xs text-slate-500">
              Read-only leases. Organisation-wide Commercial edit access is required to create tenancies.
            </p>
          ) : null}
        </div>
        {canManage ? (
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
            currency={money.currency}
          />
        ) : null}
      </div>
      {items.length === 0 ? (
        <div className="dg-card border-dashed border-slate-700">
          <p className="text-slate-400">
            {canManage ? "No commercial leases yet. Create the first one." : "No commercial leases yet."}
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
                  {lease.commercialPropertyId && propertyName.has(lease.commercialPropertyId)
                    ? ` · ${propertyName.get(lease.commercialPropertyId)}`
                    : ""}
                  {rent ? ` · ${rent}/yr` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
