import type { OrganisationBusinessProfile } from "../org/business-profile-types";
import type { DigitalTwinSnapshot } from "../twin/types";
import type { ScoreId, ScoreResult } from "./types";

function clamp(value: number, min = 0, max = 100) {
  return Math.round(Math.max(min, Math.min(max, value)));
}

export type ScoreEvidenceState = "measured" | "derived" | "unavailable";
export type BusinessHealthConfidence = "insufficient" | "low" | "medium" | "high";

export type ScoreEvidence = {
  scoreId: ScoreId;
  state: ScoreEvidenceState;
  weight: number;
  source: string;
};

const SCORE_WEIGHTS: Partial<Record<ScoreId, number>> = {
  ai_visibility: 14,
  seo: 12,
  website_health: 16,
  business_growth: 12,
  conversion: 16,
  reputation: 12,
  automation: 8,
};
const FINANCE_WEIGHT = 10;

function hasConnector(snapshot: DigitalTwinSnapshot, ...ids: string[]) {
  return ids.some((id) => snapshot.connectors.includes(id));
}

function scoreFromWebsite(snapshot: DigitalTwinSnapshot): number | null {
  const probe = snapshot.scores.websiteHealth;
  return typeof probe === "number" && Number.isFinite(probe) && probe > 0
    ? clamp(probe)
    : null;
}

function scoreFromBusinessGrowth(snapshot: DigitalTwinSnapshot): number | null {
  const hasCrm = hasConnector(snapshot, "crm", "real-estate");
  const hasCommerce = hasConnector(snapshot, "commerce", "stripe");
  if (!hasCrm && !hasCommerce) return null;

  const components: number[] = [];
  if (hasCrm) {
    const leads = snapshot.metrics.activeLeads ?? 0;
    const pipeline = snapshot.metrics.pipelineValue ?? 0;
    components.push(clamp(leads * 12.5));
    // Pipeline value is canonical only when supplied by live metrics; capture-snapshot
    // deliberately no longer manufactures a value from lead counts.
    components.push(pipeline > 0 ? clamp((pipeline / 250_000) * 25) : 0);
  }
  if (hasCommerce) {
    const revenue = (snapshot.metrics.revenueMtdCents ?? 0) / 100;
    components.push(revenue > 0 ? clamp((revenue / 25_000) * 100) : 0);
  }
  return components.length
    ? clamp(components.reduce((sum, value) => sum + value, 0) / components.length)
    : null;
}

function scoreFromSales(snapshot: DigitalTwinSnapshot, metrics: OverviewMetricsContext): number | null {
  if (!hasConnector(snapshot, "crm", "real-estate")) return null;

  const activeLeads = snapshot.metrics.activeLeads ?? 0;
  const opportunities = snapshot.metrics.openOpportunities ?? 0;
  const activityScore = clamp(
    Math.min(40, metrics.newLeadsThisWeek * 8) +
      Math.min(30, opportunities * 10) +
      Math.min(20, activeLeads * 2) +
      (metrics.listedPropertyCount > 0 ? 10 : 0),
  );
  const followUpPenalty = Math.min(40, metrics.overdueFollowUps * 8);
  return clamp(activityScore - followUpPenalty);
}

function scoreFromAutomation(
  snapshot: DigitalTwinSnapshot,
  enabledAppIds: string[],
  metrics: OverviewMetricsContext,
): number | null {
  if (!enabledAppIds.includes("automation") || !hasConnector(snapshot, "automation")) {
    return null;
  }

  const due = metrics.openTasksDue;
  const overdue = metrics.overdueFollowUps;
  const workloadScore = due === 0 ? 100 : clamp(100 - Math.min(70, due * 7));
  const followUpScore = overdue === 0 ? 100 : clamp(100 - Math.min(80, overdue * 12));
  const activityAdjustment = metrics.hasTimelineActivity ? 0 : -15;
  return clamp((workloadScore + followUpScore) / 2 + activityAdjustment);
}

function scoreFromFinance(snapshot: DigitalTwinSnapshot, metrics: OverviewMetricsContext): number | null {
  if (!hasConnector(snapshot, "commerce", "stripe")) return null;

  const revenue = metrics.revenueMtdCents ?? snapshot.metrics.revenueMtdCents ?? 0;
  const overdue = snapshot.metrics.overdueArCents ?? 0;
  const outstanding = snapshot.metrics.outstandingArCents ?? 0;
  const collectionBase = outstanding > 0 ? clamp(100 - (overdue / outstanding) * 100) : 100;
  const revenueEvidence = revenue > 0 ? 100 : 50;
  const subscriptionEvidence = metrics.activeSubscriptions > 0 ? 100 : 50;
  return clamp(collectionBase * 0.5 + revenueEvidence * 0.35 + subscriptionEvidence * 0.15);
}

export interface CalculateScoresInput {
  snapshot: DigitalTwinSnapshot;
  enabledAppIds: string[];
  metrics: OverviewMetricsContext;
  profile?: OrganisationBusinessProfile | null;
  /** When set (e.g. from Reviews feed), this is measured reputation evidence. */
  reputationOverride?: number | null;
  /** Fresh org presence audit. These are measured scores, not profile heuristics. */
  presenceAuditOverride?: {
    seo: number;
    aiVisibility: number;
    websiteHealth: number;
  } | null;
}

