import { generateBusinessIntelligence } from "../intelligence/generate-intelligence";
import { calculateOrgScores, getScoreValue } from "../scoring/calculate-scores";
import { captureDigitalTwinSnapshot } from "../twin/capture-snapshot";
import type { PlatformSetupStatus } from "../org/setup-status";
import type { OverviewConnectorProbes } from "./connector-probes";
import type { OverviewLiveMetrics } from "./gather-live-metrics";
import type {
  BusinessOverview,
  OverviewConnectedSystem,
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
}

function greetingForHour(hour: number, name: string) {
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

function formatTimeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const time = d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
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
  const kpis: OverviewSnapshotKpi[] = [
    {
      id: "leads",
      label: "New Leads",
      value: metrics.newLeadsThisWeek > 0 ? String(metrics.newLeadsThisWeek) : "—",
      href: "/apps/re/vendor-leads",
    },
    {
      id: "tasks",
      label: "Tasks Due",
      value: metrics.openTasksDue > 0 ? String(metrics.openTasksDue) : "—",
      href: "/apps/automation",
    },
  ];

  if (enabledAppIds.includes("real-estate")) {
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

  return [
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
      label: "Voice AI",
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
}

function buildGrowthOpportunities(enabledAppIds: string[]) {
  const opps = [];
  if (!enabledAppIds.includes("ai-visibility")) {
    opps.push({
      id: "ai-vis",
      label: "AI Visibility Pro",
      status: "Not enabled",
      impact: "Potential +17%",
      href: "/dashboard/apps",
    });
  }
  if (!enabledAppIds.includes("reviews")) {
    opps.push({
      id: "reviews-auto",
      label: "Review Automation",
      status: "Not enabled",
      impact: "Save 8 hrs/month",
      href: "/dashboard/apps",
    });
  }
  opps.push({
    id: "web-opt",
    label: "Website Optimisation",
    status: "Available",
    impact: "Potential +11%",
    href: "/apps/websites/health",
  });
  if (!enabledAppIds.includes("marketing")) {
    opps.push({
      id: "mkt-auto",
      label: "Marketing Automation",
      status: "Recommended",
      impact: "Increase reach",
      href: "/apps/marketing",
    });
  }
  return opps;
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
  } = input;

  const hour = new Date().getHours();
  const firstName = userDisplayName.split(" ")[0] || userDisplayName;
  const setupIncomplete = !setupStatus?.hasContacts;
  const scoresLive = Boolean(liveMetrics);

  if (!liveMetrics) {
    return buildPreviewOverview(input, firstName, hour, setupIncomplete);
  }

  const snapshot = captureDigitalTwinSnapshot({
    organisationId: input.organisationId ?? "unknown",
    organisationName,
    enabledAppIds,
    metrics: liveMetrics,
    connectors: connectorProbes,
  });
  snapshot.organisationId = input.organisationId ?? snapshot.organisationId;

  const scores = calculateOrgScores({
    snapshot,
    enabledAppIds,
    metrics: {
      newLeadsThisWeek: liveMetrics.newLeadsThisWeek,
      overdueFollowUps: liveMetrics.overdueFollowUps,
      listedPropertyCount: liveMetrics.listedPropertyCount,
      openTasksDue: liveMetrics.openTasksDue,
      contactCount: liveMetrics.contactCount,
      hasTimelineActivity: liveMetrics.hasTimelineActivity,
      activeSubscriptions: liveMetrics.activeSubscriptions,
      revenueMtdCents: liveMetrics.revenueMtdCents,
    },
  });

  const intelligence = generateBusinessIntelligence({
    organisationName,
    userDisplayName: firstName,
    enabledAppIds,
    metrics: liveMetrics,
    connectors: connectorProbes,
    snapshot,
    scores,
  });

  const timeline = timelineFromActivities(activities);

  return {
    organisationName,
    userDisplayName: firstName,
    greeting: greetingForHour(hour, firstName),
    businessHealth: scores.businessHealth,
    businessHealthDelta: scores.businessHealthDelta,
    businessHealthDeltaLabel: `${scores.businessHealthDelta >= 0 ? "+" : ""}${scores.businessHealthDelta} this month`,
    lastUpdatedLabel: new Date().toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    scoresLive,
    dailyBriefing: intelligence.dailyBriefing,
    priorities: intelligence.priorities,
    prioritiesImpact: intelligence.prioritiesImpact,
    scoreBreakdown: [
      { id: "ai_visibility", label: "AI Visibility", value: getScoreValue(scores.scores, "ai_visibility"), href: "/apps/ai-visibility" },
      { id: "seo", label: "SEO", value: getScoreValue(scores.scores, "seo"), href: "/apps/seo" },
      { id: "website", label: "Website", value: getScoreValue(scores.scores, "website_health"), href: "/apps/websites/health" },
      { id: "marketing", label: "Marketing", value: getScoreValue(scores.scores, "business_growth"), href: "/apps/marketing" },
      { id: "sales", label: "Sales", value: getScoreValue(scores.scores, "conversion"), href: "/apps/re/vendor-leads" },
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
    healthTrend: scores.healthTrend,
    connectedSystems: buildConnectedSystems(connectorProbes),
    aiPrompts: [
      { id: "pipeline", label: "Summarise my pipeline", prompt: "Summarise my sales pipeline and highlight priorities for today." },
      { id: "newsletter", label: "Write a newsletter", prompt: "Draft a client newsletter for this month." },
      { id: "suburb", label: "Analyse this suburb", prompt: "Analyse market trends for my target suburb." },
      { id: "landing", label: "Create a landing page", prompt: "Outline a high-converting landing page for my next campaign." },
      { id: "automation", label: "Build an automation", prompt: "Suggest an automation to improve lead follow-up." },
      { id: "proposal", label: "Generate a proposal", prompt: "Generate a client proposal with services and pricing." },
    ],
    growthOpportunities: buildGrowthOpportunities(enabledAppIds),
    recentReports: [
      { id: "growth", label: "Monthly Growth Report", href: "/command/reports" },
      { id: "seo", label: "SEO Report", href: "/apps/seo" },
      { id: "ai-vis", label: "AI Visibility Report", href: "/apps/ai-visibility" },
      { id: "revenue", label: "Revenue Report", href: "/apps/commerce" },
      { id: "web", label: "Website Audit", href: "/apps/websites/health" },
    ],
    teamActivity: [],
    visibleWidgets: widgetsForApps(enabledAppIds),
    setupIncomplete,
  };
}

/** Fallback preview when no database session / live metrics. */
function buildPreviewOverview(
  input: BuildBusinessOverviewInput,
  firstName: string,
  hour: number,
  setupIncomplete: boolean,
): BusinessOverview {
  const { organisationName, enabledAppIds, activities } = input;
  const reOrg = /roe|realty|real estate|estate/i.test(organisationName);

  return {
    organisationName,
    userDisplayName: firstName,
    greeting: greetingForHour(hour, firstName),
    businessHealth: 87,
    businessHealthDelta: 4,
    businessHealthDeltaLabel: "+4 this month",
    lastUpdatedLabel: new Date().toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    scoresLive: false,
    dailyBriefing: `Good morning ${firstName}. Connect your database and WordPress site to unlock live Business Health scores and AI briefings.`,
    priorities: [
      { rank: 1, text: "Complete platform setup and import contacts." },
      { rank: 2, text: "Connect your WordPress site via Connectors." },
      { rank: 3, text: "Enable the apps relevant to your business." },
    ],
    scoreBreakdown: [
      { id: "ai_visibility", label: "AI Visibility", value: 92, href: "/apps/ai-visibility" },
      { id: "seo", label: "SEO", value: 84, href: "/apps/seo" },
      { id: "website", label: "Website", value: 96, href: "/apps/websites/health" },
      { id: "marketing", label: "Marketing", value: 81, href: "/apps/marketing" },
      { id: "sales", label: "Sales", value: 86, href: "/apps/re/vendor-leads" },
      { id: "cx", label: "Customer Experience", value: 89, href: "/apps/reviews" },
      { id: "automation", label: "Automation", value: 78, href: "/apps/automation" },
      { id: "finance", label: "Finance", value: 91, href: "/apps/commerce" },
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
        href: "/dashboard/apps#onboarding",
        buttonLabel: "Start",
      },
    ],
    timeline: timelineFromActivities(activities).length
      ? timelineFromActivities(activities)
      : [{ id: "empty", timeLabel: "—", title: "No activity recorded yet." }],
    healthTrend: [72, 74, 76, 78, 80, 82, 84, 85, 86, 87, 87, 87],
    connectedSystems: buildConnectedSystems(input.connectorProbes ?? {}),
    aiPrompts: [
      { id: "pipeline", label: "Summarise my pipeline", prompt: "Summarise my sales pipeline." },
    ],
    growthOpportunities: buildGrowthOpportunities(enabledAppIds),
    recentReports: [{ id: "web", label: "Website Audit", href: "/apps/websites/health" }],
    teamActivity: [],
    visibleWidgets: widgetsForApps(enabledAppIds),
    setupIncomplete,
  };
}
