import { CommunicationsChannelPlaceholder } from "@/components/communications/CommunicationsChannelPlaceholder";

export default function CommunicationsCallsPage() {
  return (
    <CommunicationsChannelPlaceholder
      active="calls"
      title="Calls"
      summary="Business phone history stays in Communications. Voice agents and Call Centre live here too — under the same Communications nav."
      detail="Connect your business phone under Connected Services when Calls go live. Telephony is a swappable adapter; AI voice tooling uses synthesis providers underneath. History and association stay DigitalGate."
      primaryHref="/apps/ai-communications/voice"
      primaryLabel="Voice Agents"
      secondaryHref="/apps/ai-communications/call-centre"
      secondaryLabel="Call Centre"
    />
  );
}
