import { listLeads } from "@dg/platform-core";

import { BuyerLeadPipeline } from "@/components/re/BuyerLeadPipeline";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function BuyerLeadsPage() {
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
    leadType: "buyer",
  });

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {session.organisationName} · Property enquiry pipeline
        </p>
      </div>
      <BuyerLeadPipeline leads={items} />
    </main>
  );
}
