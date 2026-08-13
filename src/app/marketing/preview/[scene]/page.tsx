import { notFound } from "next/navigation";

import { MarketingPreviewScene } from "@/components/marketing/MarketingPreviewScene";

const SCENES = new Set([
  "overview",
  "crm",
  "ai-studio",
  "vendor-pipeline",
  "website-health",
  "ai-visibility",
]);

export default async function MarketingPreviewPage({
  params,
}: {
  params: Promise<{ scene: string }>;
}) {
  const { scene } = await params;
  if (!SCENES.has(scene)) {
    notFound();
  }

  return <MarketingPreviewScene scene={scene} />;
}
