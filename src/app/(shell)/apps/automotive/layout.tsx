import { shouldShowIndustryApp } from "@dg/platform-core";
import { redirect } from "next/navigation";

import { getOrgEnabledAppIdsCached, getOrgIndustrySelectionIdsCached } from "@/lib/org-apps";

export default async function AutomotiveLayout({ children }: { children: React.ReactNode }) {
  const [enabledIds, industrySelectionIds] = await Promise.all([
    getOrgEnabledAppIdsCached(),
    getOrgIndustrySelectionIdsCached(),
  ]);
  const selectedForOrganisation = shouldShowIndustryApp("automotive", {
    gen2Onboarding: { operatingProfile: { templates: industrySelectionIds } },
  });

  if (!enabledIds.includes("automotive") || !selectedForOrganisation) {
    redirect("/dashboard/apps");
  }
  return children;
}
