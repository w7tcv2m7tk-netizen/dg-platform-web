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
  type AnalyticsTrendPoint,
  type OrganisationBusinessProfile,
  type OverviewConnectorProbes,
  type OverviewLiveMetrics,
  type ScoreResult,
} from "@dg/platform-core";

import type { AnalyticsBusinessInsight } from "@/components/analytics/AnalyticsBusinessIntelligence";
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
  insights: AnalyticsBusinessInsight[];
};

const DEFAULT_TWIN_SCORES: AnalyticsTwinScores = {
  seo: 0,
  aiVisibility: 0,
  websiteHealth: 0,
  reputation: 0,
  businessHealth: 0,
};

function buildBusinessInsights(
  metrics: OverviewLiveMetrics | null,
  scores: AnalyticsTwinScores,
  connectors: OverviewConnectorProbes,
  canViewFinancials: boolean,
): AnalyticsBusinessInsight[] {
  if (!metrics) {
    return [{
      id: "connect-data",
      title: "Connect your operating data",
      detail: "DigitalGate needs CRM and business activity before it can identify reliable trends, risks and opportunities.",
      action: "Connect data sources",
      href: "/apps/analytics/connectors",
      tone: "info",
    }];
  }

  const insights: AnalyticsBusinessInsight[] = [];
  const totalLeads = metrics.vendorLeadCount + metrics.buyerLeadCount;

  if (metrics.overdueFollowUps > 0) {
    insights.push({
      id: "overdue-follow-up",
      title: `${metrics.overdueFollowUps} lead follow-up${metrics.overdueFollowUps === 1 ? " is" : "s are"} overdue`,
      detail: "These enquiries have passed their response deadline without a first response. Fast follow-up is one of the clearest conversion levers available now.",
      action: "Clear overdue leads",
      href: "/apps/crm/leads",
      tone: "attention",
    });
  }

  if (metrics.newLeadsThisWeek > 0) {
    insights.push({
      id: "lead-momentum",
      title: `${metrics.newLeadsThisWeek} new enquir${metrics.newLeadsThisWeek === 1 ? "y" : "ies"} this week`,
      detail: metrics.openOpportunityCount > 0
        ? `${metrics.openOpportunityCount} open opportunities are carrying current demand into the pipeline.`
        : "Demand is arriving, but there are no open opportunities yet. Qualifying these leads will make pipeline performance measurable.",
      action: metrics.openOpportunityCount > 0 ? "Review pipeline" : "Qualify leads",
      href: metrics.openOpportunityCount > 0 ? "/apps/crm/opportunities" : "/apps/crm/leads",
      tone: "positive",
    });
  } else if (totalLeads > 0) {
    insights.push({
      id: "lead-velocity",
      title: "Lead velocity has slowed this week",
      detail: "CRM contains enquiries, but no new leads have been recorded this week. Check acquisition channels before the pipeline begins to thin.",
      action: "Review lead sources",
      href: "/apps/crm/leads",
      tone: "opportunity",
    });
  }

  if (metrics.openOpportunityCount > 0 && metrics.pipelineValueCents > 0) {
    const average = Math.round(metrics.pipelineValueCents / metrics.openOpportunityCount / 100);
    insights.push({
      id: "pipeline",
      title: "Pipeline has measurable value",
      detail: `${metrics.openOpportunityCount} open opportunit${metrics.openOpportunityCount === 1 ? "y" : "ies"} are active, averaging about $${average.toLocaleString("en-AU")} in recorded value each.`,
      action: "Inspect opportunities",
      href: "/apps/crm/opportunities",
      tone: "positive",
    });
  }

  if (canViewFinancials && metrics.overdueArCents > 0) {
    insights.push({
      id: "overdue-ar",
      title: "Overdue revenue needs attention",
      detail: `$${Math.round(metrics.overdueArCents / 100).toLocaleString("en-AU")} is overdue. Collections are a direct cash-flow opportunity before more acquisition spend is added.`,
      action: "Review invoices",
      href: "/apps/commerce/invoices",
      tone: "attention",
    });
  } else if (canViewFinancials && metrics.revenueMtdCents > 0) {
    insights.push({
      id: "revenue",
      title: "Revenue is flowing through DigitalGate",
      detail: `$${Math.round(metrics.revenueMtdCents / 100).toLocaleString("en-AU")} has been recorded this month, giving Analytics a live commercial baseline for future comparisons.`,
      action: "Review commerce",
      href: "/apps/commerce/invoices",
      tone: "positive",
    });
  }

  const digitalScores = [
    { id: "seo", label: "SEO", value: scores.seo, href: "/apps/seo" },
    { id: "ai", label: "AI Visibility", value: scores.aiVisibility, href: "/apps/ai-visibility" },
    { id: "website", label: "Website", value: scores.websiteHealth, href: "/apps/websites/health" },
    { id: "reputation", label: "Reputation", value: scores.reputation, href: "/apps/reviews" },
  ].filter((item) => item.value > 0);
  const weakest = digitalScores.sort((a, b) => a.value - b.value)[0];
  if (weakest && weakest.value < 70) {
    insights.push({
      id: `digital-${weakest.id}`,
      title: `${weakest.label} is the weakest measured digital signal`,
      detail: `${weakest.label} is currently ${weakest.value}/100. Improving the weakest evidence layer is likely to lift overall digital health more efficiently than spreading effort evenly.`,
      action: `Improve ${weakest.label}`,
      href: weakest.href,
      tone: "opportunity",
    });
  }

  if (!connectors.website?.ok) {
    insights.push({
      id: "website-source",
      title: "Website performance is not fully connected",
      detail: "Connect website health data so DigitalGate can relate demand, conversion and digital visibility to the site experience.",
      action: "Connect website data",
      href: "/apps/websites/health",
      tone: "info",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "healthy-baseline",
      title: "No immediate operating exception detected",
      detail: "The currently connected signals do not show an urgent follow-up, pipeline, revenue or digital-health exception. Keep building history so trend detection becomes stronger.",
      action: "Explore reports",
      href: "/apps/analytics/reports",
      tone: "positive",
    });
  }

  return insights.slice(0, 6);
}

