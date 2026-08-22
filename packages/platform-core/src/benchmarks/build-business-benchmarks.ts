import type { BusinessBrainSnapshot } from "../brain/types";
import type { OrganisationBusinessProfile } from "../org/business-profile-types";
import type { PlatformSetupStatus } from "../org/setup-status";
import type { OverviewConnectorProbes } from "../overview/connector-probes";
import type { OverviewLiveMetrics } from "../overview/gather-live-metrics";
import type { HealthHistoryEntry } from "../overview/health-history";
import type { ReputationScoreBreakdown } from "../reviews";
import type { OrgScoresResult } from "../scoring/calculate-scores";
import { getScoreValue } from "../scoring/calculate-scores";
import type { DigitalTwinSnapshot } from "../twin/types";
import {
  listBenchmarkCohortOptions,
  parseBenchmarkCohortId,
  resolveBenchmarkCohort,
  type BenchmarkCohortId,
} from "./cohorts";
import type {
  BenchmarkCategory,
  BenchmarkCategoryId,
  BenchmarkMetricRow,
  BenchmarkOpportunity,
  BenchmarkTrendPoint,
  BusinessBenchmarksBundle,
} from "./types";

const CATEGORY_META: Record<
  BenchmarkCategoryId,
  { label: string; icon: string }
> = {
  business_intelligence: { label: "Business Intelligence", icon: "🧠" },
  customer_crm: { label: "Customer & CRM", icon: "👥" },
  digital_presence: { label: "Digital Presence", icon: "🌐" },
  seo: { label: "SEO", icon: "🔎" },
  ai_visibility: { label: "AI Visibility", icon: "✨" },
  reputation: { label: "Reputation", icon: "⭐" },
  marketing: { label: "Marketing", icon: "📣" },
  automation: { label: "Automation", icon: "⚙️" },
  commercial: { label: "Commercial Performance", icon: "💰" },
  growth: { label: "Growth", icon: "📈" },
};

export type BuildBusinessBenchmarksInput = {
  organisationName: string;
  enabledAppIds: string[];
  profile?: OrganisationBusinessProfile | null;
  metrics?: OverviewLiveMetrics | null;
  connectors?: OverviewConnectorProbes;
  scores?: OrgScoresResult | null;
  snapshot?: DigitalTwinSnapshot | null;
  brain?: BusinessBrainSnapshot | null;
  reputation?: ReputationScoreBreakdown | null;
  healthHistory?: HealthHistoryEntry[];
  setupStatus?: PlatformSetupStatus | null;
  networkCohortSize?: number;
  cohortId?: BenchmarkCohortId | string | null;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.round(Math.max(min, Math.min(max, value)));
}

export function estimatePercentile(
  yourValue: number,
  median: number,
  top25: number,
): number {
  if (!Number.isFinite(yourValue) || median <= 0) return 50;
  if (top25 <= median) return clamp((yourValue / median) * 50);
  if (yourValue >= top25) {
    return clamp(75 + ((yourValue - top25) / Math.max(1, 100 - top25)) * 23, 75, 98);
  }
  if (yourValue >= median) {
    return clamp(50 + ((yourValue - median) / (top25 - median)) * 25);
  }
  return clamp((yourValue / median) * 50, 5, 49);
}

function formatMetricValue(
  value: number,
  opts?: { suffix?: string; decimal?: boolean },
): string {
  if (opts?.decimal) return value.toFixed(1);
  return `${Math.round(value)}${opts?.suffix ?? ""}`;
}

function marketingScore(
  enabledAppIds: string[],
  profile?: OrganisationBusinessProfile | null,
  metrics?: OverviewLiveMetrics | null,
): number {
  let score = 42;
  if (enabledAppIds.includes("marketing")) score += 18;
  if (enabledAppIds.includes("seo")) score += 10;
  if (enabledAppIds.includes("websites")) score += 8;
  const socialCount = Object.values(profile?.social ?? {}).filter(Boolean).length;
  score += Math.min(12, socialCount * 3);
  if ((metrics?.activityCount ?? 0) > 0) score += 8;
  if ((metrics?.consultationCount ?? 0) > 0) score += 6;
  return clamp(score);
}

