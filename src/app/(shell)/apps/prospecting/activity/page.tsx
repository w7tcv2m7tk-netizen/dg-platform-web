import { notFound } from "next/navigation";
import { buildProspectingActivityWorkspace } from "@dg/platform-core";

import { ProspectingActivitySurface } from "@/components/prospecting/ProspectingActivitySurface";
import { ProspectingPageHeader } from "@/components/prospecting/ProspectingPageHeader";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export const dynamic = "force-dynamic";

export default async function ProspectingActivityPage() {
  const session = await getAuthorisedPlatformPageSession("prospecting.prospects.read");
  if (!session) notFound();

  if (!process.env.DATABASE_URL) {
    return (
      <>
        <ProspectingPageHeader title="Activity" description="Calls, messages, notes, tasks and follow-ups across your prospect pipeline." />
        <main className="dg-page-main">
          <p className="text-sm text-amber-200">
            Prospecting activity is temporarily unavailable. Try again shortly.
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
        <ProspectingPageHeader title="Activity" description="Calls, messages, notes, tasks and follow-ups across your prospect pipeline." />
        <main className="dg-page-main">
          <p className="text-sm text-amber-200">
            Prospecting activity could not be loaded right now. Try again shortly.
          </p>
        </main>
      </>
    );
  }
}
