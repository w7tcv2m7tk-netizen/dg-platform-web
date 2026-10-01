import { shouldShowIndustryApp } from "@dg/platform-core";
import { redirect } from "next/navigation";
import { IndustrySectionIdentity } from "@/components/industry/IndustrySectionIdentity";

import { getOrgEnabledAppIdsCached, getOrgIndustrySelectionIdsCached } from "@/lib/org-apps";
import { resolveSelectedIndustryIdentity } from "@/lib/industry-app-identity";

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const [enabledIds, industrySelectionIds] = await Promise.all([
    getOrgEnabledAppIdsCached(),
    getOrgIndustrySelectionIdsCached(),
  ]);
  const selectedForOrganisation = shouldShowIndustryApp("creator", {
    gen2Onboarding: { operatingProfile: { templates: industrySelectionIds } },
  });

  if (!enabledIds.includes("creator") || !selectedForOrganisation) {
    redirect("/dashboard/apps");
  }
  const identity = resolveSelectedIndustryIdentity("creator", industrySelectionIds, "Creator");
  return <><IndustrySectionIdentity mount="creator" appName={identity.title} />{children}</>;
}
