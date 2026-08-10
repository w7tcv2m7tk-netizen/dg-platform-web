/**
 * DigitalGate Opportunity Engine™ — Platform Core.
 *
 * Customer-facing term: "Opportunities".
 * Command Centre is the primary cockpit; Apps consume the same signals.
 *
 * Does not invent MRR. Catalogue list prices are labelled as such.
 * CRM `Opportunity` (deals) remains a separate Universal Object.
 *
 * @see docs/foundations/OPPORTUNITY-ENGINE.md
 */

export type PlatformOpportunityKind =
  | "attention"
  | "prospect"
  | "expansion"
  | "score_gap"
  | "ops"
  | "reputation"
  | "follow_up";

export type PlatformOpportunitySeverity = "critical" | "high" | "medium" | "low";

export type PlatformOpportunityExecuteHint =
  | "task"
  | "email"
  | "sms"
  | "call"
  | "campaign"
  | "report"
  | "appointment"
  | "pipeline"
  | "automation";

/** Ranked platform opportunity — Core IP surface for Command Centre + Apps. */
export type PlatformOpportunity = {
  id: string;
  kind: PlatformOpportunityKind;
  severity: PlatformOpportunitySeverity;
  /** 0–100 opportunity score (higher = act sooner) */
  score: number;
  title: string;
  summary: string;
  reasons: string[];
  recommendedAction: string;
  href: string;
  organisationId?: string;
  organisationName?: string;
  prospectId?: string;
  /** Honest impact copy — never fabricated Stripe MRR */
  impactLabel?: string;
  source: string;
  executeHints?: PlatformOpportunityExecuteHint[];
};

export type ListPlatformOpportunitiesInput = {
  /** staff = Command Centre cross-tenant; org = single tenant (future Apps) */
  scope: "staff" | "org";
  organisationId?: string;
  limit?: number;
};

export type PlatformOpportunitiesBundle = {
  generatedAt: string;
  engine: "DigitalGate Opportunity Engine™";
  attentionCount: number;
  opportunityCount: number;
  items: PlatformOpportunity[];
  honestyNote: string;
};

export function severityRank(severity: PlatformOpportunitySeverity): number {
  switch (severity) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    default:
      return 3;
  }
}

export function clampOpportunityScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function severityForScore(score: number): PlatformOpportunitySeverity {
  if (score >= 90) return "critical";
  if (score >= 80) return "high";
  if (score >= 70) return "medium";
  return "low";
}
