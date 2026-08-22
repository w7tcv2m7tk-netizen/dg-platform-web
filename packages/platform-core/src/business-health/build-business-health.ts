import type { OverviewConnectorProbes } from "../overview/connector-probes";
import type { OverviewLiveMetrics } from "../overview/gather-live-metrics";
import type { HealthHistoryEntry } from "../overview/health-history";
import type { ReputationScoreBreakdown } from "../reviews";
import type { OrgScoresResult } from "../scoring/calculate-scores";
import { getScoreValue } from "../scoring/calculate-scores";
import type {
  BusinessHealthBundle,
  BusinessHealthStatus,
  HealthDimension,
  HealthSignalStatus,
  PredictiveHealthAlert,
} from "./types";

export type BuildBusinessHealthInput = {
  enabledAppIds: string[];
  metrics?: OverviewLiveMetrics | null;
  connectors?: OverviewConnectorProbes;
  scores?: OrgScoresResult | null;
  reputation?: ReputationScoreBreakdown | null;
  healthHistory?: HealthHistoryEntry[];
};

const VITAL_SIGNALS: BusinessHealthBundle["vitalSignals"] = [
  { icon: "💰", label: "Revenue & cash flow" },
  { icon: "🎯", label: "Pipeline & opportunities" },
  { icon: "📣", label: "Marketing & lead generation" },
  { icon: "🌐", label: "Website & digital presence" },
  { icon: "⭐", label: "Reputation" },
  { icon: "⚙️", label: "Operations & automation" },
  { icon: "👥", label: "Customers & relationships" },
];

function clamp(value: number, min = 0, max = 100) {
  return Math.round(Math.max(min, Math.min(max, value)));
}

function statusFromScore(score: number | null): HealthSignalStatus {
  if (score == null) return "unavailable";
  if (score >= 75) return "strong";
  if (score >= 55) return "watch";
  return "attention";
}

