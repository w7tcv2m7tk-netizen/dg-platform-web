import type { OrganisationBusinessProfile } from "../org/business-profile-types";
import { generateBusinessIntelligence } from "../intelligence/generate-intelligence";
import { calculateOrgScores, getScoreValue } from "../scoring/calculate-scores";
import { captureDigitalTwinSnapshot } from "../twin/capture-snapshot";
import type { PlatformSetupStatus } from "../org/setup-status";
import type { OverviewConnectorProbes } from "./connector-probes";
import type { OverviewLiveMetrics } from "./gather-live-metrics";
import type { HealthHistoryEntry } from "./health-history";
import { healthDeltaFromHistory, healthTrendFromHistory } from "./health-history";
import { buildSetupProgress } from "./setup-progress";
import { buildGrowthOpportunities } from "./growth-opportunities";
import { enquiryInboxHref, hasRealEstateWorkspace } from "../leads/inbox-href";
import {
  formatRelativeTimelineLabel,
  formatTimelineTime,
  hourInTimeZone,
} from "../time/display";
import {
  evaluateOrganisationGoals,
  type OrganisationGoal,
} from "../org/goals";
import type {
  BusinessOverview,
  OverviewConnectedSystem,
  OverviewGoalProgress,
  OverviewSetupProgress,
  OverviewSnapshotKpi,
  OverviewTimelineEntry,
  OverviewWidgetId,
} from "./types";

export interface BuildBusinessOverviewInput {
  organisationId?: string;
  organisationName: string;
  userDisplayName: string;
  enabledAppIds: string[];
  setupStatus?: PlatformSetupStatus | null;
  businessProfile?: {
    businessName?: string;
    tradingName?: string;
    logoUrl?: string;
    brandColours?: string;
    brandVoice?: { tagline?: string };
  } | null;
  activities?: Array<{
    id: string;
    title: string;
    body?: string | null;
    createdAt: string;
    sourceApp?: string | null;
  }>;
  /** Live metrics from Postgres — when set, enables live scoring and BI */
  liveMetrics?: OverviewLiveMetrics | null;
  /** Connector probes from app layer (WordPress, Stripe, etc.) */
  connectorProbes?: OverviewConnectorProbes;
  /** Stored monthly Business Health scores */
  healthHistory?: HealthHistoryEntry[];
  /** Organisation goals — Twin progress + Advisor ranking */
  goals?: OrganisationGoal[];
}