function aiMaturityScore(input: BuildBusinessBenchmarksInput): number {
  const brain = input.brain?.percent ?? 0;
  const connectors = input.snapshot?.metrics.connectedConnectors ?? 0;
  const aiVis = getScoreValue(input.scores?.scores ?? [], "ai_visibility");
  const automation = getScoreValue(input.scores?.scores ?? [], "automation");
  const comms = input.enabledAppIds.includes("ai-communications") ? 12 : 0;
  const apps = Math.min(10, input.enabledAppIds.filter((id) => id.startsWith("ai")).length * 4);
  return clamp(brain * 0.35 + aiVis * 0.25 + automation * 0.2 + connectors * 4 + comms + apps);
}

function crmFollowUpPercent(metrics?: OverviewLiveMetrics | null): number | null {
  if (!metrics) return null;
  const open = metrics.openLeadCount + metrics.openOpportunityCount;
  if (open <= 0 && metrics.overdueFollowUps <= 0) return null;
  const denom = Math.max(open, metrics.overdueFollowUps, 1);
  return clamp(100 - (metrics.overdueFollowUps / denom) * 100);
}

function buildCategoryScores(
  input: BuildBusinessBenchmarksInput,
  reference: ReturnType<typeof resolveBenchmarkCohort>["reference"],
): BenchmarkCategory[] {
  const scores = input.scores?.scores ?? [];
  const revenueConnected = (input.metrics?.revenueMtdCents ?? 0) > 0;

  const raw: Array<{
    id: BenchmarkCategoryId;
    yourScore: number | null;
    unavailableReason?: string;
  }> = [
    {
      id: "business_intelligence",
      yourScore: input.brain?.percent ?? null,
    },
    {
      id: "customer_crm",
      yourScore: input.scores ? getScoreValue(scores, "conversion") : null,
    },
    {
      id: "digital_presence",
      yourScore: input.scores ? getScoreValue(scores, "website_health") : null,
    },
    {
      id: "seo",
      yourScore: input.scores ? getScoreValue(scores, "seo") : null,
    },
    {
      id: "ai_visibility",
      yourScore: input.scores ? getScoreValue(scores, "ai_visibility") : null,
    },
    {
      id: "reputation",
      yourScore: input.reputation?.score ?? null,
      unavailableReason:
        input.reputation?.score == null
          ? "Connect Google Business Profile or your review feed to unlock reputation benchmarks."
          : undefined,
    },
    {
      id: "marketing",
      yourScore: marketingScore(input.enabledAppIds, input.profile, input.metrics),
    },
    {
      id: "automation",
      yourScore: input.scores ? getScoreValue(scores, "automation") : null,
    },
    {
      id: "commercial",
      yourScore: revenueConnected ? (input.scores?.financeScore ?? null) : null,
      unavailableReason: revenueConnected
        ? undefined
        : "Revenue benchmark unavailable — connect your accounting system to unlock this benchmark.",
    },
    {
      id: "growth",
      yourScore: input.scores ? getScoreValue(scores, "business_growth") : null,
    },
  ];

  return raw.map(({ id, yourScore, unavailableReason }) => {
    const meta = CATEGORY_META[id];
    const ref = reference.categories[id];
    return {
      id,
      label: meta.label,
      icon: meta.icon,
      yourScore,
      industryAverage: ref.median,
      top25: ref.top25,
      percentile:
        yourScore != null ? estimatePercentile(yourScore, ref.median, ref.top25) : null,
      unavailableReason,
    };
  });
}

