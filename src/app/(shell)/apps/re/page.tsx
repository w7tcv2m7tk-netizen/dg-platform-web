import { getReDashboardStats } from "@dg/platform-core";

import { ReDashboard } from "@/components/re/ReDashboard";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import { IndustryAppTitle } from "@/components/industry/IndustryAppTitle";
import { getOrgIndustrySelectionIdsCached } from "@/lib/org-apps";
import { resolveSelectedIndustryIdentity } from "@/lib/industry-app-identity";

export default async function RealEstateOverviewPage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const [stats, selectionIds] = await Promise.all([getReDashboardStats(session.organisationId), getOrgIndustrySelectionIdsCached()]);
  const identity = resolveSelectedIndustryIdentity("real-estate", selectionIds, "Real Estate");

  return (
    <>
      <IndustryAppTitle title={identity.title} eyebrow={identity.eyebrow} description="Prospecting, appraisals, vendors, buyers and property pipelines for real estate teams." />
      <main className="dg-page-main space-y-6">
      <ReDashboard stats={stats} />
      </main>
    </>
  );
}
