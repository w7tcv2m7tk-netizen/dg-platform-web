/**
 * DigitalGate Success Score™ — Command Centre.
 *
 * Scores live customer/platform health from common adoption signals plus the
 * operating model implied by the organisation's active apps. Missing data is
 * never treated as a failure when the score is still provisional.
 * @see docs/COMMAND-CENTRE.md
 */

import type { AgencyHealthTier, SuccessScoreBand } from "./types";

export type SuccessScoreBreakdown = {
  connectors: number;
  crm: number;
  usage: number;
  billing: number;
};

export type SuccessScoreInput = {
  wordpressConfigured: boolean;
  lastSyncAt: string | null;
  hasBillingCustomer: boolean;
  /** False for first-party / marketplace / operator organisations. */
  expectsPlatformBilling?: boolean;
  status: string;
  memberCount: number;
  contactCount: number;
  leadCount: number;
  leadsThisMonth: number;
  openOpportunities: number;
  overdueLeadResponses: number;
  activitiesThisMonth: number;
  propertyCount: number;
  listedPropertyCount: number;
  stayBookingCount: number;
  stayBookingsActive: number;
  installedApps: string[];
  activeSubscriptionCount: number;
  subscriptionMrrCents: number;
  invoicePaidMtdCents: number;
  daysSinceUpdate: number;
};

export function organisationExpectsPlatformBilling(org: {
  slug?: string | null;
  industry?: string | null;
  settings?: unknown;
}): boolean {
  const settings = (org.settings ?? null) as {
    billing?: { platformExempt?: boolean };
    featureFlags?: Record<string, boolean>;
  } | null;

  if (settings?.billing?.platformExempt === true) return false;
  if (settings?.featureFlags?.["billing.platform_exempt"] === true) return false;

  const slug = (org.slug ?? "").toLowerCase();
  if (slug === "wantd" || slug === "digitalgate" || slug.startsWith("digitalgate-")) {
    return false;
  }
  if ((org.industry ?? "").toLowerCase() === "marketplace") return false;
  return true;
}

export type SuccessScoreCoverage = "sparse" | "partial" | "rich";

type BusinessModel =
  | "real_estate"
  | "accommodation"
  | "services"
  | "marketplace"
  | "creator"
  | "general";

export type SuccessScoreResult = {
  successScore: number;
  breakdown: SuccessScoreBreakdown;
  scoreBand: SuccessScoreBand;
  tier: AgencyHealthTier;
  operationalHealth: AgencyHealthTier | null;
  highlights: string[];
  concerns: string[];
  provisional: boolean;
  dataCoverage: SuccessScoreCoverage;
};

function normalisedApps(input: SuccessScoreInput): Set<string> {
  return new Set(input.installedApps.map((app) => app.toLowerCase()));
}

function hasApp(apps: Set<string>, ...needles: string[]): boolean {
  return [...apps].some((app) => needles.some((needle) => app.includes(needle)));
}

function businessModel(input: SuccessScoreInput): BusinessModel {
  const apps = normalisedApps(input);
  if (hasApp(apps, "accommodation", "hospitality")) return "accommodation";
  if (hasApp(apps, "real-estate", "real_estate", "property-sales")) return "real_estate";
  if (hasApp(apps, "marketplace", "wantd")) return "marketplace";
  if (hasApp(apps, "services", "cleaning", "maintenance", "electric", "plumb")) return "services";
  if (hasApp(apps, "creator", "media", "music")) return "creator";
  return "general";
}

export function scoreBandToAgencyTier(band: SuccessScoreBand): AgencyHealthTier {
  if (band === "excellent") return "top_performer";
  if (band === "healthy") return "healthy";
  if (band === "needs_attention") return "needs_attention";
  if (band === "at_risk") return "at_risk";
  return "critical";
}

export function scoreBandFromScore(score: number): SuccessScoreBand {
  if (score >= 80) return "excellent";
  if (score >= 65) return "healthy";
  if (score >= 50) return "needs_attention";
  if (score >= 30) return "at_risk";
  return "critical";
}

