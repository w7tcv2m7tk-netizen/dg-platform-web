import type { OrganisationBusinessProfile } from "../org/business-profile-types";
import type { DigitalTwinSnapshot } from "../twin/types";
import type { ScoreId, ScoreResult } from "./types";

function clamp(value: number, min = 0, max = 100) {
  return Math.round(Math.max(min, Math.min(max, value)));
}

function scoreFromWebsite(snapshot: DigitalTwinSnapshot): number {
  const probe = snapshot.scores.websiteHealth;
  if (typeof probe === "number" && probe > 0) return clamp(probe);

  const contacts = snapshot.metrics.contactCount ?? 0;
  const connectors = snapshot.metrics.connectedConnectors ?? 0;
  return clamp(55 + connectors * 8 + (contacts > 0 ? 10 : 0));
}

function scoreFromSeo(websiteHealth: number, snapshot: DigitalTwinSnapshot): number {
  const pagespeedBonus =
    snapshot.scores.websiteHealth && snapshot.scores.websiteHealth >= 85 ? 6 : 0;
  return clamp(websiteHealth * 0.88 + pagespeedBonus + 4);
}

function scoreFromAiVisibility(
  enabledAppIds: string[],
  websiteHealth: number,
  profile?: OrganisationBusinessProfile | null,
): number {
  let base = websiteHealth * 0.82 + 8;
  if (enabledAppIds.includes("ai-visibility")) base += 8;
  if (enabledAppIds.includes("seo")) base += 4;
  if (enabledAppIds.includes("marketing")) base += 3;
  if (profile?.websiteUrl?.trim()) base += 4;
  if (profile?.social?.googleBusiness?.trim()) base += 6;
  const socialCount = Object.values(profile?.social ?? {}).filter(Boolean).length;
  if (socialCount >= 3) base += 4;
  if (profile?.brandVoice?.services?.trim() && profile?.brandVoice?.targetAudience?.trim()) {
    base += 3;
  }
  return clamp(base);
}

function scoreFromBusinessGrowth(snapshot: DigitalTwinSnapshot): number {
  const leads = snapshot.metrics.activeLeads ?? 0;
  const pipeline = snapshot.metrics.pipelineValue ?? 0;
  const revenue = (snapshot.metrics.revenueMtdCents ?? 0) / 100;
  let score = 50;
  if (leads >= 5) score += 12;
  else if (leads >= 1) score += 6;
  if (pipeline >= 1_000_000) score += 15;
  else if (pipeline >= 100_000) score += 8;
  if (revenue >= 10_000) score += 10;
  else if (revenue > 0) score += 5;
  return clamp(score);
}

function scoreFromSales(snapshot: DigitalTwinSnapshot, metrics: OverviewMetricsContext): number {
  let score = 55;
  if (metrics.newLeadsThisWeek > 0) score += Math.min(15, metrics.newLeadsThisWeek * 2);
  if (metrics.listedPropertyCount > 0) score += 10;
  if (metrics.overdueFollowUps === 0 && (snapshot.metrics.activeLeads ?? 0) > 0) score += 8;
  if (metrics.overdueFollowUps > 0) score -= Math.min(20, metrics.overdueFollowUps * 4);
  return clamp(score);
}

function scoreFromCx(snapshot: DigitalTwinSnapshot, metrics: OverviewMetricsContext): number {
  let score = 70;
  if (metrics.hasTimelineActivity) score += 8;
  if (metrics.contactCount >= 10) score += 6;
  if (metrics.overdueFollowUps > 2) score -= 10;
  return clamp(score);
}

function scoreFromAutomation(enabledAppIds: string[], metrics: OverviewMetricsContext): number {
  let score = 45;
  if (enabledAppIds.includes("automation")) score += 20;
  if (metrics.openTasksDue === 0) score += 15;
  else if (metrics.openTasksDue <= 5) score += 8;
  else score -= Math.min(15, metrics.openTasksDue);
  if (metrics.hasTimelineActivity) score += 5;
  return clamp(score);
}

