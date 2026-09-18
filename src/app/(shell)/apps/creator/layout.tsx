import { shouldShowIndustryApp } from "@dg/platform-core";
import { redirect } from "next/navigation";

import { getOrgEnabledAppIdsCached, getOrgIndustrySelectionIdsCached } from "@/lib/org-apps";

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
  return children;
}