function formatAud(cents: number) {
  if (cents <= 0) return null;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function pipelineScore(
  conversion: number,
  metrics?: OverviewLiveMetrics | null,
): number {
  let score = conversion;
  const opportunities = metrics?.openOpportunityCount ?? 0;
  const leads = metrics?.openLeadCount ?? 0;
  const pipeline = metrics?.pipelineValueCents ?? 0;
  if (opportunities >= 5) score += 8;
  else if (opportunities >= 1) score += 4;
  if (leads >= 3) score += 4;
  if (pipeline >= 10_000_000) score += 6;
  if ((metrics?.overdueFollowUps ?? 0) > 0) score -= Math.min(15, metrics!.overdueFollowUps * 3);
  return clamp(score);
}

function marketingScore(growth: number, metrics?: OverviewLiveMetrics | null): number {
  let score = growth;
  if ((metrics?.newLeadsThisWeek ?? 0) >= 3) score += 10;
  else if ((metrics?.newLeadsThisWeek ?? 0) >= 1) score += 5;
  if ((metrics?.consultationCount ?? 0) > 0) score += 4;
  return clamp(score);
}

function digitalScore(scores: OrgScoresResult): number {
  const website = getScoreValue(scores.scores, "website_health");
  const seo = getScoreValue(scores.scores, "seo");
  const ai = getScoreValue(scores.scores, "ai_visibility");
  return clamp((website + seo + ai) / 3);
}

function operationsScore(automation: number, metrics?: OverviewLiveMetrics | null): number {
  let score = automation;
  const tasks = metrics?.openTasksDue ?? 0;
  const overdue = metrics?.overdueFollowUps ?? 0;
  if (tasks === 0) score += 8;
  else score -= Math.min(12, tasks * 2);
  if (overdue > 0) score -= Math.min(18, overdue * 4);
  return clamp(score);
}

function customersScore(metrics?: OverviewLiveMetrics | null): number {
  if (!metrics) return 0;
  let score = 45;
  if (metrics.contactCount >= 50) score += 20;
  else if (metrics.contactCount >= 10) score += 12;
  else if (metrics.contactCount >= 1) score += 6;
  if (metrics.hasTimelineActivity) score += 10;
  if (metrics.activityCount >= 20) score += 8;
  return clamp(score);
}

function buildDimensions(input: BuildBusinessHealthInput): HealthDimension[] {
  const scores = input.scores;
  const metrics = input.metrics;
  const revenueConnected = (metrics?.revenueMtdCents ?? 0) > 0;

  const rows: Array<Omit<HealthDimension, "status">> = [
    {
      id: "revenue",
      label: "Revenue",
      icon: "💰",
      score: revenueConnected ? (scores?.financeScore ?? null) : null,
      summary: revenueConnected
        ? `Revenue this month ${formatAud(metrics?.revenueMtdCents ?? 0) ?? "—"}${(metrics?.overdueArCents ?? 0) > 0 ? " · overdue receivables need attention" : ""}.`
        : "Connect accounting or commerce data to monitor revenue health.",
      href: "/apps/commerce",
      unavailableReason: revenueConnected
        ? undefined
        : "Connect your accounting system to unlock revenue health.",
    },
    {
      id: "pipeline",
      label: "Pipeline",
      icon: "🎯",
      score: scores ? pipelineScore(getScoreValue(scores.scores, "conversion"), metrics) : null,
      summary:
        metrics && (metrics.openOpportunityCount > 0 || metrics.openLeadCount > 0)
          ? `${metrics.openOpportunityCount} open opportunit${metrics.openOpportunityCount === 1 ? "y" : "ies"} · ${metrics.openLeadCount} active lead${metrics.openLeadCount === 1 ? "" : "s"}.`
          : "Pipeline volume and movement from connected CRM activity.",
      href: "/apps/crm/opportunities",
    },
    {
      id: "marketing",
      label: "Marketing",
      icon: "📣",
      score: scores
        ? marketingScore(getScoreValue(scores.scores, "business_growth"), metrics)
        : null,
      summary:
        (metrics?.newLeadsThisWeek ?? 0) > 0
          ? `${metrics?.newLeadsThisWeek} new lead${metrics!.newLeadsThisWeek === 1 ? "" : "s"} this week.`
          : "Lead generation and campaign activity across connected channels.",
      href: "/apps/marketing",
    },
    {
      id: "digital",
      label: "Digital",
      icon: "🌐",
      score: scores ? digitalScore(scores) : null,
      summary: "Website health, SEO and AI Visibility combined.",
      href: "/apps/websites/health",
    },
    {
      id: "reputation",
      label: "Reputation",
      icon: "⭐",
      score: input.reputation?.score ?? null,
      summary:
        input.reputation?.reviewCount
          ? `${input.reputation.reviewCount} connected review${input.reputation.reviewCount === 1 ? "" : "s"}${input.reputation.averageRating ? ` · ${input.reputation.averageRating} avg rating` : ""}.`
          : "Reviews, ratings and sentiment from connected feeds.",
      href: "/apps/reviews",
      unavailableReason:
        input.reputation?.score == null
          ? "Connect Google Business Profile or a review feed to monitor reputation health."
          : undefined,
    },
    {
      id: "operations",
      label: "Operations",
      icon: "⚙️",
      score: scores
        ? operationsScore(getScoreValue(scores.scores, "automation"), metrics)
        : null,
      summary:
        (metrics?.openTasksDue ?? 0) > 0 || (metrics?.overdueFollowUps ?? 0) > 0
          ? `${metrics?.openTasksDue ?? 0} tasks due · ${metrics?.overdueFollowUps ?? 0} overdue follow-up${(metrics?.overdueFollowUps ?? 0) === 1 ? "" : "s"}.`
          : "Tasks, automation and workflow efficiency.",
      href: "/apps/automation",
    },
    {
      id: "customers",
      label: "Customers",
      icon: "👥",
      score: metrics ? customersScore(metrics) : null,
      summary:
        (metrics?.contactCount ?? 0) > 0
          ? `${metrics?.contactCount} CRM contact${metrics!.contactCount === 1 ? "" : "s"} · ${metrics?.activityCount ?? 0} recent activit${(metrics?.activityCount ?? 0) === 1 ? "y" : "ies"}.`
          : "Engagement, retention and relationship health from CRM activity.",
      href: "/apps/crm/contacts",
    },
  ];

  return rows.map((row) => ({
    ...row,
    status: statusFromScore(row.score),
  }));
}

function healthTrendDelta30Days(
  history: HealthHistoryEntry[] | undefined,
  current: number | null,
): number | null {
  if (current == null || !history?.length) return null;
  const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
  const previous = sorted[sorted.length - 2]?.score ?? sorted[sorted.length - 1]?.score;
  if (previous == null) return null;
  return current - previous;
}

function overallStatus(
  score: number | null,
  delta: number | null,
  alerts: PredictiveHealthAlert[],
): { status: BusinessHealthStatus; label: string } {
  if (score == null) return { status: "unknown", label: "Connect data to measure health" };
  const hasCritical = alerts.some((a) => a.severity === "critical");
  if (hasCritical || score < 50) {
    return { status: "at_risk", label: "Needs attention" };
  }
  if ((delta ?? 0) >= 3) {
    return { status: "improving", label: "Improving over the past 30 days" };
  }
  if ((delta ?? 0) <= -3 || score < 60) {
    return { status: "at_risk", label: "Watch closely" };
  }
  return { status: "stable", label: "Stable" };
}

function buildPredictiveAlerts(input: BuildBusinessHealthInput, dimensions: HealthDimension[]): PredictiveHealthAlert[] {
  const alerts: PredictiveHealthAlert[] = [];
  const metrics = input.metrics;
  const scores = input.scores;
  if (!metrics || !scores) return alerts;

  const pipeline = dimensions.find((d) => d.id === "pipeline");
  const operations = dimensions.find((d) => d.id === "operations");
  const aiVisibility = getScoreValue(scores.scores, "ai_visibility");

  if (
    pipeline?.status === "attention" &&
    metrics.newLeadsThisWeek === 0 &&
    metrics.openOpportunityCount <= 1
  ) {
    alerts.push({
      id: "pipeline-quiet",
      severity: metrics.openOpportunityCount === 0 ? "critical" : "warning",
      title: "Pipeline health declining",
      body:
        metrics.openOpportunityCount === 0
          ? "No new qualified opportunities are active right now. At this pace, pipeline coverage may fall below your normal operating range within the next month."
          : "New qualified opportunities have slowed this week. Pipeline momentum is below your recent operating pattern.",
      recommendedAction: "Increase prospecting activity",
      href: "/apps/crm/leads",
    });
  }

  if ((metrics.overdueFollowUps ?? 0) >= 2) {
    alerts.push({
      id: "follow-up",
      severity: metrics.overdueFollowUps >= 5 ? "critical" : "warning",
      title: "Follow-up activity needs attention",
      body: `${metrics.overdueFollowUps} enquir${metrics.overdueFollowUps === 1 ? "y is" : "ies are"} overdue for first response or follow-up. Unresolved follow-up usually precedes conversion drop-off.`,
      recommendedAction: "Clear overdue follow-ups",
      href: "/apps/crm/leads",
    });
  }

  if ((metrics.overdueArCents ?? 0) > 0) {
    alerts.push({
      id: "cash-flow",
      severity: "warning",
      title: "Cash flow pressure emerging",
      body: `${formatAud(metrics.overdueArCents)} in overdue receivables may constrain operating flexibility if collection slows further.`,
      recommendedAction: "Review outstanding invoices",
      href: "/apps/commerce",
    });
  }

  if (aiVisibility < 50) {
    alerts.push({
      id: "ai-visibility",
      severity: "warning",
      title: "AI Visibility lagging",
      body: "Answer engines and AI assistants have limited visibility into your business compared with your digital footprint. This can reduce discovery before prospects reach your website.",
      recommendedAction: "Improve AI Visibility",
      href: "/apps/ai-visibility",
    });
  }

  if (operations?.status === "attention" && (metrics.openTasksDue ?? 0) >= 5) {
    alerts.push({
      id: "operations-load",
      severity: "warning",
      title: "Operational load building",
      body: `${metrics.openTasksDue} open tasks are due. Manual backlog often signals automation or workflow gaps before revenue is affected.`,
      recommendedAction: "Review automation opportunities",
      href: "/apps/automation",
    });
  }

  const history = input.healthHistory ?? [];
  if (history.length >= 3) {
    const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month)).slice(-3);
    const declining = sorted.every((entry, index) => index === 0 || entry.score <= sorted[index - 1]!.score);
    if (declining && sorted[sorted.length - 1]!.score < sorted[0]!.score - 4) {
      alerts.push({
        id: "health-trend",
        severity: "warning",
        title: "Business Health trend declining",
        body: "Your overall health score has softened across recent months. Early intervention is cheaper than waiting for performance to show up in revenue.",
        recommendedAction: "Review priorities in AI Advisor",
        href: "/dashboard/advisor",
      });
    }
  }

  return alerts.slice(0, 4);
}

