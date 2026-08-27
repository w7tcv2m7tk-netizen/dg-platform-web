import {
  getDailyOpportunityBriefing,
  getGrowthEngineSummary,
} from "@dg/platform-core";

import { TENANT_CAPABILITY_GROUPS } from "@/components/growth-engine/GrowthEngineCapabilityGrid";
import { GrowthEngineWorkspace } from "@/components/growth-engine/GrowthEngineWorkspace";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export const dynamic = "force-dynamic";

/**
 * Sales → Growth Engine™ — orchestration layer for discovery, scoring, pipeline & activity.
 * Not a separate Growth App; capabilities live underneath this workspace.
 */
export default async function SalesGrowthEnginePage() {
  const db = Boolean(process.env.DATABASE_URL);
  const { session, name } = await getPlatformPageContext();
  const firstName = name?.split(" ")[0] || "there";

  let summary: Awaited<ReturnType<typeof getGrowthEngineSummary>> | null = null;
  let briefing: Awaited<ReturnType<typeof getDailyOpportunityBriefing>> | null = null;

  if (db && session?.organisationId) {
    try {
      [summary, briefing] = await Promise.all([
        getGrowthEngineSummary(session.organisationId),
        getDailyOpportunityBriefing({
          organisationId: session.organisationId,
          limit: 20,
          staffName: firstName,
        }),
      ]);
    } catch {
      summary = null;
      briefing = null;
    }
  }

  return (
    <GrowthEngineWorkspace
      variant="sales"
      briefing={briefing}
      summary={summary}
      capabilityGroups={TENANT_CAPABILITY_GROUPS}
      pipelineHref="/apps/prospecting/pipeline"
      discoveryHref="/apps/prospecting/discovery"
      followUpsHref="/apps/prospecting/activity"
      auditsHref="/apps/prospecting/scores"
      reportsHref="/apps/prospecting/scores"
      enableActions={false}
    />
  );
}
