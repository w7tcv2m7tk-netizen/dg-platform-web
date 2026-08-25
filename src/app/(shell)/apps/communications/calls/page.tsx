import { CommunicationsChannelPlaceholder } from "@/components/communications/CommunicationsChannelPlaceholder";

export default function CommunicationsCallsPage() {
  return (
    <CommunicationsChannelPlaceholder
      active="calls"
      title="Calls"
      summary="Call history and recordings belong in Communications — not a separate silo."
      detail="Connect your business phone under Connected Services when Calls go live. Voice agents may use synthesis providers underneath; telephony is a swappable adapter. History and association stay DigitalGate."
      primaryHref="/dashboard/settings/connected-services"
      primaryLabel="Connected Services"
      secondaryHref="/apps/crm/timeline"
      secondaryLabel="CRM Timeline"
    />
  );
}
