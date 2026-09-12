import { listPmProperties } from "@dg/platform-core";

import { CreatePmPropertyForm } from "@/components/property-management/CreatePmPropertyForm";
import { canManagePropertyManagement } from "@/lib/property-management-page-access";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function PmPropertiesPage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const canManage = canManagePropertyManagement(session);
  const { items } = await listPmProperties(session.organisationId);

  return (
    <main className="dg-page-main space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">
            {session.organisationName} · Rental portfolio register
          </p>
          {!canManage ? (
            <p className="mt-1 text-xs text-slate-500">
              Read-only properties. Organisation-wide Property Management edit access is required to add portfolio records.
            </p>
          ) : null}
        </div>
        {canManage ? <CreatePmPropertyForm /> : null}
      </div>
      {items.length === 0 ? (
        <div className="dg-card border-dashed border-slate-700">
          <p className="text-slate-400">
            {canManage ? "No properties yet. Add the first rental property." : "No properties yet."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
          {items.map((p) => (
            <li key={p.id} className="px-4 py-3">
              <p className="font-medium text-white">{p.name}</p>
              <p className="text-xs text-slate-500">
                {p.addressLine1}, {p.suburb} {p.state} {p.postcode}
                {p.propertyType ? ` · ${p.propertyType}` : ""} · {p.status}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
