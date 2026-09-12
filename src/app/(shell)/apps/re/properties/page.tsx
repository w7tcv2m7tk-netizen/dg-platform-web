import { listProperties } from "@dg/platform-core";

import { PropertyList } from "@/components/re/PropertyList";
import { CreatePropertyForm } from "@/components/re/CreatePropertyForm";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import { canManageRealEstate } from "@/lib/real-estate-page-access";

export default async function PropertiesPage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const { items } = await listProperties({ organisationId: session.organisationId });
  const canManage = canManageRealEstate(session);

  const appraisalCount = items.filter((p) => p.status === "appraisal").length;
  const listedCount = items.filter((p) => p.status === "listed").length;

  return (
    <main className="dg-page-main space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">
            {session.organisationName} · Appraisals & listings
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {appraisalCount} in appraisal · {listedCount} listed · {items.length} total
          </p>
          {!canManage ? (
            <p className="mt-2 max-w-xl text-xs text-slate-500">
              Read-only properties. Organisation-wide Real Estate edit access is required to create or update listings.
            </p>
          ) : null}
        </div>
      </div>
      {canManage ? <CreatePropertyForm /> : null}
      <PropertyList properties={items} canManage={canManage} />
    </main>
  );
}
