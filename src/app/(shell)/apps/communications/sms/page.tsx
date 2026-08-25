import { CommunicationsChannelPlaceholder } from "@/components/communications/CommunicationsChannelPlaceholder";

export default function CommunicationsSmsPage() {
  return (
    <CommunicationsChannelPlaceholder
      active="sms"
      title="SMS"
      summary="Business messaging — same Communication Record as email and calls."
      detail="SMS as a Core Communications channel is next. When live, threads land here and on CRM Timeline — not a separate messaging product."
      primaryHref="/apps/communications/compose"
      primaryLabel="Compose email for now"
      secondaryHref="/apps/communications/inbox"
      secondaryLabel="Open Inbox"
    />
  );
}
