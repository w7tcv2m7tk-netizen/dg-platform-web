import { listLeads } from "@dg/platform-core";

import { VendorLeadPipeline } from "@/components/re/VendorLeadPipeline";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import {
  canCreateOrganisationLeads,
  canEditOrganisationLeads,
} from "@/lib/real-estate-page-access";

export default async function VendorLeadsPage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const { items } = await listLeads({
    organisationId: session.organisationId,
    leadType: "vendor",
  });
  const canCreate = canCreateOrganisationLeads(session);
  const canEdit = canEditOrganisationLeads(session);

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {session.organisationName} · Vendor pipeline
        </p>
        {!canCreate && !canEdit ? (
          <p className="mt-1 text-xs text-slate-500">
            Read-only pipeline. Organisation-wide CRM lead access is required to create or move leads.
          </p>
        ) : null}
      </div>
      <VendorLeadPipeline leads={items} canCreate={canCreate} canEdit={canEdit} />
    </main>
  );
}
