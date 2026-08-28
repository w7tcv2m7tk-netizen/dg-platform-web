/**
 * DigitalGate Success Score™ — Command Centre v1.
 * Computed from connector health, CRM activity, Acc/RE usage, and billing.
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
  /**
   * When false, org is first-party / marketplace / operator — not a SaaS tenant
   * billed via platform Stripe. Missing `billingCustomerId` is not a concern.
   * Defaults to true when omitted.
   */
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

/**
 * Platform Stripe customer is for paying SaaS tenants.
 * First-party marketplace (Wantd), DigitalGate operator, and explicit exempts
 * must not look “broken” without inventing a Stripe customer.
 */
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

/** How much live tenant signal backs the score — sparse ≠ “needs attention”. */
export type SuccessScoreCoverage = "sparse" | "partial" | "rich";

export type SuccessScoreResult = {
  successScore: number;
  breakdown: SuccessScoreBreakdown;
  /** Quantified score band (Success Score™ thresholds). */
  scoreBand: SuccessScoreBand;
  /** Composite operational health — may differ from score band when concerns exist. */
  tier: AgencyHealthTier;
  /** Intervention level from observed blockers — null when score tier alone applies. */
  operationalHealth: AgencyHealthTier | null;
  highlights: string[];
  /** Observed problems only — never invented absence-of-data gaps. */
  concerns: string[];
  /** True when score is early / incomplete — do not invent attention from it. */
  provisional: boolean;
  dataCoverage: SuccessScoreCoverage;
};

/** Success Score™ band from numeric score only. */
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

export function assessSuccessScoreCoverage(
  input: SuccessScoreInput,
): SuccessScoreCoverage {
  let signals = 0;
  if (input.contactCount > 0) signals += 1;
  if (input.leadCount > 0) signals += 1;
  if (input.hasBillingCustomer) signals += 1;
  if (input.wordpressConfigured) signals += 1;
  if (input.activitiesThisMonth > 0) signals += 1;
  if (input.listedPropertyCount > 0 || input.stayBookingCount > 0) signals += 1;
  if (input.installedApps.length >= 2) signals += 1;
  if (input.activeSubscriptionCount > 0) signals += 1;
  if (signals <= 1) return "sparse";
  if (signals <= 3) return "partial";
  return "rich";
}

function clamp(n: number, min = 0, max = 100) {
  return Math.round(Math.max(min, Math.min(max, n)));
}

function scoreConnectors(input: SuccessScoreInput): number {
  // WordPress is optional legacy. Bonus if still healthy; no penalty when absent.
  let score = 70;
  if (input.wordpressConfigured) {
    score = 55;
    if (input.lastSyncAt) {
      const ageMs = Date.now() - Date.parse(input.lastSyncAt);
      if (Number.isFinite(ageMs)) {
        if (ageMs < 2 * 24 * 60 * 60 * 1000) score += 35;
        else if (ageMs < 7 * 24 * 60 * 60 * 1000) score += 25;
        else if (ageMs < 30 * 24 * 60 * 60 * 1000) score += 15;
        else score += 5;
      } else {
        score += 10;
      }
    } else {
      score += 10;
    }
  }
  return clamp(score);
}

function scoreCrm(input: SuccessScoreInput, coverage: SuccessScoreCoverage): number {
  let score = 40;
  if (input.contactCount >= 50) score += 18;
  else if (input.contactCount >= 10) score += 12;
  else if (input.contactCount >= 1) score += 6;
  // Sparse orgs: empty CRM is missing data, not a failure — don't invent a gap.
  else if (coverage === "rich") score -= 10;

  if (input.leadsThisMonth >= 10) score += 16;
  else if (input.leadsThisMonth >= 3) score += 10;
  else if (input.leadsThisMonth >= 1) score += 5;
  else if (input.leadCount === 0 && coverage === "rich") score -= 8;

  if (input.openOpportunities >= 3) score += 12;
  else if (input.openOpportunities >= 1) score += 6;

  if (input.activitiesThisMonth >= 20) score += 10;
  else if (input.activitiesThisMonth >= 5) score += 6;
  else if (input.activitiesThisMonth === 0 && coverage === "rich") score -= 8;

  if (input.overdueLeadResponses > 0) {
    score -= Math.min(24, input.overdueLeadResponses * 6);
  } else if (input.leadCount > 0) {
    score += 6;
  }

  return clamp(score);
}

function scoreUsage(input: SuccessScoreInput, coverage: SuccessScoreCoverage): number {
  let score = 45;
  const apps = new Set(input.installedApps);
  if (apps.size >= 4) score += 14;
  else if (apps.size >= 2) score += 8;
  else if (apps.size === 0 && coverage === "rich") score -= 15;

  if (apps.has("real-estate")) {
    if (input.listedPropertyCount >= 5) score += 14;
    else if (input.listedPropertyCount >= 1) score += 8;
    else if (input.propertyCount >= 1) score += 4;
    else if (coverage === "rich") score -= 6;
  }

  if (apps.has("accommodation")) {
    if (input.stayBookingsActive >= 3) score += 14;
    else if (input.stayBookingCount >= 1) score += 8;
    else if (coverage === "rich") score -= 6;
  }

  if (!apps.has("real-estate") && !apps.has("accommodation")) {
    if (input.memberCount >= 2) score += 8;
    if (input.contactCount >= 5) score += 6;
  }

  if (input.daysSinceUpdate > 21) score -= 12;
  else if (input.daysSinceUpdate > 14) score -= 6;
  else if (input.daysSinceUpdate <= 3) score += 4;

  return clamp(score);
}

