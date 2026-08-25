import { ProspectingPipelineSurface } from "@/components/prospecting/ProspectingPipelineSurface";
import { getPlatformPageContext } from "@/lib/platform-page-context";

interface PageProps {
  searchParams: Promise<{ archived?: string }>;
}

export default async function ProspectingPipelinePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { session } = await getPlatformPageContext();

  if (!session?.organisationId) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Pipeline</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">Sign in with an organisation to use Pipeline.</p>
        </main>
      </>
    );
  }

  return (
    <ProspectingPipelineSurface
      organisationId={session.organisationId}
      showArchived={params.archived === "1"}
      variant="apps"
    />
  );
}
