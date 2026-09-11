import { CommunicationsChannelPlaceholder } from "@/components/communications/CommunicationsChannelPlaceholder";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function CommunicationsSmsPage() {
  const session = await getAuthorisedPlatformPageSession("communications.read");
  if (!session) return null;

  return (
    <CommunicationsChannelPlaceholder
      active="sms"
      title="SMS"
      summary="SMS is not yet part of the current Communications launch surface."
      detail="When SMS is available for your organisation, messages will appear in Communications and relevant CRM timelines alongside other customer conversations."
      primaryHref="/apps/communications/inbox"
      primaryLabel="Open Inbox"
      secondaryHref="/dashboard/settings/connected-services"
      secondaryLabel="Connected Services"
    />
  );
}
