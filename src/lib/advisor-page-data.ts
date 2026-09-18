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
  fetchOrgGoogleAdsEvidence,
  fetchOrgMicrosoftAdsEvidence,
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
  const [instagramEvidence, linkedInEvidence, googleAdsEvidence, microsoftAdsEvidence] = await Promise.all([
    fetchOrgMetaInstagramEvidence(session.organisationId),
    fetchOrgLinkedInCompanyEvidence(session.organisationId),
    fetchOrgGoogleAdsEvidence(session.organisationId),
    fetchOrgMicrosoftAdsEvidence(session.organisationId),
  ]);
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
    if (googleAdsEvidence.ok && googleAdsEvidence.data.length) {
      snapshot.connectors = [...new Set([...snapshot.connectors, "google-ads"])];
      snapshot.metrics.googleAdsSpend30d = googleAdsEvidence.data.reduce((n, x) => n + x.performance.spend, 0);
      snapshot.metrics.googleAdsImpressions30d = googleAdsEvidence.data.reduce((n, x) => n + x.performance.impressions, 0);
      snapshot.metrics.googleAdsClicks30d = googleAdsEvidence.data.reduce((n, x) => n + x.performance.clicks, 0);
      snapshot.metrics.googleAdsConversions30d = googleAdsEvidence.data.reduce((n, x) => n + x.performance.conversions, 0);
      snapshot.metrics.googleAdsConversionValue30d = googleAdsEvidence.data.reduce((n, x) => n + x.performance.conversionsValue, 0);
    }
    if (microsoftAdsEvidence.ok && microsoftAdsEvidence.data.length) {
      snapshot.connectors = [...new Set([...snapshot.connectors, "microsoft-ads"])];
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
