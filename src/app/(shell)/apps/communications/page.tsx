import { CommunicationsInboxView } from "@/components/communications/inbox/CommunicationsInboxView";

interface PageProps {
  searchParams: Promise<{ c?: string; folder?: string; q?: string }>;
}

export default async function CommunicationsPage({ searchParams }: PageProps) {
  return <CommunicationsInboxView searchParams={searchParams} />;
}
