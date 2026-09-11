import { notFound } from "next/navigation";

import { CommunicationsChannelPlaceholder } from "@/components/communications/CommunicationsChannelPlaceholder";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function CommunicationsOutreachPage() {
  const session = await getAuthorisedPlatformPageSession("communications.read");
  if (!session) notFound();

  return (
    <CommunicationsChannelPlaceholder
      active="outreach"
      title="Outreach"
      summary="Campaigns and sequences are not part of the current Communications launch surface."
      detail="Use Compose for individual email and Prospecting Discovery for acquisition workflows. Outreach sequencing will return when the end-to-end workflow is ready for customers."
      primaryHref="/apps/communications/email"
      primaryLabel="Email"
      secondaryHref="/apps/prospecting"
      secondaryLabel="Prospecting"
    />
  );
}