function scoreBilling(input: SuccessScoreInput): number {
  const expectsBilling = input.expectsPlatformBilling !== false;

  // First-party / non-SaaS orgs: billing dimension is N/A — do not invent a gap.
  if (!expectsBilling) {
    let score = 72;
    if (input.status === "suspended" || input.status === "cancelled") score -= 30;
    return clamp(score);
  }

  let score = 40;
  if (input.hasBillingCustomer) score += 22;
  else if (input.status !== "trial") score -= 15;

  if (input.activeSubscriptionCount > 0) score += 18;
  if (input.subscriptionMrrCents >= 50_000) score += 12;
  else if (input.subscriptionMrrCents >= 10_000) score += 8;
  else if (input.subscriptionMrrCents > 0) score += 4;

  if (input.invoicePaidMtdCents >= 100_000) score += 10;
  else if (input.invoicePaidMtdCents > 0) score += 6;

  if (input.status === "active" && input.hasBillingCustomer) score += 6;
  if (input.status === "trial") score -= 4;
  if (input.status === "suspended" || input.status === "cancelled") score -= 30;

  return clamp(score);
}

/** Weights: connectors 20 · CRM 30 · Acc/RE usage 25 · billing 25 */
export function computeSuccessScore(input: SuccessScoreInput): SuccessScoreResult {
  const dataCoverage = assessSuccessScoreCoverage(input);
  const provisional = dataCoverage !== "rich";

  const breakdown: SuccessScoreBreakdown = {
    connectors: scoreConnectors(input),
    crm: scoreCrm(input, dataCoverage),
    usage: scoreUsage(input, dataCoverage),
    billing: scoreBilling(input),
  };

  const successScore = clamp(
    breakdown.connectors * 0.2 +
      breakdown.crm * 0.3 +
      breakdown.usage * 0.25 +
      breakdown.billing * 0.25,
  );

  const highlights: string[] = [];
  const concerns: string[] = [];

  if (provisional) {
    highlights.push(
      dataCoverage === "sparse"
        ? "Early data — score provisional"
        : "Partial data — score still maturing",
    );
  }
  if (breakdown.connectors >= 80) highlights.push("Connectors healthy");
  if (breakdown.crm >= 80) highlights.push("Strong CRM activity");
  if (breakdown.usage >= 80) highlights.push("High Acc/RE usage");
  if (breakdown.billing >= 80) highlights.push("Solid billing footing");
  if (input.leadsThisMonth > 0) {
    highlights.push(`${input.leadsThisMonth} lead${input.leadsThisMonth === 1 ? "" : "s"} this month`);
  }
  if (input.listedPropertyCount > 0) {
    highlights.push(`${input.listedPropertyCount} live listing${input.listedPropertyCount === 1 ? "" : "s"}`);
  }
  if (input.stayBookingsActive > 0) {
    highlights.push(`${input.stayBookingsActive} active stay${input.stayBookingsActive === 1 ? "" : "s"}`);
  }
  if (input.status === "trial") {
    highlights.push("On trial");
  }

  // Observed problems only — do not invent gaps from empty CRM / trial / no apps.
  // WordPress is optional legacy (WP detach); missing WP is not an attention reason.
  if (input.overdueLeadResponses > 0) {
    concerns.push(
      `${input.overdueLeadResponses} overdue lead response${input.overdueLeadResponses === 1 ? "" : "s"}`,
    );
  }
  if (
    input.expectsPlatformBilling !== false &&
    !input.hasBillingCustomer &&
    input.status !== "trial"
  ) {
    concerns.push("No Stripe customer");
  }
  if (input.daysSinceUpdate > 14 && input.leadCount > 0) {
    concerns.push("Quiet for 14+ days after prior lead activity");
  }
  if (input.status === "suspended" || input.status === "cancelled") {
    concerns.push(`Org status: ${input.status}`);
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

/**
 * Operational health — concern-driven intervention level only.
 * Does not mirror score bands; high scores stay healthy unless a blocker exists.
 */
export function operationalHealthTier(
  successScore: number,
  concerns: string[],
  input?: Pick<
    SuccessScoreInput,
    "leadsThisMonth" | "activitiesThisMonth" | "status"
  >,
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

  const hasBillingFailure = concerns.some(
    (c) => c.includes("Stripe") || c.toLowerCase().includes("billing"),
  );
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
  if (
    tier === "top_performer" ||
    tier === "healthy" ||
    tier === "needs_attention" ||
    tier === "at_risk" ||
    tier === "critical"
  ) {
    return tierLabel(tier);
  }
  return tier;
}
