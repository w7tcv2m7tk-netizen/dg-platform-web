import type { OverviewConnectorProbes } from "../overview/connector-probes";
import type { OverviewLiveMetrics } from "../overview/gather-live-metrics";
import type { OrganisationBusinessProfile } from "../org/business-profile-types";
import {
  calculateOrgScores,
  getScoreValue,
  type OverviewMetricsContext,
} from "../scoring/calculate-scores";
import { captureDigitalTwinSnapshot, type CaptureTwinSnapshotInput } from "./capture-snapshot";
import type { DigitalTwinSnapshot } from "./types";

export type BuildLiveTwinWithScoresInput = CaptureTwinSnapshotInput & {
  profile?: OrganisationBusinessProfile | null;
  metricsContext: OverviewMetricsContext;
  reputationOverride?: number | null;
};

/** Capture twin snapshot and enrich with calculated scores in one pass. */
export function buildLiveTwinWithScores(input: BuildLiveTwinWithScoresInput) {
  const snapshot = captureDigitalTwinSnapshot(input);

  const scores = calculateOrgScores({
    snapshot,
    enabledAppIds: input.enabledAppIds,
    metrics: input.metricsContext,
    profile: input.profile,
    reputationOverride: input.reputationOverride,
  });

  snapshot.scores = {
    websiteHealth: getScoreValue(scores.scores, "website_health"),
    aiVisibility: getScoreValue(scores.scores, "ai_visibility"),
    seo: getScoreValue(scores.scores, "seo"),
    businessGrowth: getScoreValue(scores.scores, "business_growth"),
    businessHealth: scores.businessHealth,
    reputation: getScoreValue(scores.scores, "reputation"),
    automation: getScoreValue(scores.scores, "automation"),
    calculatedAt: new Date(),
  };

  return { snapshot, scores };
}

export function metricsContextFromLiveMetrics(
  metrics: OverviewLiveMetrics,
): OverviewMetricsContext {
  return {
    newLeadsThisWeek: metrics.newLeadsThisWeek,
    overdueFollowUps: metrics.overdueFollowUps,
    listedPropertyCount: metrics.listedPropertyCount,
    openTasksDue: metrics.openTasksDue,
    contactCount: metrics.contactCount,
    hasTimelineActivity: metrics.hasTimelineActivity,
    activeSubscriptions: metrics.activeSubscriptions,
    revenueMtdCents: metrics.revenueMtdCents,
  };
}

export function enrichSnapshotWithScores(
  snapshot: DigitalTwinSnapshot,
  enabledAppIds: string[],
  metricsContext: OverviewMetricsContext,
  profile?: OrganisationBusinessProfile | null,
) {
  const scores = calculateOrgScores({
    snapshot,
    enabledAppIds,
    metrics: metricsContext,
    profile,
  });

  snapshot.scores = {
    ...snapshot.scores,
    websiteHealth: getScoreValue(scores.scores, "website_health"),
    aiVisibility: getScoreValue(scores.scores, "ai_visibility"),
    seo: getScoreValue(scores.scores, "seo"),
    businessGrowth: getScoreValue(scores.scores, "business_growth"),
    businessHealth: scores.businessHealth,
    reputation: getScoreValue(scores.scores, "reputation"),
    automation: getScoreValue(scores.scores, "automation"),
    calculatedAt: new Date(),
  };

  return { snapshot, scores };
}