function redactFinancialReporting(bundle: AnalyticsBundle): AnalyticsBundle {
  const dataSources = bundle.dataSources.filter((source) => source.id !== "stripe");
  return {
    ...bundle,
    keyMetrics: bundle.keyMetrics.map((metric) =>
      metric.id === "revenue"
        ? { ...metric, value: "—", context: "Restricted by your permissions", status: "unavailable", href: undefined }
        : metric,
    ),
    dataSources,
    connectedSourceCount: dataSources.filter((source) => source.status === "connected").length,
    predefinedDashboards: bundle.predefinedDashboards.map((dashboard) =>
      dashboard.id === "executive"
        ? { ...dashboard, description: "Leads, pipeline, conversion, health and growth", metrics: dashboard.metrics.filter((metric) => metric !== "Revenue") }
        : dashboard,
    ),
    reportTemplates: bundle.reportTemplates.map((report) => ({ ...report, sections: report.sections.filter((section) => section !== "Revenue") })),
  };
}

function applyNativeReviewSource(bundle: AnalyticsBundle, feedStatus: { ok: boolean; total: number }): AnalyticsBundle {
  const dataSources = bundle.dataSources.map((source) => {
    if (source.id !== "reviews") return source;
    if (!feedStatus.ok) return { ...source, status: "not_connected" as const, statusLabel: "Not connected", updatedLabel: "Not connected", detail: "Connect review sources to unlock reputation metrics", href: "/apps/reviews/sources" };
    return { ...source, status: "connected" as const, statusLabel: "Connected", updatedLabel: "Live", detail: `${feedStatus.total} review${feedStatus.total === 1 ? "" : "s"} available from connected sources`, href: "/apps/reviews" };
  });
  return { ...bundle, dataSources, connectedSourceCount: dataSources.filter((source) => source.status === "connected").length };
}

