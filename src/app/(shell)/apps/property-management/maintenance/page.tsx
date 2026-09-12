import {
  listContacts,
  listPmMaintenance,
  listPmProperties,
} from "@dg/platform-core";

import { CreatePmMaintenanceForm } from "@/components/property-management/CreatePmMaintenanceForm";
import { canManagePropertyManagement } from "@/lib/property-management-page-access";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function PmMaintenancePage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const canManage = canManagePropertyManagement(session);
  const [{ items }, properties, contacts] = await Promise.all([
    listPmMaintenance(session.organisationId),
    listPmProperties(session.organisationId),
    canManage
      ? listContacts({ organisationId: session.organisationId, limit: 100 })
      : Promise.resolve({ items: [], meta: { total: 0, limit: 0, offset: 0 } }),
  ]);

  const propertyLabel = new Map(
    properties.items.map((p) => [p.id, `${p.name} — ${p.suburb}`]),
  );

  return (
    <main className="dg-page-main space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">
            {session.organisationName} · Maintenance requests linked to rental properties
          </p>
          {!canManage ? (
            <p className="mt-1 text-xs text-slate-500">
              Read-only maintenance. Organisation-wide Property Management edit access is required to create or update requests.
            </p>
          ) : null}
        </div>
        {canManage ? (
          <CreatePmMaintenanceForm
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
        ) : null}
      </div>
      {items.length === 0 ? (
        <div className="dg-card border-dashed border-slate-700">
          <p className="text-slate-400">
            {canManage ? "No maintenance requests yet. Create the first request." : "No maintenance requests yet."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
          {items.map((r) => (
            <li key={r.id} className="px-4 py-3">
              <p className="font-medium text-white">{r.title}</p>
              <p className="text-xs text-slate-500">
                {r.status} · {r.priority}
                {r.propertyId && propertyLabel.has(r.propertyId)
                  ? ` · ${propertyLabel.get(r.propertyId)}`
                  : ""}
              </p>
              {r.notes ? (
                <p className="mt-1 text-sm text-slate-400">{r.notes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
