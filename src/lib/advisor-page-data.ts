import {
  buildAdvisorBriefing,
  buildBusinessBenchmarks,
  buildBusinessBrain,
  buildBusinessHealth,
  buildLiveTwinWithScores,
  computeReputationScore,
  gatherOverviewLiveMetrics,
  generateBusinessIntelligence,
  getBusinessContext,
  getOrganisationBusinessProfile,
  getOrganisationGoals,
  getPlatformSetupStatus,
  loadHealthHistory,
  metricsContextFromLiveMetrics,
  type BusinessAdvisorBundle,
} from "@dg/platform-core";

import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIds, getPlatformPageContext } from "@/lib/org-apps";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export async function loadAdvisorPageData(): Promise<BusinessAdvisorBundle | null> {
  const { session, user, name } = await getPlatformPageContext();
  if (!session) return null;

  const userDisplayName = user?.firstName ?? name ?? "there";
  const enabledAppIds = await getOrgEnabledAppIds();
  const [profile, metrics, connectors, setupStatus, healthHistory, reviewsBundle, goals] =
    await Promise.all([
      getOrganisationBusinessProfile(session.organisationId),
      gatherOverviewLiveMetrics(session.organisationId),
      fetchOverviewConnectorProbes(enabledAppIds, session.organisationId),
      getPlatformSetupStatus(session.organisationId),
      loadHealthHistory(session.organisationId),
      loadReviewsSessionAndFeed(),
      getOrganisationGoals(session.organisationId),
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
    goalsOverride: goals,
  });

  const brain = buildBusinessBrain({
    context,
    setup: setupStatus,
    connectorCount: context.twin.connectedSystems.length,
  });

  const health = buildBusinessHealth({
    enabledAppIds,
    metrics,
    connectors,
    scores: twinScores,
    reputation,
    healthHistory,
  });

  const benchmarks = buildBusinessBenchmarks({
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
  });

  const intelligence =
    metrics && snapshot && twinScores
      ? generateBusinessIntelligence({
          organisationName: session.organisationName,
          userDisplayName,
          enabledAppIds,
          metrics,
          connectors,
          snapshot,
          scores: twinScores,
          goals,
        })
      : null;

  return buildAdvisorBriefing({
    userDisplayName,
    enabledAppIds,
    metrics,
    scores: twinScores,
    intelligence,
    brain,
    health,
    benchmarks,
  });
}
