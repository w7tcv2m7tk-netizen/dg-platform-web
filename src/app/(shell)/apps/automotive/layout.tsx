import { shouldShowIndustryApp } from "@dg/platform-core";
import { redirect } from "next/navigation";
import { IndustrySectionIdentity } from "@/components/industry/IndustrySectionIdentity";

import { getOrgEnabledAppIdsCached, getOrgIndustrySelectionIdsCached } from "@/lib/org-apps";
import { resolveSelectedIndustryIdentity } from "@/lib/industry-app-identity";

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
  const identity = resolveSelectedIndustryIdentity("automotive", industrySelectionIds, "Automotive");
  return <><IndustrySectionIdentity mount="automotive" appName={identity.title} />{children}</>;
}
