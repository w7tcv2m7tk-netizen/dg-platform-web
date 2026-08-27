import {
  getDailyOpportunityBriefing,
  getGrowthEngineSummary,
} from "@dg/platform-core";

import { OPERATOR_CAPABILITY_GROUPS } from "@/components/growth-engine/GrowthEngineCapabilityGrid";
import { GrowthEngineWorkspace } from "@/components/growth-engine/GrowthEngineWorkspace";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export const dynamic = "force-dynamic";

export default async function GrowthEngineHubPage() {
  const db = Boolean(process.env.DATABASE_URL);
  const { session, name } = await getPlatformPageContext();
  const staffName = name?.split(" ")[0] || "Ben";

  let summary: Awaited<ReturnType<typeof getGrowthEngineSummary>> | null = null;
  let briefing: Awaited<ReturnType<typeof getDailyOpportunityBriefing>> | null = null;

  if (db && session?.organisationId) {
    try {
      [summary, briefing] = await Promise.all([
        getGrowthEngineSummary(session.organisationId),
        getDailyOpportunityBriefing({
          organisationId: session.organisationId,
          limit: 20,
          staffName,
        }),
      ]);
    } catch {
      summary = null;
      briefing = null;
    }
  }

  return (
    <GrowthEngineWorkspace
      variant="command"
      briefing={briefing}
      summary={summary}
      showBetaStatus
      capabilityGroups={OPERATOR_CAPABILITY_GROUPS}
      pipelineHref="/command/growth-engine/pipeline"
      discoveryHref="/apps/prospecting/discovery"
      followUpsHref="/command/growth-engine/follow-ups"
      auditsHref="/command/growth-engine/audits"
      reportsHref="/command/growth-engine/reports"
      enableActions
    />
  );
}