function buildMetricRows(
  input: BuildBusinessBenchmarksInput,
  reference: ReturnType<typeof resolveBenchmarkCohort>["reference"],
): BenchmarkMetricRow[] {
  const scores = input.scores?.scores ?? [];
  const rows: BenchmarkMetricRow[] = [];

  if (input.reputation?.averageRating != null) {
    const ref = reference.metrics.google_rating;
    rows.push({
      id: "google_rating",
      label: "Google Rating",
      yourValue: formatMetricValue(input.reputation.averageRating, { decimal: true }),
      industryAverage: formatMetricValue(ref.median, { decimal: true }),
      top25: formatMetricValue(ref.top25, { decimal: true }),
    });
  } else {
    rows.push({
      id: "google_rating",
      label: "Google Rating",
      yourValue: "—",
      industryAverage: formatMetricValue(reference.metrics.google_rating.median, {
        decimal: true,
      }),
      top25: formatMetricValue(reference.metrics.google_rating.top25, { decimal: true }),
      unavailableReason: "Connect a review source to compare rating benchmarks.",
    });
  }

  if (input.reputation && input.reputation.reviewCount > 0) {
    const ref = reference.metrics.review_volume;
    rows.push({
      id: "review_volume",
      label: "Review Volume",
      yourValue: formatMetricValue(input.reputation.reviewCount, { suffix: ref.suffix }),
      industryAverage: formatMetricValue(ref.median, { suffix: ref.suffix }),
      top25: formatMetricValue(ref.top25, { suffix: ref.suffix }),
    });
  } else {
    const ref = reference.metrics.review_volume;
    rows.push({
      id: "review_volume",
      label: "Review Volume",
      yourValue: "—",
      industryAverage: formatMetricValue(ref.median, { suffix: ref.suffix }),
      top25: formatMetricValue(ref.top25, { suffix: ref.suffix }),
      unavailableReason: "No connected reviews yet — volume benchmarks unlock when reviews sync.",
    });
  }

  const websiteHealth = input.scores ? getScoreValue(scores, "website_health") : null;
  const whRef = reference.metrics.website_health;
  rows.push({
    id: "website_health",
    label: "Website Health",
    yourValue: websiteHealth != null ? String(websiteHealth) : "—",
    industryAverage: String(whRef.median),
    top25: String(whRef.top25),
    unavailableReason:
      websiteHealth == null ? "Connect website health monitoring for a live comparison." : undefined,
  });

  const aiVis = input.scores ? getScoreValue(scores, "ai_visibility") : null;
  const aiRef = reference.metrics.ai_visibility;
  rows.push({
    id: "ai_visibility",
    label: "AI Visibility",
    yourValue: aiVis != null ? String(aiVis) : "—",
    industryAverage: String(aiRef.median),
    top25: String(aiRef.top25),
  });

  const followUp = crmFollowUpPercent(input.metrics);
  const crmRef = reference.metrics.crm_follow_up;
  rows.push({
    id: "crm_follow_up",
    label: "CRM Follow-up",
    yourValue:
      followUp != null ? formatMetricValue(followUp, { suffix: crmRef.suffix }) : "—",
    industryAverage: formatMetricValue(crmRef.median, { suffix: crmRef.suffix }),
    top25: formatMetricValue(crmRef.top25, { suffix: crmRef.suffix }),
    unavailableReason:
      followUp == null
        ? "Add CRM enquiries to compare follow-up completion benchmarks."
        : undefined,
  });

  return rows;
}

function buildTrend(
  healthHistory: HealthHistoryEntry[] | undefined,
  currentScore: number | null,
  referenceMedian: number,
  referenceTop25: number,
): { trend: BenchmarkTrendPoint[]; delta90Days: number | null } {
  if (currentScore == null) return { trend: [], delta90Days: null };

  const sorted = [...(healthHistory ?? [])].sort((a, b) => a.month.localeCompare(b.month));
  const points: BenchmarkTrendPoint[] = sorted.slice(-4).map((entry) => ({
    label: entry.month.slice(5),
    percentile: estimatePercentile(entry.score, referenceMedian, referenceTop25),
  }));

  if (points.length === 0 || points[points.length - 1]?.percentile !== estimatePercentile(currentScore, referenceMedian, referenceTop25)) {
    points.push({
      label: "Now",
      percentile: estimatePercentile(currentScore, referenceMedian, referenceTop25),
    });
  }

  const current = points[points.length - 1]?.percentile ?? null;
  const baseline = points.length >= 2 ? points[0]?.percentile : null;
  const delta90Days =
    current != null && baseline != null ? current - baseline : null;

  return { trend: points.slice(-4), delta90Days };
}

