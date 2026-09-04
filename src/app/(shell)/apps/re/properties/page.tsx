import { listProperties } from "@dg/platform-core";

import { PropertyList } from "@/components/re/PropertyList";
import { CreatePropertyForm } from "@/components/re/CreatePropertyForm";
import { getPlatformPageContext } from "@/lib/platform-page-context";

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
          <p className="mt-2 max-w-xl text-xs text-emerald-400/90">
            Platform Core is the source of truth for properties and listings.
          </p>
        </div>
      </div>
      <CreatePropertyForm />
      <PropertyList properties={items} />
    </main>
  );
}
