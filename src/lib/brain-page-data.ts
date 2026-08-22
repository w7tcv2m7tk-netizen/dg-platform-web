import {
  buildBusinessBrainDashboard,
  buildDigitalTwinDashboard,
  buildLiveTwinWithScores,
  computeReputationScore,
  gatherOverviewLiveMetrics,
  getBusinessContext,
  getOrganisationBusinessProfile,
  getPlatformSetupStatus,
  listOrganisationActivities,
  metricsContextFromLiveMetrics,
  type BusinessBrainDashboardBundle,
} from "@dg/platform-core";

import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIds, getPlatformPageContext } from "@/lib/org-apps";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export async function loadBusinessBrainPageData(): Promise<BusinessBrainDashboardBundle | null> {
  const { session } = await getPlatformPageContext();
  if (!session) return null;

  const enabledAppIds = await getOrgEnabledAppIds();
  const [profile, metrics, connectors, setupStatus, reviewsBundle, activities] = await Promise.all([
    getOrganisationBusinessProfile(session.organisationId),
    gatherOverviewLiveMetrics(session.organisationId),
    fetchOverviewConnectorProbes(enabledAppIds, session.organisationId),
    getPlatformSetupStatus(session.organisationId),
    loadReviewsSessionAndFeed(),
    listOrganisationActivities({ organisationId: session.organisationId, limit: 1 }),
  ]);

  const reputation = computeReputationScore(reviewsBundle.feed);

  let snapshot = null;
  let twinScores = null;
  let twinCompleteness: number | null = null;
  if (metrics) {
    const built = buildLiveTwinWithScores({
      organisationId: session.organisationId,
      organisationName: session.organisationName,
      enabledAppIds,
      metrics,
      connectors,
      profile,
      metricsContext: metricsContextFromLiveMetrics(metrics),
      reputationOverride: reputation.score,
    });
    snapshot = built.snapshot;
    twinScores = built.scores;
  }

  const context = await getBusinessContext({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    enabledAppIds,
    twinSnapshot: snapshot,
    profileOverride: profile,
  });

  if (snapshot && metrics) {
    const twinBundle = buildDigitalTwinDashboard({
      context,
      snapshot,
      metrics,
      connectors,
      scores: twinScores,
      setupStatus,
      reputation,
      activities: activities.items,
    });
    twinCompleteness = twinBundle.overallCompleteness;
  }

  return buildBusinessBrainDashboard({
    context,
    setup: setupStatus,
    connectorCount: context.twin.connectedSystems.length,
    scores: twinScores,
    twinCompleteness,
    metricsLive: Boolean(metrics),
  });
}
