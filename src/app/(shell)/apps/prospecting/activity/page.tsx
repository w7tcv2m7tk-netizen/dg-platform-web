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
          <h1 className="text-2xl font-bold text-white">Follow-up</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-amber-200">
            Follow-up activity is temporarily unavailable. Try again shortly.
          </p>
        </main>
      </>
    );
  }

  try {
    const data = await buildProspectingActivityWorkspace(session.organisationId);
    return <ProspectingActivitySurface data={data} />;
  } catch (error) {
    console.error("[prospecting/activity] load failed", error);
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Follow-up</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-amber-200">
            Follow-up activity could not be loaded right now. Try again shortly.
          </p>
        </main>
      </>
    );
  }
}
