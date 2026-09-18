import { shouldShowIndustryApp } from "@dg/platform-core";

import { AccBetaGateMessage } from "@/components/accommodation/AccBetaChecklist";
import { checkAccBetaAccess } from "@/lib/acc-beta-access";
import { getOrgIndustrySelectionIdsCached } from "@/lib/org-apps";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function AccommodationAppLayout({ children }: { children: React.ReactNode }) {
  const { session } = await getPlatformPageContext();
  if (!session || !process.env.DATABASE_URL) return children;

  const [{ allowed }, industrySelectionIds] = await Promise.all([
    checkAccBetaAccess(session.organisationId),
    getOrgIndustrySelectionIdsCached(),
  ]);
  const selectedForOrganisation = shouldShowIndustryApp("accommodation", {
    gen2Onboarding: { operatingProfile: { templates: industrySelectionIds } },
  });

  if (allowed && selectedForOrganisation) return children;
  if (!allowed) return <main className="dg-page-main"><AccBetaGateMessage /></main>;

  return <main className="dg-page-main"><div className="dg-card space-y-3"><p className="font-medium text-white">App not active for this business</p><p className="text-sm text-slate-400">Accommodation is not one of the business types selected for this organisation.</p></div></main>;
}
