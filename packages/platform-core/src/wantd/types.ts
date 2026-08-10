/**
 * Wantd Property — demand-first “Want” capture on DigitalGate CRM Opportunities.
 * Architected so a dedicated Demand object can replace metadata later without breaking capture.
 * @see docs/WANTD.md
 */

export const WANTD_ORG_SLUG = "wantd";
export const WANTD_ORG_NAME = "Wantd";
export const WANTD_WEBSITE = "https://wantdproperty.com.au";
export const WANTD_VERTICAL = "Wantd Property";

/** Marks Opportunity.metadata as a Want (future Demand object migration key). */
export const WANT_RECORD_KIND = "want" as const;

export const WANT_TRANSACTIONS = ["buy", "invest", "rent"] as const;
export type WantTransaction = (typeof WANT_TRANSACTIONS)[number];

export const WANT_TIMELINES = [
  "immediate",
  "1_3_months",
  "3_6_months",
  "6_plus_months",
] as const;
export type WantTimeline = (typeof WANT_TIMELINES)[number];

/** Pipeline stages for property Wants (Opportunity.stage). */
export const WANT_STAGES = [
  "new",
  "contacted",
  "matching",
  "match_found",
  "inspection",
  "negotiation",
  "successful",
  "closed_lost",
] as const;
export type WantStage = (typeof WANT_STAGES)[number];

export type WantPropertyBrief = {
  propertyType?: string;
  preferredSuburbs?: string[];
  preferredRegions?: string[];
  minBudgetAud?: number;
  maxBudgetAud?: number;
  bedrooms?: number;
  bathrooms?: number;
  minLandSizeSqm?: number;
};

export type WantRequirements = {
  mustHaves?: string;
  lifestyle?: string;
  description?: string;
};

/** Stored on Opportunity.metadata when record_kind === "want". */
export type WantOpportunityMetadata = {
  record_kind: typeof WANT_RECORD_KIND;
  category: "property";
  vertical: typeof WANTD_VERTICAL;
  transaction: WantTransaction;
  property: WantPropertyBrief;
  requirements: WantRequirements;
  timeline: WantTimeline;
  /** Reserved: migrate to Demand.id later without losing history */
  demand_object_ready: false;
  source?: string;
  capture_path?: string;
};

export type CapturePropertyWantInput = {
  organisationId: string;
  actorId?: string;
  buyer: {
    name: string;
    email?: string;
    phone?: string;
  };
  transaction?: WantTransaction;
  property?: WantPropertyBrief;
  requirements?: WantRequirements;
  timeline?: WantTimeline;
  source?: string;
};

export type CapturePropertyWantResult =
  | {
      ok: true;
      contactId: string;
      opportunityId: string;
      createdContact: boolean;
    }
  | { ok: false; code: string; message: string };

export function isWantOpportunityMetadata(
  meta: Record<string, unknown> | null | undefined,
): meta is WantOpportunityMetadata & Record<string, unknown> {
  return meta?.record_kind === WANT_RECORD_KIND;
}

export function formatWantBudget(property: WantPropertyBrief): string | null {
  const min = property.minBudgetAud;
  const max = property.maxBudgetAud;
  if (min == null && max == null) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(n);
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)}`;
  if (max != null) return `Up to ${fmt(max)}`;
  return `From ${fmt(min!)}`;
}

export function buildWantTitle(input: {
  buyerName: string;
  transaction: WantTransaction;
  property: WantPropertyBrief;
}): string {
  const parts: string[] = ["Want"];
  parts.push(input.transaction === "invest" ? "Invest" : input.transaction === "rent" ? "Rent" : "Buy");
  if (input.property.propertyType) parts.push(input.property.propertyType);
  const where =
    input.property.preferredSuburbs?.[0] ||
    input.property.preferredRegions?.[0];
  if (where) parts.push(`· ${where}`);
  const budget = formatWantBudget(input.property);
  if (budget) parts.push(`· ${budget}`);
  parts.push(`— ${input.buyerName}`);
  return parts.join(" ");
}