function scoreFromFinance(snapshot: DigitalTwinSnapshot, metrics: OverviewMetricsContext): number {
  const revenue = metrics.revenueMtdCents ?? snapshot.metrics.revenueMtdCents ?? 0;
  const overdue = snapshot.metrics.overdueArCents ?? 0;
  let score = 60;
  if (revenue > 0) score += 20;
  if (overdue === 0 && revenue > 0) score += 12;
  if (overdue > 0) score -= 15;
  if (metrics.activeSubscriptions > 0) score += 8;
  return clamp(score);
}

export interface CalculateScoresInput {
  snapshot: DigitalTwinSnapshot;
  enabledAppIds: string[];
  metrics: OverviewMetricsContext;
  profile?: OrganisationBusinessProfile | null;
  /** When set (e.g. from Reviews feed), overrides CX heuristic for reputation. */
  reputationOverride?: number | null;
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
  businessHealthDelta: number;
  healthTrend: number[];
  financeScore: number;
}

/** Compute org scores from a Digital Twin snapshot. */
export function calculateOrgScores(input: CalculateScoresInput): OrgScoresResult {
  const { snapshot, enabledAppIds, metrics, profile, reputationOverride } = input;
  const now = new Date();
  const orgId = snapshot.organisationId;

  const websiteHealth = scoreFromWebsite(snapshot);
  const seo = scoreFromSeo(websiteHealth, snapshot);
  const aiVisibility = scoreFromAiVisibility(enabledAppIds, websiteHealth, profile);
  const businessGrowth = scoreFromBusinessGrowth(snapshot);
  const sales = scoreFromSales(snapshot, metrics);
  const cx = scoreFromCx(snapshot, metrics);
  const reputation =
    reputationOverride != null && Number.isFinite(reputationOverride)
      ? clamp(reputationOverride)
      : cx;
  const automation = scoreFromAutomation(enabledAppIds, metrics);
  const finance = scoreFromFinance(snapshot, metrics);

  const businessHealth = clamp(
    aiVisibility * 0.14 +
      seo * 0.12 +
      websiteHealth * 0.16 +
      businessGrowth * 0.12 +
      sales * 0.16 +
      reputation * 0.12 +
      automation * 0.08 +
      finance * 0.1,
  );

  const scores: ScoreResult[] = [
    { scoreId: "ai_visibility", organisationId: orgId, value: aiVisibility, maxValue: 100, calculatedAt: now },
    { scoreId: "seo", organisationId: orgId, value: seo, maxValue: 100, calculatedAt: now },
    { scoreId: "website_health", organisationId: orgId, value: websiteHealth, maxValue: 100, calculatedAt: now },
    { scoreId: "business_growth", organisationId: orgId, value: businessGrowth, maxValue: 100, calculatedAt: now },
    { scoreId: "conversion", organisationId: orgId, value: sales, maxValue: 100, calculatedAt: now },
    { scoreId: "reputation", organisationId: orgId, value: reputation, maxValue: 100, calculatedAt: now },
    { scoreId: "automation", organisationId: orgId, value: automation, maxValue: 100, calculatedAt: now },
    { scoreId: "success_score", organisationId: orgId, value: businessHealth, maxValue: 100, calculatedAt: now },
  ];

  const delta = clamp(
    (metrics.newLeadsThisWeek > 0 ? 2 : 0) +
      (metrics.overdueFollowUps === 0 ? 1 : -1) +
      (websiteHealth >= 85 ? 1 : 0),
    -5,
    8,
  );

  const healthTrend = buildHealthTrend(businessHealth, delta);

  return { scores, businessHealth, businessHealthDelta: delta, healthTrend, financeScore: finance };
}

function buildHealthTrend(current: number, delta: number): number[] {
  const months = 12;
  const start = clamp(current - delta * 3 - 8, 40, current - 5);
  return Array.from({ length: months }, (_, i) => {
    if (i === months - 1) return current;
    const progress = i / (months - 1);
    return clamp(start + (current - start) * progress * 0.85 + i * 0.3);
  });
}

export function getScoreValue(scores: ScoreResult[], id: ScoreId): number {
  return scores.find((s) => s.scoreId === id)?.value ?? 0;
}
