import { listCommercialProperties } from "@dg/platform-core";

import { CreateCommercialPropertyForm } from "@/components/commercial/CreateCommercialPropertyForm";
import { canManageCommercial } from "@/lib/commercial-page-access";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function CommercialPropertiesPage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const [{ items }, canManage] = await Promise.all([
    listCommercialProperties(session.organisationId),
    Promise.resolve(canManageCommercial(session)),
  ]);

  return (
    <main className="dg-page-main space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">
            {session.organisationName} · Commercial asset register — separate from Real Estate sales
          </p>
          {!canManage ? (
            <p className="mt-1 text-xs text-slate-500">
              Read-only register. Organisation-wide Commercial edit access is required to add properties.
            </p>
          ) : null}
        </div>
        {canManage ? <CreateCommercialPropertyForm /> : null}
      </div>
      {items.length === 0 ? (
        <div className="dg-card border-dashed border-slate-700">
          <p className="text-slate-400">
            {canManage ? "No commercial properties yet. Add the first one." : "No commercial properties yet."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
          {items.map((p) => (
            <li key={p.id} className="px-4 py-3">
              <p className="font-medium text-white">{p.name}</p>
              <p className="text-xs text-slate-500">
                {p.addressLine1}, {p.suburb} {p.state} {p.postcode}
                {p.propertyType ? ` · ${p.propertyType}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
