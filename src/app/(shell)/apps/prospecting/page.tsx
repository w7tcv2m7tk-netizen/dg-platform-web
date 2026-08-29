import {
  getDailyOpportunityBriefing,
  getGrowthEngineSummary,
} from "@dg/platform-core";

import { TENANT_CAPABILITY_GROUPS } from "@/components/growth-engine/GrowthEngineCapabilityGrid";
import { GrowthEngineWorkspace } from "@/components/growth-engine/GrowthEngineWorkspace";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export const dynamic = "force-dynamic";

/**
 * Prospecting & Opportunity Engine™ — acquisition workspace.
 * Discover → score → pursue → convert. Not a separate “Sales” product.
 */
export default async function ProspectingOverviewPage() {
  const db = Boolean(process.env.DATABASE_URL);
  let firstName = "there";
  let summary: Awaited<ReturnType<typeof getGrowthEngineSummary>> | null = null;
  let briefing: Awaited<ReturnType<typeof getDailyOpportunityBriefing>> | null = null;
  let loadError: string | null = null;

  try {
    const { session, name } = await getPlatformPageContext();
    firstName = name?.split(" ")[0] || "there";

    if (db && session?.organisationId) {
      const [summaryResult, briefingResult] = await Promise.allSettled([
        getGrowthEngineSummary(session.organisationId),
        getDailyOpportunityBriefing({
          organisationId: session.organisationId,
          limit: 20,
          staffName: firstName,
        }),
      ]);

      if (summaryResult.status === "fulfilled") {
        summary = summaryResult.value;
      } else {
        console.error("[prospecting] summary failed", summaryResult.reason);
      }
      if (briefingResult.status === "fulfilled") {
        briefing = briefingResult.value;
      } else {
        console.error("[prospecting] briefing failed", briefingResult.reason);
      }
    }
  } catch (err) {
    console.error("[prospecting] page load failed", err);
    loadError = "We could not load prospecting data right now. You can still open Discovery.";
  }

  return (
    <>
      {loadError ? (
        <div className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6 md:px-8">
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {loadError}
          </p>
        </div>
      ) : null}
      <GrowthEngineWorkspace
        variant="sales"
        briefing={briefing}
        summary={summary}
        capabilityGroups={TENANT_CAPABILITY_GROUPS}
        pipelineHref="/apps/prospecting/pipeline"
        discoveryHref="/apps/prospecting/discovery"
        followUpsHref="/apps/prospecting/activity"
        auditsHref="/apps/prospecting/scores"
        reportsHref="/apps/prospecting/reports"
        enableActions={false}
      />
    </>
  );
}
