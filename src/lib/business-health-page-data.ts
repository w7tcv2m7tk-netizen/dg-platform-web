import {
  buildBusinessHealth,
  buildLiveTwinWithScores,
  computeReputationScore,
  gatherOverviewLiveMetrics,
  getOrganisationBusinessProfile,
  loadHealthHistory,
  metricsContextFromLiveMetrics,
  type BusinessHealthBundle,
} from "@dg/platform-core";

import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIds, getPlatformPageContext } from "@/lib/org-apps";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export async function loadBusinessHealthPageData(): Promise<BusinessHealthBundle | null> {
  const { session } = await getPlatformPageContext();
  if (!session) return null;

  const enabledAppIds = await getOrgEnabledAppIds();
  const [profile, metrics, connectors, healthHistory, reviewsBundle] = await Promise.all([
    getOrganisationBusinessProfile(session.organisationId),
    gatherOverviewLiveMetrics(session.organisationId),
    fetchOverviewConnectorProbes(enabledAppIds, session.organisationId),
    loadHealthHistory(session.organisationId),
    loadReviewsSessionAndFeed(),
  ]);

  const reputation = computeReputationScore(reviewsBundle.feed);

  let twinScores = null;
  if (metrics) {
    twinScores = buildLiveTwinWithScores({
      organisationId: session.organisationId,
      organisationName: session.organisationName,
      enabledAppIds,
      metrics,
      connectors,
      profile,
      metricsContext: metricsContextFromLiveMetrics(metrics),
      reputationOverride: reputation.score,
    }).scores;
  }

  return buildBusinessHealth({
    enabledAppIds,
    metrics,
    connectors,
    scores: twinScores,
    reputation,
    healthHistory,
  });
}
