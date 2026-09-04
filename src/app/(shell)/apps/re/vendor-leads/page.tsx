import { listLeads } from "@dg/platform-core";

import { VendorLeadPipeline } from "@/components/re/VendorLeadPipeline";
import { getPlatformPageContext } from "@/lib/platform-page-context";

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

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {session.organisationName} · Vendor pipeline on Platform
        </p>
      </div>
      <VendorLeadPipeline leads={items} />
    </main>
  );
}
