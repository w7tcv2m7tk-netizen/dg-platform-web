import { CommunicationsChannelPlaceholder } from "@/components/communications/CommunicationsChannelPlaceholder";

export default function CommunicationsSmsPage() {
  return (
    <CommunicationsChannelPlaceholder
      active="sms"
      title="SMS"
      summary="Business messaging — same Communication Record as email and calls."
      detail="SMS lands in Communications and on CRM Timeline. Connect SMS under Connected Services when available — DigitalGate manages the carrier connection; you do not configure provider APIs."
      primaryHref="/dashboard/settings/connected-services"
      primaryLabel="Connected Services"
      secondaryHref="/apps/communications/inbox"
      secondaryLabel="Open Inbox"
    />
  );
}