export function scoreBandLabel(band: SuccessScoreBand): string {
  if (band === "excellent") return "Excellent";
  if (band === "healthy") return "Healthy";
  if (band === "needs_attention") return "Needs attention";
  if (band === "at_risk") return "At risk";
  return "Critical";
}

export function scoreBandEmoji(band: SuccessScoreBand): string {
  if (band === "excellent" || band === "healthy") return "🟢";
  if (band === "needs_attention") return "🟠";
  return "🔴";
}

export function assessSuccessScoreCoverage(input: SuccessScoreInput): SuccessScoreCoverage {
  let signals = 0;
  const model = businessModel(input);
  if (input.contactCount > 0) signals += 1;
  if (input.leadCount > 0) signals += 1;
  if (input.activitiesThisMonth > 0) signals += 1;
  if (input.installedApps.length > 0) signals += 1;
  if (input.hasBillingCustomer || input.expectsPlatformBilling === false) signals += 1;
  if (input.activeSubscriptionCount > 0) signals += 1;
  if (model === "real_estate" && input.propertyCount > 0) signals += 2;
  if (model === "accommodation" && input.stayBookingCount > 0) signals += 2;
  if (input.openOpportunities > 0) signals += 1;
  if (signals <= 1) return "sparse";
  if (signals <= 3) return "partial";
  return "rich";
}

function clamp(n: number, min = 0, max = 100) {
  return Math.round(Math.max(min, Math.min(max, n)));
}

function scoreConnectors(input: SuccessScoreInput): number {
  // Connector health is now a small compatibility signal. WordPress is optional legacy.
  if (!input.wordpressConfigured) return 75;
  if (!input.lastSyncAt) return 70;
  const ageMs = Date.now() - Date.parse(input.lastSyncAt);
  if (!Number.isFinite(ageMs)) return 70;
  if (ageMs < 2 * 24 * 60 * 60 * 1000) return 95;
  if (ageMs < 7 * 24 * 60 * 60 * 1000) return 85;
  if (ageMs < 30 * 24 * 60 * 60 * 1000) return 75;
  return 60;
}

function scoreCrm(input: SuccessScoreInput, coverage: SuccessScoreCoverage): number {
  let score = 50;
  if (input.contactCount >= 50) score += 16;
  else if (input.contactCount >= 10) score += 11;
  else if (input.contactCount >= 1) score += 6;
  else if (coverage === "rich") score -= 6;

  if (input.leadsThisMonth >= 10) score += 16;
  else if (input.leadsThisMonth >= 3) score += 11;
  else if (input.leadsThisMonth >= 1) score += 6;

  if (input.openOpportunities >= 3) score += 12;
  else if (input.openOpportunities >= 1) score += 7;

  if (input.activitiesThisMonth >= 20) score += 12;
  else if (input.activitiesThisMonth >= 5) score += 7;
  else if (input.activitiesThisMonth >= 1) score += 3;

  if (input.overdueLeadResponses > 0) score -= Math.min(24, input.overdueLeadResponses * 6);
  else if (input.leadCount > 0) score += 5;
  return clamp(score);
}

