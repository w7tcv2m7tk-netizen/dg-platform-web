import {
  buildBusinessHealth,
  buildLiveTwinWithScores,
  computeReputationScore,
  gatherOverviewLiveMetrics,
  getOrganisationBusinessProfile,
  getScoreValue,
  healthDeltaFromHistory,
  loadHealthHistory,
  metricsContextFromLiveMetrics,
  type BusinessHealthBundle,
  type HealthDimension,
  type HealthSignalStatus,
  type OrgScoresResult,
  type ScoreId,
} from "@dg/platform-core";

import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIds, getPlatformPageContext } from "@/lib/org-apps";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

function statusFromScore(score: number | null): HealthSignalStatus {
  if (score == null) return "unavailable";
  if (score >= 75) return "strong";
  if (score >= 55) return "watch";
  return "attention";
}

function hasScore(scores: OrgScoresResult | null, id: ScoreId) {
  return Boolean(scores?.scores.some((score) => score.scoreId === id));
}

function averageAvailable(scores: OrgScoresResult | null, ids: ScoreId[]) {
  if (!scores) return null;
  const values = ids
    .filter((id) => hasScore(scores, id))
    .map((id) => getScoreValue(scores.scores, id));
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function withScore(
  dimension: HealthDimension,
  score: number | null,
  unavailableReason: string,
): HealthDimension {
  return {
    ...dimension,
    score,
    status: statusFromScore(score),
    unavailableReason: score == null ? unavailableReason : undefined,
  };
}

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

  let twinScores: OrgScoresResult | null = null;
  if (metrics) {
    twinScores = buildLiveTwinWithScores({
      organisationId: session.organisationId,
      organisationName: session.organisationName,
      enabledAppIds,
      metrics,
      connectors,
      profile,
      metricsContext: metricsContextFromLiveMetrics(metrics),
      reputationOverride: reputation.reviewCount > 0 ? reputation.score : null,
    }).scores;
  }

  const base = buildBusinessHealth({
    enabledAppIds,
    metrics,
    connectors,
    scores: twinScores,
    reputation: reputation.reviewCount > 0 ? reputation : null,
    healthHistory,
  });

  const financeAvailable = Boolean(
    twinScores?.evidence.some(
      (item) => item.scoreId === "success_score" && item.state !== "unavailable",
    ),
  );
  const digitalScore = averageAvailable(twinScores, ["website_health", "seo", "ai_visibility"]);

  const dimensions = base.dimensions.map((dimension): HealthDimension => {
    switch (dimension.id) {
      case "revenue":
        return withScore(
          dimension,
          financeAvailable ? twinScores?.financeScore ?? null : null,
          "Connect commerce/accounting evidence with revenue or receivables activity to measure finance health.",
        );
      case "pipeline":
        return withScore(
          dimension,
          hasScore(twinScores, "conversion")
            ? getScoreValue(twinScores!.scores, "conversion")
            : null,
          "CRM pipeline and follow-up evidence is required before Pipeline Health is scored.",
        );
      case "marketing":
        return withScore(
          dimension,
          hasScore(twinScores, "business_growth")
            ? getScoreValue(twinScores!.scores, "business_growth")
            : null,
          "Measured CRM or commerce growth evidence is required before Marketing Health is scored.",
        );
      case "digital":
        return withScore(
          dimension,
          digitalScore,
          "Run a website/presence audit to measure Website, SEO and AI Visibility health.",
        );
      case "reputation":
        return withScore(
          dimension,
          reputation.reviewCount > 0 ? reputation.score : null,
          "Connect a review feed with real reviews before Reputation Health is scored.",
        );
      case "operations":
        return withScore(
          dimension,
          hasScore(twinScores, "automation")
            ? getScoreValue(twinScores!.scores, "automation")
            : null,
          "Enable and use Automation before Operations Health is scored from workflow evidence.",
        );
      case "customers":
        return withScore(
          dimension,
          null,
          "Customer Health will activate when retention or engagement evidence is available; contact count alone is not treated as health.",
        );
      default:
        return dimension;
    }
  });

  const scored = dimensions.filter((dimension) => dimension.score != null);
  const strong = scored.filter((dimension) => dimension.status === "strong").map((dimension) => dimension.label);
  const watch = scored.filter((dimension) => dimension.status === "watch").map((dimension) => dimension.label);
  const attention = scored.filter((dimension) => dimension.status === "attention").map((dimension) => dimension.label);

  const scoresLive = Boolean(twinScores?.scoresLive);
  const overallScore = scoresLive ? twinScores!.businessHealth : null;
  const historyMeasurementCount = healthHistory.length;
  const healthTrend = healthHistory.map((entry) => entry.score).slice(-12);
  if (
    scoresLive &&
    overallScore != null &&
    healthTrend[healthTrend.length - 1] !== overallScore
  ) {
    healthTrend.push(overallScore);
    if (healthTrend.length > 12) healthTrend.shift();
  }
  const trendDelta30Days =
    scoresLive && overallScore != null && healthHistory.length >= 2
      ? healthDeltaFromHistory(healthHistory, overallScore)
      : null;

  const supportedAlerts = base.predictiveAlerts.filter((alert) => {
    if (alert.id === "pipeline-quiet") return false;
    if (alert.id === "ai-visibility") return hasScore(twinScores, "ai_visibility");
    if (alert.id === "operations-load") return hasScore(twinScores, "automation");
    if (alert.id === "health-trend") return healthHistory.length >= 3 && scoresLive;
    return true;
  });

  return {
    ...base,
    scoresLive,
    overallScore,
    overallStatus: scoresLive ? base.overallStatus : "unknown",
    overallStatusLabel: scoresLive
      ? base.overallStatusLabel
      : "Not enough measured evidence to publish a Business Health score",
    trendDelta30Days,
    evidenceCoveragePercent: twinScores?.evidenceCoveragePercent ?? 0,
    measuredDimensionCount: twinScores?.measuredDimensionCount ?? 0,
    confidence: twinScores?.confidence ?? "insufficient",
    historyMeasurementCount,
    strong,
    watch,
    attention,
    dimensions,
    predictiveAlerts: supportedAlerts,
    healthTrend,
  };
}
