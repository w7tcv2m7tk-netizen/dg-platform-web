import { notFound } from "next/navigation";

import { ProspectingDiscoverySurface } from "@/components/prospecting/ProspectingDiscoverySurface";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    industry?: string;
    location?: string;
    archived?: string;
    mode?: string;
  }>;
}

export default async function ProspectingDiscoveryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getAuthorisedPlatformPageSession("prospecting.prospects.read");
  if (!session) notFound();

  return (
    <ProspectingDiscoverySurface
      organisationId={session.organisationId}
      searchParams={params}
      variant="apps"
    />
  );
}
