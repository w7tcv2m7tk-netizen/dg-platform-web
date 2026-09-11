import { CommunicationsChannelPlaceholder } from "@/components/communications/CommunicationsChannelPlaceholder";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function CommunicationsCallsPage() {
  const session = await getAuthorisedPlatformPageSession("communications.read");
  if (!session) return null;

  return (
    <CommunicationsChannelPlaceholder
      active="calls"
      title="Calls"
      summary="Business call history is not yet part of the current Communications launch surface."
      detail="AI voice agents and live AI call sessions are available separately when enabled for your organisation. General business call history will appear here when that channel is ready."
      primaryHref="/apps/communications/inbox"
      primaryLabel="Open Inbox"
      secondaryHref="/apps/communications"
      secondaryLabel="Communications"
    />
  );
}
