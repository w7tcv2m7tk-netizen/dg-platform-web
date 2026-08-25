import { CommunicationsInboxView } from "@/components/communications/inbox/CommunicationsInboxView";

interface PageProps {
  searchParams: Promise<{ c?: string; folder?: string; q?: string }>;
}

/** Same Inbox workspace as `/apps/communications` (URL-stable alias). */
export default async function CommunicationsInboxPage({ searchParams }: PageProps) {
  return (
    <CommunicationsInboxView
      searchParams={searchParams}
      basePath="/apps/communications/inbox"
    />
  );
}
