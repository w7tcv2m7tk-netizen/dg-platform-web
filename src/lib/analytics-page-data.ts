import {
  buildAnalyticsBundle,
  buildLiveTwinWithScores,
  computeReputationScore,
  gatherOverviewLiveMetrics,
  getOrganisationBusinessProfile,
  getScoreValue,
  healthTrendFromHistory,
  loadHealthHistory,
  metricsContextFromLiveMetrics,
  type AnalyticsBundle,
  type OrganisationBusinessProfile,
  type OverviewConnectorProbes,
  type OverviewLiveMetrics,
  type ScoreResult,
} from "@dg/platform-core";

import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIds, getPlatformPageContext } from "@/lib/org-apps";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export { formatAnalyticsAud as formatAudMoney } from "@dg/platform-core";

export type AnalyticsTwinScores = {
  seo: number;
  aiVisibility: number;
  websiteHealth: number;
  reputation: number;
  businessHealth: number;
};

export type AnalyticsPageData = {
  bundle: AnalyticsBundle;
  metrics: OverviewLiveMetrics | null;
  scoreResults: ScoreResult[];
  twinScores: AnalyticsTwinScores;
  healthTrend: number[];
  connectors: OverviewConnectorProbes;
  profile: OrganisationBusinessProfile | null;
};

const DEFAULT_TWIN_SCORES: AnalyticsTwinScores = {
  seo: 0,
  aiVisibility: 0,
  websiteHealth: 0,
  reputation: 0,
  businessHealth: 0,
};

export async function loadAnalyticsPageData(): Promise<AnalyticsPageData> {
  const { session: platformSession } = await getPlatformPageContext();
  const organisationName = platformSession?.organisationName ?? "Your business";

  if (!platformSession) {
    const bundle = buildAnalyticsBundle({ organisationName });
    return {
      bundle,
      metrics: null,
      scoreResults: [],
      twinScores: DEFAULT_TWIN_SCORES,
      healthTrend: [],
      connectors: {},
      profile: null,
    };
  }

  const enabledAppIds = await getOrgEnabledAppIds();
  const [metrics, connectors, profile, healthHistory, reviewsBundle] = await Promise.all([
    gatherOverviewLiveMetrics(platformSession.organisationId),
    fetchOverviewConnectorProbes(enabledAppIds, platformSession.organisationId),
    getOrganisationBusinessProfile(platformSession.organisationId),
    loadHealthHistory(platformSession.organisationId),
    loadReviewsSessionAndFeed(),
  ]);

  let scoreResults: ScoreResult[] = [];
  let twinScores = DEFAULT_TWIN_SCORES;
  let twinScoresResult = null;
  const reputationFromFeed = computeReputationScore(reviewsBundle.feed);

  if (metrics) {
    const { scores } = buildLiveTwinWithScores({
      organisationId: platformSession.organisationId,
      organisationName: platformSession.organisationName,
      enabledAppIds,
      metrics,
      connectors,
      profile,
      metricsContext: metricsContextFromLiveMetrics(metrics),
      reputationOverride: reputationFromFeed.score,
    });

    twinScoresResult = scores;
    scoreResults = scores.scores;
    twinScores = {
      seo: getScoreValue(scores.scores, "seo"),
      aiVisibility: getScoreValue(scores.scores, "ai_visibility"),
      websiteHealth: getScoreValue(scores.scores, "website_health"),
      reputation: reputationFromFeed.score ?? 0,
      businessHealth: scores.businessHealth,
    };
  }

  const healthTrend = healthTrendFromHistory(healthHistory, twinScores.businessHealth);
  const bundle = buildAnalyticsBundle({
    organisationName,
    metrics,
    connectors,
    scores: twinScoresResult,
    reputationScore: reputationFromFeed.score,
    profile,
  });

  return {
    bundle,
    metrics,
    scoreResults,
    twinScores,
    healthTrend,
    connectors,
    profile,
  };
}
