import { organisationHasReBeta, shouldShowIndustryApp } from "@dg/platform-core";
import { IndustrySectionIdentity } from "@/components/industry/IndustrySectionIdentity";

import { ReBetaGateMessage } from "@/components/re/ReBetaChecklist";
import { getOrgIndustrySelectionIdsCached } from "@/lib/org-apps";
import { resolveSelectedIndustryIdentity } from "@/lib/industry-app-identity";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function ReAppLayout({ children }: { children: React.ReactNode }) {
  const { session } = await getPlatformPageContext();
  if (!session || !process.env.DATABASE_URL) return children;

  const [allowed, industrySelectionIds] = await Promise.all([
    organisationHasReBeta(session.organisationId),
    getOrgIndustrySelectionIdsCached(),
  ]);
  const selectedForOrganisation = shouldShowIndustryApp("real-estate", {
    gen2Onboarding: { operatingProfile: { templates: industrySelectionIds } },
  });

  if (allowed && selectedForOrganisation) {
    const identity = resolveSelectedIndustryIdentity("real-estate", industrySelectionIds, "Real Estate");
    return <><IndustrySectionIdentity mount="re" appName={identity.title} />{children}</>;
  }
  if (!allowed) return <main className="dg-page-main"><ReBetaGateMessage /></main>;

  return <main className="dg-page-main"><div className="dg-card space-y-3"><p className="font-medium text-white">App not active for this business</p><p className="text-sm text-slate-400">Real Estate is not one of the business types selected for this organisation.</p></div></main>;
}