export interface OverviewMetricsContext {
  newLeadsThisWeek: number;
  overdueFollowUps: number;
  listedPropertyCount: number;
  openTasksDue: number;
  contactCount: number;
  hasTimelineActivity: boolean;
  activeSubscriptions: number;
  revenueMtdCents: number;
}

export interface OrgScoresResult {
  scores: ScoreResult[];
  businessHealth: number;
  /** No synthetic delta: history owns change calculations. */
  businessHealthDelta: number;
  /** No synthetic trend: persisted history owns trend data. */
  healthTrend: number[];
  financeScore: number;
  evidence: ScoreEvidence[];
  evidenceCoveragePercent: number;
  measuredDimensionCount: number;
  confidence: BusinessHealthConfidence;
  scoresLive: boolean;
}

function confidenceFromCoverage(coverage: number, measuredCount: number): BusinessHealthConfidence {
  if (coverage < 40 || measuredCount < 2) return "insufficient";
  if (coverage < 60) return "low";
  if (coverage < 80) return "medium";
  return "high";
}

/** Compute Business Health only from organisation-scoped, observed evidence. */
export function calculateOrgScores(input: CalculateScoresInput): OrgScoresResult {
  const {
    snapshot,
    enabledAppIds,
    metrics,
    reputationOverride,
    presenceAuditOverride,
  } = input;
  const now = new Date();
  const orgId = snapshot.organisationId;
  const scores: ScoreResult[] = [];
  const evidence: ScoreEvidence[] = [];
  const weighted: Array<{ value: number; weight: number }> = [];

  const addScore = (
    scoreId: ScoreId,
    value: number | null,
    state: ScoreEvidenceState,
    source: string,
  ) => {
    const weight = SCORE_WEIGHTS[scoreId] ?? 0;
    evidence.push({ scoreId, state: value == null ? "unavailable" : state, weight, source });
    if (value == null) return;
    const normalised = clamp(value);
    scores.push({ scoreId, organisationId: orgId, value: normalised, maxValue: 100, calculatedAt: now });
    if (weight > 0) weighted.push({ value: normalised, weight });
  };

  const presence = presenceAuditOverride
    ? {
        website: clamp(presenceAuditOverride.websiteHealth),
        seo: clamp(presenceAuditOverride.seo),
        ai: clamp(presenceAuditOverride.aiVisibility),
      }
    : null;
  const website = presence?.website ?? scoreFromWebsite(snapshot);
  addScore(
    "website_health",
    website,
    "measured",
    presence ? "Latest presence audit" : "Website health probe",
  );
  addScore("seo", presence?.seo ?? null, "measured", "Latest presence audit");
  addScore("ai_visibility", presence?.ai ?? null, "measured", "Latest presence audit");

  const growth = scoreFromBusinessGrowth(snapshot);
  addScore("business_growth", growth, "derived", "Canonical CRM and commerce metrics");

  const sales = scoreFromSales(snapshot, metrics);
  addScore("conversion", sales, "derived", "Canonical CRM pipeline and follow-up metrics");

  const reputation =
    reputationOverride != null && Number.isFinite(reputationOverride)
      ? clamp(reputationOverride)
      : null;
  addScore("reputation", reputation, "measured", "Connected review feed");

  const automation = scoreFromAutomation(snapshot, enabledAppIds, metrics);
  addScore("automation", automation, "derived", "Automation task and follow-up activity");

  const finance = scoreFromFinance(snapshot, metrics);
  evidence.push({
    scoreId: "success_score",
    state: finance == null ? "unavailable" : "derived",
    weight: FINANCE_WEIGHT,
    source: "Canonical commerce, subscription and receivables metrics",
  });
  if (finance != null) weighted.push({ value: finance, weight: FINANCE_WEIGHT });

  const availableWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  const businessHealth = availableWeight
    ? clamp(weighted.reduce((sum, item) => sum + item.value * item.weight, 0) / availableWeight)
    : 0;
  const measuredDimensionCount = weighted.length;
  const evidenceCoveragePercent = clamp(availableWeight);
  const confidence = confidenceFromCoverage(evidenceCoveragePercent, measuredDimensionCount);
  const scoresLive = confidence !== "insufficient";

  if (scoresLive) {
    scores.push({
      scoreId: "success_score",
      organisationId: orgId,
      value: businessHealth,
      maxValue: 100,
      calculatedAt: now,
    });
  }

  return {
    scores,
    businessHealth,
    businessHealthDelta: 0,
    healthTrend: [],
    financeScore: finance ?? 0,
    evidence,
    evidenceCoveragePercent,
    measuredDimensionCount,
    confidence,
    scoresLive,
  };
}

export function getScoreValue(scores: ScoreResult[], id: ScoreId): number {
  return scores.find((s) => s.scoreId === id)?.value ?? 0;
}

export function hasScoreEvidence(result: OrgScoresResult, id: ScoreId): boolean {
  return result.scores.some((score) => score.scoreId === id);
}