function groupLabels(dimensions: HealthDimension[], status: HealthSignalStatus): string[] {
  return dimensions.filter((d) => d.status === status && d.score != null).map((d) => d.label);
}

/** Build tenant Business Health workspace from live connected signals. */
export function buildBusinessHealth(input: BuildBusinessHealthInput): BusinessHealthBundle {
  const dimensions = buildDimensions(input);
  const scored = dimensions.filter((d) => d.score != null);
  const overallScore =
    input.scores?.businessHealth ??
    (scored.length
      ? clamp(scored.reduce((sum, d) => sum + (d.score ?? 0), 0) / scored.length)
      : null);

  const trendDelta30Days = healthTrendDelta30Days(input.healthHistory, overallScore);
  const predictiveAlerts = buildPredictiveAlerts(input, dimensions);
  const { status, label } = overallStatus(overallScore, trendDelta30Days, predictiveAlerts);

  const history = input.healthHistory ?? [];
  const healthTrend =
    history.length >= 2
      ? [...history.map((h) => h.score).slice(-11), overallScore ?? history[history.length - 1]?.score ?? 0].slice(-12)
      : overallScore != null
        ? Array.from({ length: 12 }, (_, i) => (i === 11 ? overallScore : Math.max(40, overallScore - (11 - i))))
        : [];

  return {
    generatedAt: new Date().toISOString(),
    scoresLive: Boolean(input.metrics && input.scores),
    overallScore,
    overallStatus: status,
    overallStatusLabel: label,
    trendDelta30Days,
    strong: groupLabels(dimensions, "strong"),
    watch: groupLabels(dimensions, "watch"),
    attention: groupLabels(dimensions, "attention"),
    vitalSignals: VITAL_SIGNALS,
    dimensions,
    predictiveAlerts,
    healthTrend,
  };
}

export { VITAL_SIGNALS };
