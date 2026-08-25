import { CommunicationsChannelPlaceholder } from "@/components/communications/CommunicationsChannelPlaceholder";

export default function CommunicationsCallsPage() {
  return (
    <CommunicationsChannelPlaceholder
      active="calls"
      title="Calls"
      summary="Business phone history stays in Communications. Voice agents and Call Centre live under Communications → AI."
      detail="Connect your business phone under Connected Services when Calls go live. Telephony is a swappable adapter. AI voice tooling lives one level deeper under AI — not as a parallel Growth product in the sidebar."
      primaryHref="/apps/communications/ai"
      primaryLabel="Communications → AI"
      secondaryHref="/apps/ai-communications/call-centre"
      secondaryLabel="Call Centre"
    />
  );
}
