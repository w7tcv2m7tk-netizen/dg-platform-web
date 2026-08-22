import {
  buildBusinessBrain,
  buildDigitalTwinDashboard,
  buildLiveTwinWithScores,
  computeReputationScore,
  gatherOverviewLiveMetrics,
  getBusinessContext,
  getOrganisationBusinessProfile,
  getPlatformSetupStatus,
  listOrganisationActivities,
  metricsContextFromLiveMetrics,
  type DigitalTwinDashboardBundle,
} from "@dg/platform-core";

import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIds, getPlatformPageContext } from "@/lib/org-apps";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export async function loadDigitalTwinPageData(): Promise<DigitalTwinDashboardBundle | null> {
  const { session } = await getPlatformPageContext();
  if (!session) return null;

  const enabledAppIds = await getOrgEnabledAppIds();
  const [profile, metrics, connectors, setupStatus, reviewsBundle, activities] = await Promise.all([
    getOrganisationBusinessProfile(session.organisationId),
    gatherOverviewLiveMetrics(session.organisationId),
    fetchOverviewConnectorProbes(enabledAppIds, session.organisationId),
    getPlatformSetupStatus(session.organisationId),
    loadReviewsSessionAndFeed(),
    listOrganisationActivities({ organisationId: session.organisationId, limit: 8 }),
  ]);

  const reputation = computeReputationScore(reviewsBundle.feed);

  let snapshot = null;
  let twinScores = null;
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

  const brain = buildBusinessBrain({
    context,
    setup: setupStatus,
    connectorCount: context.twin.connectedSystems.length,
  });

  return buildDigitalTwinDashboard({
    context,
    snapshot,
    metrics,
    connectors,
    scores: twinScores,
    brain,
    setupStatus,
    reputation,
    activities: activities.items,
  });
}
