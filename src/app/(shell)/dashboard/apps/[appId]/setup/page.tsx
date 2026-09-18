import { shouldShowIndustryApp } from "@dg/platform-core";
import { notFound, redirect } from "next/navigation";

import { AppSetupGuideView } from "@/components/platform/AppSetupGuideView";
import { getNativeAppSetupGuide } from "@/lib/native-app-setup-guides";
import {
  getOrgEnabledAppIdsCached,
  getOrgIndustrySelectionIdsCached,
} from "@/lib/org-apps";

interface PageProps {
  params: Promise<{ appId: string }>;
}

export default async function AppSetupPage({ params }: PageProps) {
  const { appId } = await params;
  const guide = getNativeAppSetupGuide(appId);

  if (!guide) notFound();

  const [enabledIds, industrySelectionIds] = await Promise.all([
    getOrgEnabledAppIdsCached(),
    getOrgIndustrySelectionIdsCached(),
  ]);

  if (!enabledIds.includes(appId)) {
    redirect("/dashboard/apps");
  }

  const selectedForOrganisation = shouldShowIndustryApp(appId, {
    gen2Onboarding: {
      operatingProfile: {
        templates: industrySelectionIds,
      },
    },
  });

  // shouldShowIndustryApp is permissive for non-Industry Apps, so this only
  // narrows setup access where an Industry App needs a matching business type.
  if (!selectedForOrganisation) {
    redirect("/dashboard/apps");
  }

  return <AppSetupGuideView guide={guide} />;
}