function greetingForHour(hour: number, name: string) {
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

function formatTimeLabel(iso: string) {
  return formatRelativeTimelineLabel(iso);
}

function formatAud(cents: number) {
  if (cents <= 0) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatPipeline(cents: number) {
  if (cents <= 0) return "—";
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${Math.round(dollars / 1_000)}k`;
  return formatAud(cents);
}

function timelineFromActivities(
  activities: BuildBusinessOverviewInput["activities"],
): OverviewTimelineEntry[] {
  if (!activities?.length) return [];
  return activities.slice(0, 8).map((a) => ({
    id: a.id,
    timeLabel: formatTimeLabel(a.createdAt),
    title: a.body ? `${a.title} — ${a.body}` : a.title,
  }));
}

function widgetsForApps(enabledAppIds: string[]): OverviewWidgetId[] {
  const base: OverviewWidgetId[] = [
    "daily_briefing",
    "priorities",
    "business_health",
    "snapshot",
    "intelligence",
    "recommended_actions",
    "timeline",
    "performance_trends",
    "connected_systems",
    "ai_studio",
    "growth_opportunities",
    "recent_reports",
  ];
  if (enabledAppIds.includes("real-estate") || enabledAppIds.includes("crm")) {
    base.push("team_activity");
  }
  return base;
}

function buildSnapshotKpis(
  metrics: OverviewLiveMetrics,
  enabledAppIds: string[],
  connectors: OverviewConnectorProbes,
): OverviewSnapshotKpi[] {
  const enquiryHref = enquiryInboxHref(enabledAppIds);
  const kpis: OverviewSnapshotKpi[] = [
    {
      id: "leads",
      label: "New Leads",
      value: metrics.newLeadsThisWeek > 0 ? String(metrics.newLeadsThisWeek) : "—",
      href: enquiryHref,
    },
    {
      id: "tasks",
      label: "Tasks Due",
      value: metrics.openTasksDue > 0 ? String(metrics.openTasksDue) : "—",
      href: "/apps/automation",
    },
  ];

  if (hasRealEstateWorkspace(enabledAppIds)) {
    kpis.push({
      id: "appointments",
      label: "Bookings",
      value:
        connectors.reSummary?.bookingsThisMonth != null
          ? String(connectors.reSummary.bookingsThisMonth)
          : "—",
    });
    kpis.push({
      id: "revenue",
      label: "Revenue This Month",
      value: formatAud(metrics.revenueMtdCents),
      href: "/apps/commerce",
    });
    kpis.push({
      id: "pipeline",
      label: "Pipeline",
      value: formatPipeline(metrics.pipelineValueCents),
      href: "/apps/re/vendor-leads",
    });
  } else {
    kpis.push({
      id: "revenue",
      label: "Revenue This Month",
      value: formatAud(metrics.revenueMtdCents),
      href: "/apps/commerce",
    });
    kpis.push({
      id: "contacts",
      label: "Contacts",
      value: metrics.contactCount > 0 ? String(metrics.contactCount) : "—",
      href: "/apps/crm/contacts",
    });
  }

  if (enabledAppIds.includes("accommodation") && connectors.accommodation?.occupancyRate != null) {
    kpis.splice(2, 0, {
      id: "occupancy",
      label: "Occupancy",
      value: `${connectors.accommodation.occupancyRate}%`,
      href: "/apps/accommodation",
    });
  }

  return kpis;
}

function buildConnectedSystems(connectors: OverviewConnectorProbes): OverviewConnectedSystem[] {
  const websiteStatus = !connectors.website
    ? ("offline" as const)
    : !connectors.website.ok
      ? ("offline" as const)
      : (connectors.website.score ?? 0) >= 85
        ? ("healthy" as const)
        : (connectors.website.score ?? 0) >= 70
          ? ("connected" as const)
          : ("warning" as const);

  const systems: OverviewConnectedSystem[] = [
    {
      id: "website",
      label: "Website",
      status: websiteStatus,
      detail: connectors.website?.score ? `${connectors.website.score}/100` : undefined,
    },
    {
      id: "wordpress",
      label: "WordPress",
      status: connectors.wordpress?.ok ? "connected" : "offline",
      detail: connectors.wordpress?.lastSyncAt
        ? `Synced ${formatTimeLabel(connectors.wordpress.lastSyncAt)}`
        : undefined,
    },
    {
      id: "stripe",
      label: "Stripe",
      status: connectors.stripeOk ? "connected" : "warning",
      detail: connectors.stripeMode && connectors.stripeMode !== "unset" ? connectors.stripeMode : undefined,
    },
    {
      id: "google",
      label: "Google",
      status: connectors.website?.ok ? "connected" : "offline",
    },
    {
      id: "crm",
      label: "CRM",
      status: connectors.wordpress?.ok ? "connected" : "warning",
    },
    {
      id: "voice",
      label: "AI Communications",
      status: "offline",
      detail: "Coming soon",
    },
    {
      id: "domains",
      label: "Domains",
      status: connectors.website?.ok ? "healthy" : "offline",
      detail: connectors.website?.siteLabel,
    },
  ];

  return systems.sort((a, b) =>
    a.label.localeCompare(b.label, "en", { sensitivity: "base" }),
  );
}

function buildOpportunities(input: {
  enabledAppIds: string[];
  scores?: import("../scoring/types").ScoreResult[];
  businessProfile?: OrganisationBusinessProfile | null;
  connectorProbes?: OverviewConnectorProbes;
  setupPercent?: number;
}) {
  return buildGrowthOpportunities(input);
}

function overviewGoalsFrom(
  goals: OrganisationGoal[] | undefined,
  snapshot: import("../twin/types").DigitalTwinSnapshot | null,
  enabledAppIds: string[],
): OverviewGoalProgress[] {
  return evaluateOrganisationGoals(
    (goals ?? []).filter((goal) => goal.status === "active" || goal.status === "paused"),
    snapshot,
    enabledAppIds,
  ).map((item) => ({
    id: item.goal.id,
    title: item.goal.title,
    percent: item.percent,
    currentLabel: item.currentLabel,
    targetLabel: item.targetLabel,
    href: item.href,
    status: item.goal.status,
  }));
}

/** Build CEO dashboard payload from live Twin → Scoring → BI pipeline. */
export function buildBusinessOverview(input: BuildBusinessOverviewInput): BusinessOverview {
  const {
    organisationName,
    userDisplayName,
    enabledAppIds,
    setupStatus,
    activities,
    liveMetrics,
    connectorProbes = {},
    healthHistory = [],
  } = input;

  const hour = hourInTimeZone();
  const firstName = userDisplayName.split(" ")[0] || userDisplayName;
  const setupIncomplete = !setupStatus?.hasContacts;
  const scoresLive = Boolean(liveMetrics);
  const setupProgress = buildSetupProgress({
    setupStatus,
    businessProfile: input.businessProfile as OrganisationBusinessProfile | null,
    connectorProbes,
    enabledAppIds,
    hasSession: Boolean(input.organisationId),
  });

  if (!liveMetrics) {
    return buildPreviewOverview(input, firstName, hour, setupIncomplete, setupProgress);
  }

  const snapshot = captureDigitalTwinSnapshot({
    organisationId: input.organisationId ?? "unknown",
    organisationName,
    enabledAppIds,
    metrics: liveMetrics,
    connectors: connectorProbes,
    profile: input.businessProfile,
  });
  snapshot.organisationId = input.organisationId ?? snapshot.organisationId;

  const metricsContext = {
    newLeadsThisWeek: liveMetrics.newLeadsThisWeek,
    overdueFollowUps: liveMetrics.overdueFollowUps,
    listedPropertyCount: liveMetrics.listedPropertyCount,
    openTasksDue: liveMetrics.openTasksDue,
    contactCount: liveMetrics.contactCount,
    hasTimelineActivity: liveMetrics.hasTimelineActivity,
    activeSubscriptions: liveMetrics.activeSubscriptions,
    revenueMtdCents: liveMetrics.revenueMtdCents,
  };

  const scores = calculateOrgScores({
    snapshot,
    enabledAppIds,
    metrics: metricsContext,
    profile: input.businessProfile as OrganisationBusinessProfile | null,
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

  const intelligence = generateBusinessIntelligence({
    organisationName,
    userDisplayName: firstName,
    enabledAppIds,
    metrics: liveMetrics,
    connectors: connectorProbes,
    snapshot,
    scores,
    goals: input.goals,
  });

  const businessHealth = scores.businessHealth;
  const healthDelta =
    healthHistory.length >= 2
      ? healthDeltaFromHistory(healthHistory, businessHealth)
      : scores.businessHealthDelta;
  const healthTrend = healthTrendFromHistory(healthHistory, businessHealth);

  const timeline = timelineFromActivities(activities);

  const opportunities = buildOpportunities({
    enabledAppIds,
    scores: scores.scores,
    businessProfile: input.businessProfile as OrganisationBusinessProfile | null,
    connectorProbes,
    setupPercent: setupProgress.percent,
  });

  return {
    organisationName,
    userDisplayName: firstName,
    greeting: greetingForHour(hour, firstName),
    businessHealth,
    businessHealthDelta: healthDelta,
    businessHealthDeltaLabel: `${healthDelta >= 0 ? "+" : ""}${healthDelta} this month`,
    lastUpdatedLabel: formatTimelineTime(new Date().toISOString()),
    scoresLive,
    dailyBriefing: intelligence.dailyBriefing,
    priorities: intelligence.priorities,
    prioritiesImpact: intelligence.prioritiesImpact,
    scoreBreakdown: [
      { id: "ai_visibility", label: "AI Visibility", value: getScoreValue(scores.scores, "ai_visibility"), href: "/apps/ai-visibility" },
      { id: "seo", label: "SEO", value: getScoreValue(scores.scores, "seo"), href: "/apps/seo" },
      { id: "website", label: "Website", value: getScoreValue(scores.scores, "website_health"), href: "/apps/websites/health" },
      { id: "marketing", label: "Marketing", value: getScoreValue(scores.scores, "business_growth"), href: "/apps/marketing" },
      { id: "sales", label: "Sales", value: getScoreValue(scores.scores, "conversion"), href: enquiryInboxHref(enabledAppIds) },
      { id: "cx", label: "Customer Experience", value: getScoreValue(scores.scores, "reputation"), href: "/apps/reviews" },
      { id: "automation", label: "Automation", value: getScoreValue(scores.scores, "automation"), href: "/apps/automation" },
      { id: "finance", label: "Finance", value: scores.financeScore, href: "/apps/commerce" },
    ],
    snapshot: buildSnapshotKpis(liveMetrics, enabledAppIds, connectorProbes),
    insights: intelligence.insights,
    recommendedActions: intelligence.recommendedActions,
    timeline: timeline.length
      ? timeline
      : [{ id: "empty", timeLabel: "—", title: "No activity yet — actions across your apps will appear here." }],
    healthTrend,
    connectedSystems: buildConnectedSystems(connectorProbes),
    aiPrompts: [
      { id: "pipeline", label: "Summarise my pipeline", prompt: "Summarise my sales pipeline and highlight priorities for today." },
      { id: "newsletter", label: "Write a newsletter", prompt: "Draft a client newsletter for this month." },
      { id: "suburb", label: "Analyse this suburb", prompt: "Analyse market trends for my target suburb." },
      { id: "landing", label: "Create a landing page", prompt: "Outline a high-converting landing page for my next campaign." },
      { id: "automation", label: "Build an automation", prompt: "Suggest an automation to improve lead follow-up." },
      { id: "proposal", label: "Generate a proposal", prompt: "Generate a client proposal with services and pricing." },
    ],
    growthOpportunities: opportunities.items,
    growthOpportunityCount: opportunities.totalCount,
    recentReports: [
      { id: "growth", label: "Monthly Growth Report", href: "/command/reports" },
      { id: "seo", label: "SEO Report", href: "/apps/seo" },
      { id: "ai-vis", label: "AI Visibility Report", href: "/apps/ai-visibility" },
      { id: "revenue", label: "Revenue Report", href: "/apps/commerce" },
      { id: "web", label: "Website Audit", href: "/apps/websites/health" },
    ],
    teamActivity: [],
    goals: overviewGoalsFrom(input.goals, snapshot, enabledAppIds),
    visibleWidgets: widgetsForApps(enabledAppIds),
    setupIncomplete,
    setupProgress,
  };
}

/** Fallback preview when no database session / live metrics. */
function buildPreviewOverview(
  input: BuildBusinessOverviewInput,
  firstName: string,
  hour: number,
  setupIncomplete: boolean,
  setupProgress: OverviewSetupProgress,
): BusinessOverview {
  const { organisationName, enabledAppIds, activities } = input;
  const reOrg = /roe|realty|real estate|estate/i.test(organisationName);

  const opportunities = buildOpportunities({
    enabledAppIds,
    connectorProbes: input.connectorProbes,
    businessProfile: input.businessProfile as OrganisationBusinessProfile | null,
    setupPercent: setupProgress.percent,
  });

  return {
    organisationName,
    userDisplayName: firstName,
    greeting: greetingForHour(hour, firstName),
    businessHealth: 0,
    businessHealthDelta: 0,
    businessHealthDeltaLabel: "Connect database for live scores",
    lastUpdatedLabel: formatTimelineTime(new Date().toISOString()),
    scoresLive: false,
    dailyBriefing: `Good morning ${firstName}. Connect your database and WordPress site to unlock live Business Health scores and AI briefings.`,
    priorities: [
      { rank: 1, text: "Complete platform setup and import contacts." },
      { rank: 2, text: "Connect your WordPress site via Connectors." },
      { rank: 3, text: "Enable the apps relevant to your business." },
    ],
    scoreBreakdown: [
      { id: "ai_visibility", label: "AI Visibility", value: 0, href: "/apps/ai-visibility" },
      { id: "seo", label: "SEO", value: 0, href: "/apps/seo" },
      { id: "website", label: "Website", value: 0, href: "/apps/websites/health" },
      { id: "marketing", label: "Marketing", value: 0, href: "/apps/marketing" },
      { id: "sales", label: "Sales", value: 0, href: enquiryInboxHref(enabledAppIds) },
      { id: "cx", label: "Customer Experience", value: 0, href: "/apps/reviews" },
      { id: "automation", label: "Automation", value: 0, href: "/apps/automation" },
      { id: "finance", label: "Finance", value: 0, href: "/apps/commerce" },
    ],
    snapshot: [
      { id: "leads", label: "New Leads", value: "—" },
      { id: "tasks", label: "Tasks Due", value: "—" },
      { id: "revenue", label: "Revenue This Month", value: "—", href: "/apps/commerce" },
    ],
    insights: [{ text: "Connect your systems to unlock live business intelligence.", tone: "neutral" }],
    recommendedActions: [
      {
        id: "setup",
        label: "Complete platform setup",
        impact: "Unlock live KPIs",
        href: "/dashboard/business",
        buttonLabel: "Start",
      },
    ],
    timeline: timelineFromActivities(activities).length
      ? timelineFromActivities(activities)
      : [{ id: "empty", timeLabel: "—", title: "No activity recorded yet." }],
    healthTrend: [],
    connectedSystems: buildConnectedSystems(input.connectorProbes ?? {}),
    aiPrompts: [
      { id: "pipeline", label: "Summarise my pipeline", prompt: "Summarise my sales pipeline." },
    ],
    growthOpportunities: opportunities.items,
    growthOpportunityCount: opportunities.totalCount,
    recentReports: [{ id: "web", label: "Website Audit", href: "/apps/websites/health" }],
    teamActivity: [],
    goals: overviewGoalsFrom(input.goals, null, enabledAppIds),
    visibleWidgets: widgetsForApps(enabledAppIds),
    setupIncomplete,
    setupProgress,
  };
}
