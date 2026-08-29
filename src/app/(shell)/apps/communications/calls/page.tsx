import { CommunicationsChannelPlaceholder } from "@/components/communications/CommunicationsChannelPlaceholder";

export default function CommunicationsCallsPage() {
  return (
    <CommunicationsChannelPlaceholder
      active="calls"
      title="Calls"
      summary="Business phone history stays in Communications. Voice agents and Call Centre are under AI Conversations."
      detail="Connect your business phone under Connected Services when Calls go live. Telephony is a swappable adapter. AI voice tooling lives under AI Conversations (top buttons), not as a nested sidebar group."
      primaryHref="/apps/ai-communications/inbox"
      primaryLabel="AI Conversations"
      secondaryHref="/apps/ai-communications/call-centre"
      secondaryLabel="Call Centre"
    />
  );
}
