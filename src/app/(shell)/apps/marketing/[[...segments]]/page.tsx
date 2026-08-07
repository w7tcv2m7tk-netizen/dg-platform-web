import { AppFeaturePlaceholder } from "@/components/platform/AppFeaturePlaceholder";

interface PageProps {
  params: Promise<{ segments?: string[] }>;
}

export default async function MarketingPlaceholderPage({ params }: PageProps) {
  const { segments } = await params;
  const href = "/apps/marketing" + (segments?.length ? `/${segments.join("/")}` : "");

  return <AppFeaturePlaceholder href={href} />;
}
