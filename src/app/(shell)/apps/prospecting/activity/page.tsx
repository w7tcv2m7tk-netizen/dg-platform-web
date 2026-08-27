import { buildProspectingActivityWorkspace } from "@dg/platform-core";

import { ProspectingActivitySurface } from "@/components/prospecting/ProspectingActivitySurface";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export const dynamic = "force-dynamic";

export default async function ProspectingActivityPage() {
  const { session } = await getPlatformPageContext();

  if (!session?.organisationId) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Activity</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">Sign in with an organisation to use Activity.</p>
        </main>
      </>
    );
  }

  if (!process.env.DATABASE_URL) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Activity</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-amber-200">DATABASE_URL required for Activity.</p>
        </main>
      </>
    );
  }

  const data = await buildProspectingActivityWorkspace(session.organisationId);

  return <ProspectingActivitySurface data={data} />;
}
