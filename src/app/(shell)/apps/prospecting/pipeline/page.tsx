import { sessionHasFeature } from "@dg/platform-core";
import { notFound } from "next/navigation";

import { ProspectingPipelineSurface } from "@/components/prospecting/ProspectingPipelineSurface";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

interface PageProps {
  searchParams: Promise<{ archived?: string }>;
}

export default async function ProspectingPipelinePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getAuthorisedPlatformPageSession("prospecting.prospects.read");
  if (!session) notFound();

  const canWrite = sessionHasFeature(session, "prospecting.prospects.write");
  const canConvertToCrm =
    canWrite &&
    sessionHasFeature(session, "crm.companies.write") &&
    sessionHasFeature(session, "crm.contacts.write") &&
    sessionHasFeature(session, "crm.opportunities.write");

  return (
    <ProspectingPipelineSurface
      organisationId={session.organisationId}
      showArchived={params.archived === "1"}
      variant="apps"
      canWrite={canWrite}
      canConvertToCrm={canConvertToCrm}
    />
  );
}
