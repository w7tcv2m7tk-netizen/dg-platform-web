import {
  buildAdvisorBriefing,
  buildBusinessBenchmarks,
  buildBusinessBrain,
  buildBusinessHealth,
  buildLiveTwinWithScores,
  computeReputationScore,
  gatherOverviewLiveMetrics,
  generateBusinessIntelligence,
  fetchOrgMetaInstagramEvidence,
  fetchOrgLinkedInCompanyEvidence,
  getAiQualityMetrics,
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
  const [profile, metrics, connectors, setupStatus, healthHistory, reviewsBundle, goals, aiQuality] =
    await Promise.all([
      getOrganisationBusinessProfile(session.organisationId),
      gatherOverviewLiveMetrics(session.organisationId),
      fetchOverviewConnectorProbes(enabledAppIds, session.organisationId),
      getPlatformSetupStatus(session.organisationId),
      loadHealthHistory(session.organisationId),
      loadReviewsSessionAndFeed(),
      getOrganisationGoals(session.organisationId),
      getAiQualityMetrics({ organisationId: session.organisationId, windowDays: 30 }),
    ]);

  const reputation = computeReputationScore(reviewsBundle.feed);
  const [instagramEvidence, linkedInEvidence] = await Promise.all([\n    fetchOrgMetaInstagramEvidence(session.organisationId),\n    fetchOrgLinkedInCompanyEvidence(session.organisationId),\n  ]);
  const instagramRows = instagramEvidence.ok ? instagramEvidence.data : [];

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
      reputationOverride: reputation.reviewCount > 0 ? reputation.score : null,
    });
    twinScores = built.scores;
    snapshot = built.snapshot;
    if (linkedInEvidence.ok) {
      snapshot.connectors = [...new Set([...snapshot.connectors, "linkedin"])];
    }
    if (instagramRows.length) {
      snapshot.connectors = [...new Set([...snapshot.connectors, "instagram"])];
      snapshot.metrics.instagramFollowers = instagramRows.reduce((total, row) => total + (row.followersCount ?? 0), 0);
      snapshot.metrics.instagramFollowing = instagramRows.reduce((total, row) => total + (row.followsCount ?? 0), 0);
      snapshot.metrics.instagramMediaCount = instagramRows.reduce((total, row) => total + (row.mediaCount ?? 0), 0);
      snapshot.metrics.instagramRecentMediaCount = instagramRows.reduce((total, row) => total + row.media.length, 0);
      snapshot.metrics.instagramRecentLikes = instagramRows.reduce(
        (total, row) => total + row.media.reduce((sum, item) => sum + (item.likeCount ?? 0), 0),
        0,
      );
      snapshot.metrics.instagramRecentComments = instagramRows.reduce(
        (total, row) => total + row.media.reduce((sum, item) => sum + (item.commentsCount ?? 0), 0),
        0,
      );
    }
    snapshot.metrics.connectedConnectors = snapshot.connectors.length;
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
    reputation: reputation.reviewCount > 0 ? reputation : null,
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
    reputation: reputation.reviewCount > 0 ? reputation : null,
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

  const briefing = buildAdvisorBriefing({
    userDisplayName,
    organisationName: session.organisationName,
    enabledAppIds,
    metrics,
    scores: twinScores,
    intelligence,
    brain,
    health,
    benchmarks,
  });

  return {
    ...briefing,
    scoresLive: twinScores?.scoresLive ?? false,
    businessHealth: twinScores?.scoresLive ? twinScores.businessHealth : null,
    aiQuality,
  };
}