async function loadLeadHistory(organisationId: string): Promise<{ points: AnalyticsTrendPoint[]; note: string }> {
  const { prisma } = await import("@dg/database");
  const now = new Date();
  const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 7, 1));
  const months = Array.from({ length: 8 }, (_, index) => {
    const date = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + index, 1));
    return { key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`, label: date.toLocaleDateString("en-AU", { month: "short", timeZone: "UTC" }) };
  });
  const leads = await prisma.lead.findMany({ where: { organisationId, createdAt: { gte: firstMonth } }, select: { createdAt: true } });
  const counts = new Map(months.map((month) => [month.key, 0]));
  for (const lead of leads) {
    const key = `${lead.createdAt.getUTCFullYear()}-${String(lead.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return { points: months.map((month) => ({ label: month.label, value: counts.get(month.key) ?? 0 })), note: leads.length > 0 ? "Monthly CRM leads created over the last eight months." : "Add leads in CRM to begin building a monthly lead history." };
}

export async function loadAnalyticsPageData(): Promise<AnalyticsPageData> {
  const { session: platformSession } = await getPlatformPageContext();
  const organisationName = platformSession?.organisationName ?? "Your business";
  if (!platformSession) {
    const bundle = buildAnalyticsBundle({ organisationName });
    return { bundle, metrics: null, scoreResults: [], twinScores: DEFAULT_TWIN_SCORES, healthTrend: [], connectors: {}, profile: null, canViewOrganisationFinancials: false, insights: buildBusinessInsights(null, DEFAULT_TWIN_SCORES, {}, false) };
  }

  const canViewOrganisationFinancials = sessionCan(platformSession, { module: "commerce", action: "view", scope: "organisation" });
  const enabledAppIds = await getOrgEnabledAppIds();
  const [metrics, connectors, profile, healthHistory, reviewsBundle, leadHistory] = await Promise.all([
    gatherOverviewLiveMetrics(platformSession.organisationId, { includeFinancials: canViewOrganisationFinancials }),
    fetchOverviewConnectorProbes(enabledAppIds, platformSession.organisationId),
    getOrganisationBusinessProfile(platformSession.organisationId),
    loadHealthHistory(platformSession.organisationId),
    loadReviewsSessionAndFeed(),
    loadLeadHistory(platformSession.organisationId),
  ]);

  let scoreResults: ScoreResult[] = [];
  let twinScores = DEFAULT_TWIN_SCORES;
  let twinScoresResult = null;
  const reputationFromFeed = computeReputationScore(reviewsBundle.feed);
  if (metrics) {
    const { scores } = buildLiveTwinWithScores({ organisationId: platformSession.organisationId, organisationName: platformSession.organisationName, enabledAppIds, metrics, connectors, profile, metricsContext: metricsContextFromLiveMetrics(metrics), reputationOverride: reputationFromFeed.score });
    twinScoresResult = scores;
    scoreResults = scores.scores;
    twinScores = { seo: getScoreValue(scores.scores, "seo"), aiVisibility: getScoreValue(scores.scores, "ai_visibility"), websiteHealth: getScoreValue(scores.scores, "website_health"), reputation: reputationFromFeed.score ?? 0, businessHealth: scores.businessHealth };
  }

  const healthTrend = healthTrendFromHistory(healthHistory, twinScores.businessHealth);
  const baseBundle = { ...buildAnalyticsBundle({ organisationName, metrics, connectors, scores: twinScoresResult, reputationScore: reputationFromFeed.score, profile }), leadTrend: leadHistory.points, leadTrendNote: leadHistory.note };
  const nativeBundle = applyNativeReviewSource(baseBundle, { ok: reviewsBundle.feedStatus.ok, total: reviewsBundle.feedStatus.total });
  const bundle = canViewOrganisationFinancials ? nativeBundle : redactFinancialReporting(nativeBundle);
  return { bundle, metrics, scoreResults, twinScores, healthTrend, connectors, profile, canViewOrganisationFinancials, insights: buildBusinessInsights(metrics, twinScores, connectors, canViewOrganisationFinancials) };
}