function buildOpportunities(categories: BenchmarkCategory[]): BenchmarkOpportunity[] {
  const gaps = categories
    .filter((c) => c.yourScore != null && c.percentile != null && c.percentile < 55)
    .sort((a, b) => (a.percentile ?? 100) - (b.percentile ?? 100));

  const actions: Record<BenchmarkCategoryId, BenchmarkOpportunity> = {
    business_intelligence: {
      id: "brain",
      title: "Complete your Business Brain",
      gap: "Business context is below similar businesses.",
      impact: "Sharper AI recommendations and automation decisions.",
      actionLabel: "Improve Business Brain →",
      href: "/dashboard/brain",
    },
    customer_crm: {
      id: "crm",
      title: "Strengthen CRM follow-through",
      gap: "Pipeline activity trails industry peers.",
      impact: "Higher conversion from existing enquiries.",
      actionLabel: "Open CRM →",
      href: "/apps/crm",
    },
    digital_presence: {
      id: "digital",
      title: "Improve digital presence",
      gap: "Website health is below benchmark.",
      impact: "Stronger trust and discoverability.",
      actionLabel: "Check website health →",
      href: "/apps/websites/health",
    },
    seo: {
      id: "seo",
      title: "Boost SEO performance",
      gap: "Search visibility is below industry average.",
      impact: "More organic discovery and enquiries.",
      actionLabel: "Open SEO →",
      href: "/apps/seo",
    },
    ai_visibility: {
      id: "ai-vis",
      title: "Improve AI Visibility",
      gap: "AI assistants and answer engines see less of your business than peers.",
      impact: "Stronger presence in AI-driven discovery.",
      actionLabel: "Explore AI Visibility →",
      href: "/apps/ai-visibility",
    },
    reputation: {
      id: "reputation",
      title: "You're below benchmark on review generation",
      gap: "Review volume or rating trails the industry median.",
      impact: "Higher trust and stronger local visibility.",
      actionLabel: "Improve reputation →",
      href: "/apps/reviews",
    },
    marketing: {
      id: "marketing",
      title: "Increase marketing activity",
      gap: "Marketing signals are lighter than comparable businesses.",
      impact: "More consistent lead flow.",
      actionLabel: "Open Marketing →",
      href: "/apps/marketing",
    },
    automation: {
      id: "automation",
      title: "Automate manual processes",
      gap: "Automation adoption is below top performers.",
      impact: "Save hours on repetitive follow-up and admin.",
      actionLabel: "Explore Automation →",
      href: "/apps/automation",
    },
    commercial: {
      id: "commercial",
      title: "Connect commercial data",
      gap: "Revenue benchmarks are locked without accounting data.",
      impact: "Commercial performance comparisons and cash-flow insights.",
      actionLabel: "Connect finance →",
      href: "/dashboard/settings/connectors",
    },
    growth: {
      id: "growth",
      title: "Accelerate growth metrics",
      gap: "Lead and pipeline momentum is below peers.",
      impact: "More predictable revenue growth.",
      actionLabel: "View growth opportunities →",
      href: "/dashboard",
    },
  };

  return gaps.slice(0, 4).map((c) => ({
    ...actions[c.id],
    gap: `${c.label} at ${c.yourScore}/100 vs industry median ${c.industryAverage}.`,
  }));
}

function buildBriefing(
  categories: BenchmarkCategory[],
  overallPercentile: number | null,
): string {
  const available = categories.filter((c) => c.yourScore != null && c.percentile != null);
  const strongest = [...available].sort((a, b) => (b.percentile ?? 0) - (a.percentile ?? 0));
  const weakest = [...available].sort((a, b) => (a.percentile ?? 100) - (b.percentile ?? 100));

  const strongLabels = strongest.slice(0, 2).map((c) => c.label.toLowerCase());
  const weakLabels = weakest.slice(0, 2).map((c) => c.label.toLowerCase());

  if (!available.length) {
    return "Connect your website, CRM, and review sources to unlock benchmark comparisons against businesses like yours.";
  }

  const position =
    overallPercentile != null && overallPercentile >= 60
      ? "performing strongly in several areas"
      : overallPercentile != null && overallPercentile >= 45
        ? "holding steady against similar businesses"
        : "with room to catch industry peers";

  const strongPart = strongLabels.length
    ? `Your ${strongLabels.join(" and ")} ${strongLabels.length > 1 ? "are" : "is"} ahead of benchmark.`
    : "";
  const weakPart = weakLabels.length
    ? `Your biggest opportunity is improving ${weakLabels.join(" and ")}.`
    : "";

  return `Your business is ${position}. ${strongPart} ${weakPart}`.replace(/\s+/g, " ").trim();
}

function operationalInsight(
  categories: BenchmarkCategory[],
  automationScore: number | null,
  referenceAutomationMedian: number,
): string | undefined {
  if (automationScore == null) return undefined;
  const gap = referenceAutomationMedian - automationScore;
  if (gap <= 8) return undefined;
  const hours = clamp(Math.round(gap / 4), 4, 24);
  return `Your business may be losing an estimated ${hours} hours/month to processes that similar businesses have automated.`;
}