function scoreUsage(input: SuccessScoreInput, coverage: SuccessScoreCoverage): number {
  const apps = normalisedApps(input);
  const model = businessModel(input);
  let score = 50;

  if (apps.size >= 4) score += 12;
  else if (apps.size >= 2) score += 8;
  else if (apps.size === 1) score += 4;

  if (model === "real_estate") {
    if (input.listedPropertyCount >= 5) score += 24;
    else if (input.listedPropertyCount >= 1) score += 18;
    else if (input.propertyCount >= 1) score += 10;
    else if (coverage === "rich") score -= 8;
    if (input.openOpportunities > 0) score += 8;
  } else if (model === "accommodation") {
    if (input.stayBookingsActive >= 3) score += 24;
    else if (input.stayBookingsActive >= 1) score += 18;
    else if (input.stayBookingCount >= 1) score += 12;
    else if (coverage === "rich") score -= 8;
    if (input.contactCount >= 5) score += 5;
  } else if (model === "services") {
    // Services organisations are primarily judged on customer/workflow adoption,
    // not property or accommodation records.
    if (input.activitiesThisMonth >= 10) score += 18;
    else if (input.activitiesThisMonth >= 1) score += 10;
    if (input.openOpportunities > 0) score += 10;
    if (input.contactCount >= 5) score += 8;
  } else if (model === "marketplace") {
    // Marketplace tenants can be pre-launch without a conventional CRM pipeline.
    // Installed capability + recorded platform activity are the meaningful signals.
    if (apps.size >= 2) score += 12;
    if (input.activitiesThisMonth >= 1) score += 12;
    if (input.contactCount > 0 || input.leadCount > 0) score += 6;
  } else if (model === "creator") {
    // Creator/media organisations are not penalised for an empty sales CRM.
    if (apps.size >= 2) score += 12;
    if (input.activitiesThisMonth >= 1) score += 12;
    if (input.contactCount > 0) score += 6;
  } else {
    if (input.activitiesThisMonth >= 5) score += 12;
    else if (input.activitiesThisMonth >= 1) score += 6;
    if (input.openOpportunities > 0) score += 8;
    if (input.contactCount >= 5) score += 6;
  }

  if (input.daysSinceUpdate > 30) score -= 12;
  else if (input.daysSinceUpdate > 21) score -= 7;
  else if (input.daysSinceUpdate <= 3) score += 5;
  return clamp(score);
}

function scoreBilling(input: SuccessScoreInput): number {
  const expectsBilling = input.expectsPlatformBilling !== false;
  // N/A dimensions are neutral, not a fabricated positive or negative signal.
  if (!expectsBilling) {
    return input.status === "suspended" || input.status === "cancelled" ? 35 : 75;
  }

  let score = 45;
  if (input.hasBillingCustomer) score += 20;
  else if (input.status !== "trial") score -= 15;
  if (input.activeSubscriptionCount > 0) score += 18;
  if (input.subscriptionMrrCents >= 50_000) score += 12;
  else if (input.subscriptionMrrCents >= 10_000) score += 8;
  else if (input.subscriptionMrrCents > 0) score += 4;
  if (input.invoicePaidMtdCents >= 100_000) score += 10;
  else if (input.invoicePaidMtdCents > 0) score += 6;
  if (input.status === "active" && input.hasBillingCustomer) score += 5;
  if (input.status === "trial") score -= 3;
  if (input.status === "suspended" || input.status === "cancelled") score -= 30;
  return clamp(score);
}

/**
 * Gen 2 weights: connector compatibility 10 · CRM 30 · business-model usage 40 · billing 20.
 * Usage is deliberately dominant because customer success means using DigitalGate for the
 * business they actually operate, not merely having a connector or Stripe record.
 */
