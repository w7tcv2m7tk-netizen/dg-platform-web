import { CommunicationsChannelPlaceholder } from "@/components/communications/CommunicationsChannelPlaceholder";

export default function CommunicationsTemplatesPage() {
  return (
    <CommunicationsChannelPlaceholder
      active="templates"
      title="Templates"
      summary="Reusable communication copy and structure."
      detail="Templates library is next. Signature Studio is live for email footers; Assist drafts will reuse templates under AI governance."
      primaryHref="/apps/communications/signatures"
      primaryLabel="Signature Studio"
      secondaryHref="/apps/communications/email"
      secondaryLabel="Email channel"
    />
  );
}
