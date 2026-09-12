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
  OverviewScoreBreakdown,
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
  businessProfile?: OrganisationBusinessProfile | null;
  activities?: Array<{
    id: string;
    title: string;
    body?: string | null;
    createdAt: string;
    sourceApp?: string | null;
  }>;
  /** Live metrics from Postgres — when set, enables evidence evaluation and BI. */
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
      href: "/apps/crm/tasks",
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

function buildCommsSystem(connectors: OverviewConnectorProbes): OverviewConnectedSystem {
  const comms = connectors.comms;
  if (comms?.ok) {
    const detail =
      (comms.publishedAgentCount ?? 0) > 0
        ? `${comms.publishedAgentCount} agent${comms.publishedAgentCount === 1 ? "" : "s"} live`
        : comms.voiceProvider === "elevenlabs"
          ? "ElevenLabs connected"
          : comms.emailProvider === "resend"
            ? "Email connected"
            : "Live";
    return {
      id: "ai-communications",
      label: "Communications",
      status: (comms.publishedAgentCount ?? 0) > 0 ? "healthy" : "connected",
      detail,
    };
  }

  if (comms?.appEnabled) {
    return {
      id: "ai-communications",
      label: "Communications",
      status: "warning",
      detail: "Configure advanced voice",
    };
  }

  return {
    id: "ai-communications",
    label: "Communications",
    status: "offline",
    detail: "Coming soon",
  };
}

function buildConnectedSystems(
  connectors: OverviewConnectorProbes,
  websiteUrl?: string | null,
): OverviewConnectedSystem[] {
  const publicSite = Boolean(websiteUrl?.trim());
  const websiteStatus = connectors.website?.ok
    ? (connectors.website.score ?? 0) >= 85
      ? ("healthy" as const)
      : (connectors.website.score ?? 0) >= 70
        ? ("connected" as const)
        : ("warning" as const)
    : publicSite
      ? ("connected" as const)
      : ("offline" as const);

  const systems: OverviewConnectedSystem[] = [
    {
      id: "website",
      label: "Website",
      status: websiteStatus,
      detail: connectors.website?.score
        ? `${connectors.website.score}/100`
        : websiteUrl?.trim() || undefined,
    },
    ...(connectors.wordpress?.configured
      ? [
          {
            id: "wordpress" as const,
            label: "WordPress",
            status: connectors.wordpress.ok ? ("connected" as const) : ("offline" as const),
            detail: connectors.wordpress.lastSyncAt
              ? `Synced ${formatTimeLabel(connectors.wordpress.lastSyncAt)}`
              : undefined,
          },
        ]
      : []),
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
      status: "connected",
      detail: "Contacts, companies, and pipeline in DigitalGate",
    },
    buildCommsSystem(connectors),
    {
      id: "domains",
      label: "Domains",
      status: connectors.website?.ok ? "healthy" : "offline",
      detail: connectors.website?.siteLabel || undefined,
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

function buildScoreBreakdown(
  scores: ReturnType<typeof calculateOrgScores>,
  enabledAppIds: string[],
): OverviewScoreBreakdown[] {
  const rows: Array<{
    id: string;
    scoreId: import("../scoring/types").ScoreId;
    label: string;
    href: string;
  }> = [
    { id: "ai_visibility", scoreId: "ai_visibility", label: "AI Visibility", href: "/apps/ai-visibility" },
    { id: "seo", scoreId: "seo", label: "SEO", href: "/apps/seo" },
    { id: "website", scoreId: "website_health", label: "Website", href: "/apps/websites/health" },
    { id: "marketing", scoreId: "business_growth", label: "Marketing", href: "/apps/marketing" },
    { id: "sales", scoreId: "conversion", label: "Sales", href: enquiryInboxHref(enabledAppIds) },
    { id: "cx", scoreId: "reputation", label: "Customer Experience", href: "/apps/reviews" },
    { id: "automation", scoreId: "automation", label: "Automation", href: "/apps/automation" },
  ];

  const breakdown = rows.flatMap((row) => {
    const match = scores.scores.find((score) => score.scoreId === row.scoreId);
    return match ? [{ id: row.id, label: row.label, value: match.value, href: row.href }] : [];
  });
  const financeAvailable = scores.evidence.some(
    (item) => item.scoreId === "success_score" && item.state !== "unavailable",
  );
  if (financeAvailable) {
    breakdown.push({ id: "finance", label: "Finance", value: scores.financeScore, href: "/apps/commerce" });
  }
  return breakdown;
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
  const scoresLive = scores.scoresLive;

  const scoreMap = new Map(scores.scores.map((score) => [score.scoreId, score.value]));
  snapshot.scores = {
    websiteHealth: scoreMap.get("website_health"),
    aiVisibility: scoreMap.get("ai_visibility"),
    seo: scoreMap.get("seo"),
    businessGrowth: scoreMap.get("business_growth"),
    businessHealth: scoresLive ? scores.businessHealth : undefined,
    reputation: scoreMap.get("reputation"),
    automation: scoreMap.get("automation"),
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

  const businessHealth = scoresLive ? scores.businessHealth : 0;
  const healthDelta =
    scoresLive && healthHistory.length >= 2
      ? healthDeltaFromHistory(healthHistory, businessHealth)
      : 0;
  const healthTrend = scoresLive
    ? healthTrendFromHistory(healthHistory, businessHealth)
    : [];

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
    businessHealthDeltaLabel: scoresLive
      ? healthHistory.length >= 2
        ? `${healthDelta >= 0 ? "+" : ""}${healthDelta} this month`
        : "Collecting history"
      : "Not enough measured evidence",
    lastUpdatedLabel: formatTimelineTime(new Date().toISOString()),
    scoresLive,
    dailyBriefing: intelligence.dailyBriefing,
    priorities: intelligence.priorities,
    prioritiesImpact: intelligence.prioritiesImpact,
    scoreBreakdown: buildScoreBreakdown(scores, enabledAppIds),
    snapshot: buildSnapshotKpis(liveMetrics, enabledAppIds, connectorProbes),
    insights: intelligence.insights,
    recommendedActions: intelligence.recommendedActions,
    timeline: timeline.length
      ? timeline
      : [{ id: "empty", timeLabel: "—", title: "No activity yet — actions across your apps will appear here." }],
    healthTrend,
    connectedSystems: buildConnectedSystems(
      connectorProbes,
      input.businessProfile?.websiteUrl,
    ),
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
    businessHealthDeltaLabel: "Connect business services for live scores",
    lastUpdatedLabel: formatTimelineTime(new Date().toISOString()),
    scoresLive: false,
    dailyBriefing: `${greetingForHour(hour, firstName)}. Connect the systems your business uses to unlock live Business Health scores and AI briefings.`,
    priorities: [
      { rank: 1, text: "Complete platform setup and add or import contacts." },
      { rank: 2, text: "Connect the services your business uses in Connected Services." },
      { rank: 3, text: "Enable the apps relevant to your business." },
    ],
    scoreBreakdown: [],
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
    connectedSystems: buildConnectedSystems(
      input.connectorProbes ?? {},
      input.businessProfile?.websiteUrl,
    ),
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
