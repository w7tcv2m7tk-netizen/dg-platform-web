import { ProspectingDiscoverySurface } from "@/components/prospecting/ProspectingDiscoverySurface";
import { getPlatformPageContext } from "@/lib/platform-page-context";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    industry?: string;
    location?: string;
    archived?: string;
    mode?: string;
  }>;
}

export default async function ProspectingDiscoveryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { session } = await getPlatformPageContext();

  if (!session?.organisationId) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Discovery</h1>
          <p className="text-sm text-slate-400">Sign in to run Business Discovery.</p>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">No active organisation session.</p>
        </main>
      </>
    );
  }

  return (
    <ProspectingDiscoverySurface
      organisationId={session.organisationId}
      searchParams={params}
      variant="apps"
    />
  );
}
