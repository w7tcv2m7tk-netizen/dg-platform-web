import { notFound } from "next/navigation";
import { buildProspectingActivityWorkspace } from "@dg/platform-core";

import { ProspectingActivitySurface } from "@/components/prospecting/ProspectingActivitySurface";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export const dynamic = "force-dynamic";

export default async function ProspectingActivityPage() {
  const session = await getAuthorisedPlatformPageSession("prospecting.prospects.read");
  if (!session) notFound();

  if (!process.env.DATABASE_URL) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Activity</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-amber-200">Prospecting activity is temporarily unavailable.</p>
        </main>
      </>
    );
  }

  const data = await buildProspectingActivityWorkspace(session.organisationId);

  return <ProspectingActivitySurface data={data} />;
}
