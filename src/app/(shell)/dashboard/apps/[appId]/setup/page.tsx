import { notFound } from "next/navigation";
import { getAppSetupGuide } from "@dg/platform-core";

import { AppSetupGuideView } from "@/components/platform/AppSetupGuideView";
import { getNativeAppSetupGuide } from "@/lib/native-app-setup-guides";

interface PageProps {
  params: Promise<{ appId: string }>;
}

export default async function AppSetupPage({ params }: PageProps) {
  const { appId } = await params;
  const guide = getNativeAppSetupGuide(appId) ?? getAppSetupGuide(appId);

  if (!guide) notFound();

  return <AppSetupGuideView guide={guide} />;
}
