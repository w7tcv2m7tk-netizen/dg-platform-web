import { CommunicationsChannelPlaceholder } from "@/components/communications/CommunicationsChannelPlaceholder";

export default function CommunicationsCallsPage() {
  return (
    <CommunicationsChannelPlaceholder
      active="calls"
      title="Calls"
      summary="Call history and recordings belong in Communications — not a separate AI silo."
      detail="Voice agents may still run as Growth capacity, but every call should land as a Communication on CRM Timeline. Use voice tooling below while call history consolidates here."
      primaryHref="/apps/ai-communications/voice"
      primaryLabel="Voice agents"
      secondaryHref="/apps/crm/timeline"
      secondaryLabel="CRM Timeline"
    />
  );
}
