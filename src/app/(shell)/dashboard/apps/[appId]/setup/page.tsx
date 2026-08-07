import { notFound } from "next/navigation";
import { getAppSetupGuide } from "@dg/platform-core";

import { AppSetupGuideView } from "@/components/platform/AppSetupGuideView";

interface PageProps {
  params: Promise<{ appId: string }>;
}

export default async function AppSetupPage({ params }: PageProps) {
  const { appId } = await params;
  const guide = getAppSetupGuide(appId);

  if (!guide) notFound();

  return <AppSetupGuideView guide={guide} />;
}
