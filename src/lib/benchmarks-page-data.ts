import {
  buildBusinessBenchmarks,
  buildBusinessBrain,
  buildLiveTwinWithScores,
  computeReputationScore,
  gatherOverviewLiveMetrics,
  getBusinessContext,
  getOrganisationBusinessProfile,
  getPlatformSetupStatus,
  loadHealthHistory,
  metricsContextFromLiveMetrics,
  parseBenchmarkCohortId,
  type BenchmarkCohortId,
  type BusinessBenchmarksBundle,
} from "@dg/platform-core";

import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIds, getPlatformPageContext } from "@/lib/org-apps";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export async function loadBusinessBenchmarksPageData(
  cohortId?: BenchmarkCohortId | string | null,
): Promise<BusinessBenchmarksBundle | null> {
  const { session } = await getPlatformPageContext();
  if (!session) return null;

  const enabledAppIds = await getOrgEnabledAppIds();
  const [profile, metrics, connectors, setupStatus, healthHistory, reviewsBundle] =
    await Promise.all([
      getOrganisationBusinessProfile(session.organisationId),
      gatherOverviewLiveMetrics(session.organisationId),
      fetchOverviewConnectorProbes(enabledAppIds, session.organisationId),
      getPlatformSetupStatus(session.organisationId),
      loadHealthHistory(session.organisationId),
      loadReviewsSessionAndFeed(),
    ]);

  const reputation = computeReputationScore(reviewsBundle.feed);

  let twinScores = null;
  let snapshot = null;
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
    twinScores = built.scores;
    snapshot = built.snapshot;
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

  return buildBusinessBenchmarks({
    organisationName: session.organisationName,
    enabledAppIds,
    profile,
    metrics,
    connectors,
    scores: twinScores,
    snapshot,
    brain,
    reputation,
    healthHistory,
    setupStatus,
    networkCohortSize: 0,
    cohortId: parseBenchmarkCohortId(cohortId),
  });
}
