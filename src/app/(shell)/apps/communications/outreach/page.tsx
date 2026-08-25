import { CommunicationsChannelPlaceholder } from "@/components/communications/CommunicationsChannelPlaceholder";

export default function CommunicationsOutreachPage() {
  return (
    <CommunicationsChannelPlaceholder
      active="outreach"
      title="Outreach"
      summary="Campaigns and sequences — Prospecting emits Communication records here."
      detail="Outreach UI consolidates under Communications so campaigns are not a second email product. Until the sequencer ships, use Compose and Prospecting Discovery."
      primaryHref="/apps/communications/compose"
      primaryLabel="Compose"
      secondaryHref="/apps/prospecting"
      secondaryLabel="Prospecting"
    />
  );
}
