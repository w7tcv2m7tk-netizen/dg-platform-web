/**
 * Property Opportunity Score™ — contract for Vendor Discovery.
 * Scoring implementations live with Industry App / adapters; core owns the shape.
 *
 * @see docs/foundations/PROSPECTING-ENGINE.md
 */

export type PropertyOpportunityBand =
  | "high_vendor_potential"
  | "warm"
  | "watch"
  | "low";

export type PropertyOpportunitySignal = {
  id: string;
  label: string;
  /** Short operator-facing fact, e.g. "Owned for 11 years". */
  detail: string;
  /** Contribution hint −1..1 for explainability (optional). */
  weight?: number;
};

export type PropertyOpportunityScore = {
  /** 0–100 composite. */
  overall: number;
  band: PropertyOpportunityBand;
  bandLabel: string;
  signals: PropertyOpportunitySignal[];
  /** Next useful action — Operator Principle. */
  recommendedAction: string;
  /** ISO timestamp when scored. */
  scoredAt: string;
  /** Which modular sources contributed (ids only). */
  sourceIds: string[];
};

export function bandForPropertyScore(overall: number): {
  band: PropertyOpportunityBand;
  bandLabel: string;
} {
  if (overall >= 75) {
    return { band: "high_vendor_potential", bandLabel: "High Vendor Potential" };
  }
  if (overall >= 55) {
    return { band: "warm", bandLabel: "Warm Opportunity" };
  }
  if (overall >= 35) {
    return { band: "watch", bandLabel: "Watchlist" };
  }
  return { band: "low", bandLabel: "Low Priority" };
}

/** Illustrative signal catalogue for Vendor Prospecting UX / docs — not live data. */
export const VENDOR_SIGNAL_CATALOGUE: Array<{ id: string; label: string }> = [
  { id: "selling_period", label: "Approaching likely selling period" },
  { id: "long_ownership", label: "Long-term ownership" },
  { id: "absentee", label: "Absentee owner" },
  { id: "comps", label: "Recent comparable sales" },
  { id: "equity", label: "Significant equity potential" },
  { id: "expired_listing", label: "Expired / withdrawn listing (where permitted)" },
  { id: "off_market", label: "Coming off market" },
  { id: "development", label: "Development / subdivision potential" },
  { id: "portfolio", label: "Owner with multiple properties" },
  { id: "buyer_demand", label: "Strong local buyer demand" },
  { id: "buyer_match", label: "Matches known buyer requirements" },
  { id: "past_vendor", label: "Past vendor relationship" },
  { id: "crm_ownership", label: "CRM contact with property ownership" },
  { id: "appraisal_engagement", label: "Appraisal / valuation campaign engagement" },
  { id: "web_response", label: "Website / advertising response" },
];

/** Real Estate Industry App profile for Vendor Discovery (shared engine contract). */
export const REAL_ESTATE_VENDOR_DISCOVERY_PROFILE = {
  mode: "vendor" as const,
  prospectType: "residential_vendor",
  dataSourceIds: [
    "crm_contacts",
    "campaign_engagement",
    "property_market_modular",
    "ownership_modular",
    "listings_history_modular",
  ],
  scoringModelId: "property_opportunity_score",
  signalCatalog: VENDOR_SIGNAL_CATALOGUE.map((s) => s.id),
  qualificationNotes: [
    "Prioritise owners worth speaking to this week — not every property in the suburb",
    "Respect AU privacy, licensing and provider terms before enabling market/ownership sources",
  ],
  recommendedActionTemplates: [
    "Offer a complimentary market appraisal",
    "Re-engage past vendor relationship",
    "Match to active buyer requirement",
  ],
  complianceNotes: [
    "Modular data-source layer — do not hard-code a property-data vendor into Platform Core",
    "Expired/withdrawn listing signals only where legally and commercially permissible",
  ],
  workflowSteps: [
    "Vendor Prospecting",
    "Residential Properties",
    "Market Signals",
    "Potential Vendors",
    "Opportunities",
    "Appraisals",
    "Listings",
  ],
  crmObjectHints: ["Contact", "Lead", "Property", "Opportunity", "Activity"],
};