export function computeSuccessScore(input: SuccessScoreInput): SuccessScoreResult {
  const dataCoverage = assessSuccessScoreCoverage(input);
  const provisional = dataCoverage !== "rich";
  const model = businessModel(input);
  const breakdown: SuccessScoreBreakdown = {
    connectors: scoreConnectors(input),
    crm: scoreCrm(input, dataCoverage),
    usage: scoreUsage(input, dataCoverage),
    billing: scoreBilling(input),
  };

  const successScore = clamp(
    breakdown.connectors * 0.1 +
      breakdown.crm * 0.3 +
      breakdown.usage * 0.4 +
      breakdown.billing * 0.2,
  );

  const highlights: string[] = [];
  const concerns: string[] = [];
  if (provisional) {
    highlights.push(dataCoverage === "sparse" ? "Early data — score provisional" : "Partial data — score still maturing");
  }
  if (breakdown.crm >= 80) highlights.push("Strong CRM activity");
  if (breakdown.usage >= 80) highlights.push("Strong business workflow adoption");
  if (breakdown.billing >= 80 && input.expectsPlatformBilling !== false) highlights.push("Solid billing footing");
  if (input.leadsThisMonth > 0) highlights.push(`${input.leadsThisMonth} lead${input.leadsThisMonth === 1 ? "" : "s"} this month`);
  if (input.listedPropertyCount > 0) highlights.push(`${input.listedPropertyCount} live listing${input.listedPropertyCount === 1 ? "" : "s"}`);
  if (input.stayBookingsActive > 0) highlights.push(`${input.stayBookingsActive} active stay${input.stayBookingsActive === 1 ? "" : "s"}`);
  if (input.status === "trial") highlights.push("On trial");

  if (input.overdueLeadResponses > 0) {
    concerns.push(`${input.overdueLeadResponses} overdue lead response${input.overdueLeadResponses === 1 ? "" : "s"}`);
  }
  if (input.expectsPlatformBilling !== false && !input.hasBillingCustomer && input.status !== "trial") {
    concerns.push("No Stripe customer");
  }
  if (input.daysSinceUpdate > 14 && input.leadCount > 0) concerns.push("Quiet for 14+ days after prior lead activity");
  if (input.status === "suspended" || input.status === "cancelled") concerns.push(`Org status: ${input.status}`);

  // Conventional sales/adoption inactivity is only a concern for models where CRM
  // pipeline is a primary operating signal. Marketplace and creator tenants are not
  // marked unhealthy merely because they have no sales opportunities.
  if (
    !provisional &&
    (model === "real_estate" || model === "services" || model === "general") &&
    input.activitiesThisMonth <= 5 &&
    input.leadsThisMonth === 0 &&
    input.openOpportunities === 0 &&
    scoreBandFromScore(successScore) === "needs_attention"
  ) {
    concerns.push("Very low activity and no current opportunities");
  }

  const scoreBand = scoreBandFromScore(successScore);
  const operationalHealth = operationalHealthTier(successScore, concerns, input, provisional);
  return {
    successScore,
    breakdown,
    scoreBand,
    tier: scoreBandToAgencyTier(scoreBand),
    operationalHealth,
    highlights,
    concerns,
    provisional,
    dataCoverage,
  };
}

export function operationalHealthTier(
  successScore: number,
  concerns: string[],
  input?: Pick<SuccessScoreInput, "leadsThisMonth" | "activitiesThisMonth" | "status">,
  provisional = false,
): AgencyHealthTier | null {
  if (provisional) return null;
  const band = scoreBandFromScore(successScore);
  const concernCount = concerns.length;
  if (input?.status === "suspended" || input?.status === "cancelled") {
    return concernCount > 0 ? "critical" : "at_risk";
  }
  if (concernCount === 0) {
    if (band === "critical") return "critical";
    if (band === "at_risk") return "at_risk";
    return null;
  }
  const hasBillingFailure = concerns.some((c) => c.includes("Stripe") || c.toLowerCase().includes("billing"));
  const hasOverdueLeads = concerns.some((c) => c.includes("overdue"));
  if (hasBillingFailure || input?.status === "suspended") return "critical";
  if (hasOverdueLeads || concernCount >= 2) return "needs_attention";
  return "needs_attention";
}

export function tierLabel(tier: AgencyHealthTier): string {
  if (tier === "top_performer") return "Excellent";
  if (tier === "healthy") return "Healthy";
  if (tier === "needs_attention") return "Needs attention";
  if (tier === "at_risk") return "At risk";
  return "Critical";
}

export function isOperationalHealthyTier(tier: AgencyHealthTier): boolean {
  return tier === "top_performer" || tier === "healthy";
}

export function isOperationalAttentionTier(tier: AgencyHealthTier): boolean {
  return tier === "needs_attention" || tier === "at_risk" || tier === "critical";
}

export function healthTierDisplay(tier: string): string {
  if (tier === "top_performer" || tier === "healthy" || tier === "needs_attention" || tier === "at_risk" || tier === "critical") {
    return tierLabel(tier);
  }
  return tier;
}
