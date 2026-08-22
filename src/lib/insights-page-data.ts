import {
  buildLiveTwinWithScores,
  computeReputationScore,
  gatherOverviewLiveMetrics,
  generateBusinessIntelligence,
  getOrganisationGoals,
  getOrganisationBusinessProfile,
  metricsContextFromLiveMetrics,
  type GeneratedIntelligence,
} from "@dg/platform-core";

import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIds, getPlatformPageContext } from "@/lib/org-apps";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export type InsightsPageData = {
  organisationName: string;
  userDisplayName: string;
  intelligence: GeneratedIntelligence | null;
};

export async function loadInsightsPageData(): Promise<InsightsPageData | null> {
  const { session, user, name } = await getPlatformPageContext();
  if (!session) return null;

  const userDisplayName = user?.firstName ?? name ?? "there";
  const enabledAppIds = await getOrgEnabledAppIds();
  const [profile, metrics, connectors, goals, reviewsBundle] = await Promise.all([
    getOrganisationBusinessProfile(session.organisationId),
    gatherOverviewLiveMetrics(session.organisationId),
    fetchOverviewConnectorProbes(enabledAppIds, session.organisationId),
    getOrganisationGoals(session.organisationId),
    loadReviewsSessionAndFeed(),
  ]);

  if (!metrics) {
    return {
      organisationName: session.organisationName,
      userDisplayName,
      intelligence: null,
    };
  }

  const reputation = computeReputationScore(reviewsBundle.feed);
  const { snapshot, scores } = buildLiveTwinWithScores({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    enabledAppIds,
    metrics,
    connectors,
    profile,
    metricsContext: metricsContextFromLiveMetrics(metrics),
    reputationOverride: reputation.score,
  });

  const intelligence = generateBusinessIntelligence({
    organisationName: session.organisationName,
    userDisplayName,
    enabledAppIds,
    metrics,
    connectors,
    snapshot,
    scores,
    goals,
  });

  return {
    organisationName: session.organisationName,
    userDisplayName,
    intelligence,
  };
}
