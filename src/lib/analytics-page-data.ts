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
  sessionCan,
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
  canViewOrganisationFinancials: boolean;
};

const DEFAULT_TWIN_SCORES: AnalyticsTwinScores = {
  seo: 0,
  aiVisibility: 0,
  websiteHealth: 0,
  reputation: 0,
  businessHealth: 0,
};

function redactFinancialReporting(bundle: AnalyticsBundle): AnalyticsBundle {
  const dataSources = bundle.dataSources.filter((source) => source.id !== "stripe");
  return {
    ...bundle,
    keyMetrics: bundle.keyMetrics.map((metric) =>
      metric.id === "revenue"
        ? {
            ...metric,
            value: "—",
            context: "Restricted by your permissions",
            status: "unavailable",
            href: undefined,
          }
        : metric,
    ),
    dataSources,
    connectedSourceCount: dataSources.filter((source) => source.status === "connected").length,
    predefinedDashboards: bundle.predefinedDashboards.map((dashboard) =>
      dashboard.id === "executive"
        ? {
            ...dashboard,
            description: "Leads, pipeline, conversion, health and growth",
            metrics: dashboard.metrics.filter((metric) => metric !== "Revenue"),
          }
        : dashboard,
    ),
    reportTemplates: bundle.reportTemplates.map((report) => ({
      ...report,
      sections: report.sections.filter((section) => section !== "Revenue"),
    })),
  };
}

function applyNativeReviewSource(
  bundle: AnalyticsBundle,
  feedStatus: { ok: boolean; total: number },
): AnalyticsBundle {
  const dataSources = bundle.dataSources.map((source) => {
    if (source.id !== "reviews") return source;
    if (!feedStatus.ok) {
      return {
        ...source,
        status: "not_connected" as const,
        statusLabel: "Not connected",
        updatedLabel: "Not connected",
        detail: "Connect review sources to unlock reputation metrics",
        href: "/apps/reviews/sources",
      };
    }
    return {
      ...source,
      status: "connected" as const,
      statusLabel: "Connected",
      updatedLabel: "Live",
      detail: `${feedStatus.total} review${feedStatus.total === 1 ? "" : "s"} available from connected sources`,
      href: "/apps/reviews",
    };
  });

  return {
    ...bundle,
    dataSources,
    connectedSourceCount: dataSources.filter((source) => source.status === "connected").length,
  };
}

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
      canViewOrganisationFinancials: false,
    };
  }

  const canViewOrganisationFinancials = sessionCan(platformSession, {
    module: "commerce",
    action: "view",
    scope: "organisation",
  });
  const enabledAppIds = await getOrgEnabledAppIds();
  const [metrics, connectors, profile, healthHistory, reviewsBundle] = await Promise.all([
    gatherOverviewLiveMetrics(platformSession.organisationId, {
      includeFinancials: canViewOrganisationFinancials,
    }),
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
  const baseBundle = buildAnalyticsBundle({
    organisationName,
    metrics,
    connectors,
    scores: twinScoresResult,
    reputationScore: reputationFromFeed.score,
    profile,
  });
  const nativeBundle = applyNativeReviewSource(baseBundle, {
    ok: reviewsBundle.feedStatus.ok,
    total: reviewsBundle.feedStatus.total,
  });
  const bundle = canViewOrganisationFinancials
    ? nativeBundle
    : redactFinancialReporting(nativeBundle);

  return {
    bundle,
    metrics,
    scoreResults,
    twinScores,
    healthTrend,
    connectors,
    profile,
    canViewOrganisationFinancials,
  };
}