function aiMaturityInsight(
  maturityScore: number,
  referenceMedian: number,
  connectorCount: number,
): string | undefined {
  if (maturityScore >= referenceMedian + 10) return undefined;
  const multiplier = connectorCount <= 1 ? 3.2 : connectorCount <= 3 ? 2.4 : 1.6;
  return `You're building AI maturity, but businesses in the top 10% have connected ${multiplier.toFixed(1)}× more operational data.`;
}

/** Build tenant-facing Business Benchmarks from live org data + industry reference baselines. */
export function buildBusinessBenchmarks(
  input: BuildBusinessBenchmarksInput,
): BusinessBenchmarksBundle {
  const cohortId = parseBenchmarkCohortId(input.cohortId);
  const aiMaturity = aiMaturityScore(input);
  const cohort = resolveBenchmarkCohort(cohortId, {
    profile: input.profile,
    setupStatus: input.setupStatus,
    digitalMaturityScore: aiMaturity,
    connectorCount: input.snapshot?.metrics.connectedConnectors ?? 0,
  });
  const reference = cohort.reference;
  const networkCohortSize = input.networkCohortSize ?? 0;
  const dataSource = networkCohortSize >= 30 ? "network" : "industry_reference";
  const dataSourceNote =
    dataSource === "network"
      ? `Compared against ${networkCohortSize} anonymised businesses in the DigitalGate network.`
      : `Industry reference benchmarks for ${reference.label.toLowerCase()} businesses — network cohort still growing (minimum 30 organisations for anonymised comparisons).`;

  const categories = buildCategoryScores(input, reference);
  const scoredCategories = categories.filter((c) => c.yourScore != null);
  const benchmarkScore =
    scoredCategories.length > 0
      ? clamp(
          scoredCategories.reduce((sum, c) => sum + (c.yourScore ?? 0), 0) /
            scoredCategories.length,
        )
      : null;

  const categoryValues = Object.values(reference.categories);
  const referenceMedian = clamp(
    categoryValues.reduce((sum, c) => sum + c.median, 0) / categoryValues.length,
  );
  const referenceTop25 = clamp(
    categoryValues.reduce((sum, c) => sum + c.top25, 0) / categoryValues.length,
  );
  const overallPercentile =
    benchmarkScore != null
      ? estimatePercentile(benchmarkScore, referenceMedian, referenceTop25)
      : null;

  const { trend, delta90Days } = buildTrend(
    input.healthHistory,
    benchmarkScore,
    referenceMedian,
    referenceTop25,
  );

  const strongest = [...scoredCategories]
    .filter((c) => (c.percentile ?? 0) >= 60)
    .sort((a, b) => (b.yourScore ?? 0) - (a.yourScore ?? 0))
    .slice(0, 3);

  const opportunities = [...scoredCategories]
    .filter((c) => (c.percentile ?? 100) < 55)
    .sort((a, b) => (a.percentile ?? 100) - (b.percentile ?? 100))
    .slice(0, 3);

  const digitalPresenceScore = categories.find((c) => c.id === "digital_presence")?.yourScore ?? null;
  const digitalPresencePercentile = categories.find((c) => c.id === "digital_presence")?.percentile ?? null;

  const aiMaturityPercentile = estimatePercentile(
    aiMaturity,
    reference.categories.business_intelligence.median,
    reference.categories.business_intelligence.top25,
  );

  const automationScore = categories.find((c) => c.id === "automation")?.yourScore ?? null;

  return {
    generatedAt: new Date().toISOString(),
    dataSource,
    dataSourceNote,
    cohortId,
    cohortOptions: listBenchmarkCohortOptions(),
    comparisonLabels: cohort.comparisonLabels,
    cohortLabel: cohort.label,
    cohortDescription: cohort.description,
    networkCohortSize,
    benchmarkScore,
    overallPercentile,
    percentileDelta90Days: delta90Days,
    trend,
    categories,
    strongest,
    opportunities,
    metrics: buildMetricRows(input, reference),
    digitalPresenceScore,
    digitalPresencePercentile,
    aiMaturityScore: aiMaturity,
    aiMaturityPercentile,
    aiMaturityInsight: aiMaturityInsight(
      aiMaturity,
      reference.categories.business_intelligence.median,
      input.snapshot?.metrics.connectedConnectors ?? 0,
    ),
    operationalInsight: operationalInsight(
      categories,
      automationScore,
      reference.categories.automation.median,
    ),
    briefing: buildBriefing(categories, overallPercentile),
    recommendedActions: buildOpportunities(categories),
    scoresLive: Boolean(input.metrics && input.scores),
  };
}
