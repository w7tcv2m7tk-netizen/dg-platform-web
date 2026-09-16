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

export type AnalyticsInsight = {
  id: string;
  tone: "positive" | "attention" | "opportunity" | "neutral";
  title: string;
  body: string;
  actionLabel: string;
  href: string;
};

export type AnalyticsBreakdown = {
  label: string;
  value: number;
};

export type AnalyticsOperationalData = {
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  leadConversionRate: number | null;
  totalOpportunities: number;
  openOpportunities: number;
  wonOpportunities: number;
  opportunityWinRate: number | null;
  opportunityPipelineCents: number;
  weightedPipelineCents: number;
  contactsCreated30d: number;
  activities30d: number;
  tasksOpen: number;
  tasksOverdue: number;
  leadSources: AnalyticsBreakdown[];
  opportunityStages: AnalyticsBreakdown[];
};

export type AnalyticsPageData = {
  bundle: AnalyticsBundle;
  metrics: OverviewLiveMetrics | null;
  operational: AnalyticsOperationalData | null;
  insights: AnalyticsInsight[];
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
    reportTemplates: bundle.reportTemplates.map((report) => ({
      ...report,
      sections: report.sections.filter((section) => section !== "Revenue"),
    })),
  };
}

function applyNativeReviewSource(bundle: AnalyticsBundle, feedStatus: { ok: boolean; total: number }): AnalyticsBundle {
  const dataSources = bundle.dataSources.map((source) => {
    if (source.id !== "reviews") return source;
    if (!feedStatus.ok) {
      return { ...source, status: "not_connected" as const, statusLabel: "Not connected", updatedLabel: "Not connected", detail: "Connect review sources to unlock reputation metrics", href: "/apps/reviews/sources" };
    }
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

async function loadOperationalAnalytics(organisationId: string): Promise<AnalyticsOperationalData> {
  const { prisma } = await import("@dg/database");
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const [leads, opportunities, contactsCreated30d, activities30d, tasksOpen, tasksOverdue] = await Promise.all([
    prisma.lead.findMany({ where: { organisationId }, select: { status: true, source: true } }),
    prisma.opportunity.findMany({ where: { organisationId }, select: { status: true, stage: true, valueCents: true, probability: true } }),
    prisma.contact.count({ where: { organisationId, deletedAt: null, createdAt: { gte: since30d } } }),
    prisma.activity.count({ where: { organisationId, createdAt: { gte: since30d } } }),
    prisma.task.count({ where: { organisationId, status: "open" } }),
    prisma.task.count({ where: { organisationId, status: "open", dueAt: { lt: now } } }),
  ]);

  const convertedStatuses = new Set(["converted", "won", "closed_won"]);
  const qualifiedStatuses = new Set(["qualified", "contacted", "converted", "won", "closed_won"]);
  const wonStatuses = new Set(["won", "closed_won"]);
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter((lead) => qualifiedStatuses.has(lead.status.toLowerCase())).length;
  const convertedLeads = leads.filter((lead) => convertedStatuses.has(lead.status.toLowerCase())).length;
  const totalOpportunities = opportunities.length;
  const openOpportunities = opportunities.filter((opportunity) => opportunity.status.toLowerCase() === "open").length;
  const wonOpportunities = opportunities.filter((opportunity) => wonStatuses.has(opportunity.status.toLowerCase())).length;
  const open = opportunities.filter((opportunity) => opportunity.status.toLowerCase() === "open");
  const opportunityPipelineCents = open.reduce((sum, opportunity) => sum + (opportunity.valueCents ?? 0), 0);
  const weightedPipelineCents = open.reduce((sum, opportunity) => sum + Math.round((opportunity.valueCents ?? 0) * ((opportunity.probability ?? 0) / 100)), 0);
  const sourceCounts = new Map<string, number>();
  for (const lead of leads) sourceCounts.set(lead.source || "Unknown", (sourceCounts.get(lead.source || "Unknown") ?? 0) + 1);
  const stageCounts = new Map<string, number>();
  for (const opportunity of open) stageCounts.set(opportunity.stage || "Open", (stageCounts.get(opportunity.stage || "Open") ?? 0) + 1);
  const sortBreakdown = (map: Map<string, number>) => [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  return {
    totalLeads,
    qualifiedLeads,
    convertedLeads,
    leadConversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : null,
    totalOpportunities,
    openOpportunities,
    wonOpportunities,
    opportunityWinRate: totalOpportunities > 0 ? Math.round((wonOpportunities / totalOpportunities) * 100) : null,
    opportunityPipelineCents,
    weightedPipelineCents,
    contactsCreated30d,
    activities30d,
    tasksOpen,
    tasksOverdue,
    leadSources: sortBreakdown(sourceCounts),
    opportunityStages: sortBreakdown(stageCounts),
  };
}

function buildInsights(metrics: OverviewLiveMetrics | null, operational: AnalyticsOperationalData | null, scores: AnalyticsTwinScores, connectedSourceCount: number): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];
  if (!metrics || !operational) return insights;
  if (metrics.overdueFollowUps > 0 || operational.tasksOverdue > 0) insights.push({ id: "follow-up", tone: "attention", title: "Follow-up queue needs attention", body: `${metrics.overdueFollowUps} lead follow-up${metrics.overdueFollowUps === 1 ? " is" : "s are"} overdue and ${operational.tasksOverdue} task${operational.tasksOverdue === 1 ? " is" : "s are"} overdue. Clearing these protects conversion and customer experience.`, actionLabel: "Open tasks", href: "/apps/crm/tasks" });
  if (operational.openOpportunities > 0 && operational.weightedPipelineCents > 0) insights.push({ id: "pipeline", tone: "opportunity", title: "Pipeline has forecastable value", body: `${operational.openOpportunities} open opportunities carry probability-weighted value. Use this to prioritise the deals most likely to convert rather than treating every opportunity equally.`, actionLabel: "Review opportunities", href: "/apps/crm/opportunities" });
  if (operational.totalLeads > 0 && operational.leadConversionRate !== null && operational.leadConversionRate < 20) insights.push({ id: "conversion", tone: "attention", title: "Lead conversion has room to improve", body: `Recorded lead conversion is ${operational.leadConversionRate}%. Review source quality, response time and nurture workflows before increasing acquisition spend.`, actionLabel: "Review leads", href: "/apps/crm/leads" });
  if (metrics.newLeadsThisWeek > 0) insights.push({ id: "demand", tone: "positive", title: "Fresh demand is entering the business", body: `${metrics.newLeadsThisWeek} new lead${metrics.newLeadsThisWeek === 1 ? "" : "s"} arrived this week. Keep response times tight and make sure each qualified enquiry has a clear next action.`, actionLabel: "See new leads", href: "/apps/crm/leads" });
  if (scores.businessHealth > 0 && scores.businessHealth < 70) insights.push({ id: "health", tone: "attention", title: "Business Health is below target", body: `Business Health is ${scores.businessHealth}/100. The score reflects connected evidence across operations and digital performance; strengthen the weakest evidence areas first.`, actionLabel: "View Business Health", href: "/dashboard/health" });
  if (connectedSourceCount < 3) insights.push({ id: "coverage", tone: "neutral", title: "Analytics coverage can be deeper", body: `Only ${connectedSourceCount} data source${connectedSourceCount === 1 ? " is" : "s are"} currently contributing. Connecting more systems will improve attribution, trend quality and Aida's recommendations.`, actionLabel: "Connect data sources", href: "/apps/analytics/connectors" });
  return insights.slice(0, 5);
}

export async function loadAnalyticsPageData(): Promise<AnalyticsPageData> {
  const { session: platformSession } = await getPlatformPageContext();
  const organisationName = platformSession?.organisationName ?? "Your business";
  if (!platformSession) {
    const bundle = buildAnalyticsBundle({ organisationName });
    return { bundle, metrics: null, operational: null, insights: [], scoreResults: [], twinScores: DEFAULT_TWIN_SCORES, healthTrend: [], connectors: {}, profile: null, canViewOrganisationFinancials: false };
  }

  const canViewOrganisationFinancials = sessionCan(platformSession, { module: "commerce", action: "view", scope: "organisation" });
  const enabledAppIds = await getOrgEnabledAppIds();
  const [metrics, operational, connectors, profile, healthHistory, reviewsBundle, leadHistory] = await Promise.all([
    gatherOverviewLiveMetrics(platformSession.organisationId, { includeFinancials: canViewOrganisationFinancials }),
    loadOperationalAnalytics(platformSession.organisationId),
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
  const insights = buildInsights(metrics, operational, twinScores, bundle.connectedSourceCount);
  return { bundle, metrics, operational, insights, scoreResults, twinScores, healthTrend, connectors, profile, canViewOrganisationFinancials };
}
