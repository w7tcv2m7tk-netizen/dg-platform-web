/**
 * DigitalGate Success Score™ — Command Centre v1.
 * Computed from connector health, CRM activity, Acc/RE usage, and billing.
 * @see docs/COMMAND-CENTRE.md
 */

import type { AgencyHealthTier } from "./types";

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

export type SuccessScoreResult = {
  successScore: number;
  breakdown: SuccessScoreBreakdown;
  tier: AgencyHealthTier;
  highlights: string[];
  concerns: string[];
};

function clamp(n: number, min = 0, max = 100) {
  return Math.round(Math.max(min, Math.min(max, n)));
}

function scoreConnectors(input: SuccessScoreInput): number {
  let score = 35;
  if (input.wordpressConfigured) score += 30;
  if (input.lastSyncAt) {
    const ageMs = Date.now() - Date.parse(input.lastSyncAt);
    if (Number.isFinite(ageMs)) {
      if (ageMs < 2 * 24 * 60 * 60 * 1000) score += 25;
      else if (ageMs < 7 * 24 * 60 * 60 * 1000) score += 15;
      else if (ageMs < 30 * 24 * 60 * 60 * 1000) score += 5;
    }
  }
  const needsWp = input.installedApps.some((a) =>
    ["real-estate", "accommodation"].includes(a),
  );
  if (needsWp && !input.wordpressConfigured) score -= 25;
  return clamp(score);
}

function scoreCrm(input: SuccessScoreInput): number {
  let score = 40;
  if (input.contactCount >= 50) score += 18;
  else if (input.contactCount >= 10) score += 12;
  else if (input.contactCount >= 1) score += 6;
  else score -= 10;

  if (input.leadsThisMonth >= 10) score += 16;
  else if (input.leadsThisMonth >= 3) score += 10;
  else if (input.leadsThisMonth >= 1) score += 5;
  else if (input.leadCount === 0) score -= 8;

  if (input.openOpportunities >= 3) score += 12;
  else if (input.openOpportunities >= 1) score += 6;

  if (input.activitiesThisMonth >= 20) score += 10;
  else if (input.activitiesThisMonth >= 5) score += 6;
  else if (input.activitiesThisMonth === 0) score -= 8;

  if (input.overdueLeadResponses > 0) {
    score -= Math.min(24, input.overdueLeadResponses * 6);
  } else if (input.leadCount > 0) {
    score += 6;
  }

  return clamp(score);
}

function scoreUsage(input: SuccessScoreInput): number {
  let score = 45;
  const apps = new Set(input.installedApps);
  if (apps.size >= 4) score += 14;
  else if (apps.size >= 2) score += 8;
  else if (apps.size === 0) score -= 15;

  if (apps.has("real-estate")) {
    if (input.listedPropertyCount >= 5) score += 14;
    else if (input.listedPropertyCount >= 1) score += 8;
    else if (input.propertyCount >= 1) score += 4;
    else score -= 6;
  }

  if (apps.has("accommodation")) {
    if (input.stayBookingsActive >= 3) score += 14;
    else if (input.stayBookingCount >= 1) score += 8;
    else score -= 6;
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
  const breakdown: SuccessScoreBreakdown = {
    connectors: scoreConnectors(input),
    crm: scoreCrm(input),
    usage: scoreUsage(input),
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

  if (
    !input.wordpressConfigured &&
    input.installedApps.some((a) => ["real-estate", "accommodation"].includes(a))
  ) {
    concerns.push("WordPress connector missing");
  }
  if (input.overdueLeadResponses > 0) {
    concerns.push(
      `${input.overdueLeadResponses} overdue lead response${input.overdueLeadResponses === 1 ? "" : "s"}`,
    );
  }
  if (input.contactCount === 0) concerns.push("No contacts");
  if (input.installedApps.length === 0) concerns.push("No apps installed");
  if (!input.hasBillingCustomer && input.status !== "trial") {
    concerns.push("No Stripe customer");
  }
  if (input.daysSinceUpdate > 14 && input.leadCount === 0) {
    concerns.push("Quiet for 14+ days");
  }
  if (input.status === "trial") concerns.push("On trial");

  const tier = tierFromScore(successScore, concerns.length, input);

  return { successScore, breakdown, tier, highlights, concerns };
}

export function tierFromScore(
  successScore: number,
  concernCount: number,
  input?: Pick<SuccessScoreInput, "leadsThisMonth" | "activitiesThisMonth">,
): AgencyHealthTier {
  const growing =
    (input?.leadsThisMonth ?? 0) > 0 || (input?.activitiesThisMonth ?? 0) >= 5;
  if (successScore >= 85 && concernCount <= 1 && growing) return "top_performer";
  if (successScore >= 85 && concernCount === 0) return "top_performer";
  if (successScore >= 70 && concernCount <= 2) return "healthy";
  if (successScore >= 70 && concernCount > 2) return "needs_attention";
  return "needs_attention";
}

export function tierLabel(tier: AgencyHealthTier): string {
  if (tier === "top_performer") return "Top performer";
  if (tier === "healthy") return "Healthy";
  return "Needs attention";
}
