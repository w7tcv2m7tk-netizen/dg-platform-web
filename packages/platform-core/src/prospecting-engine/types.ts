/**
 * Prospecting & Opportunity Engine — shared contracts.
 *
 * Different front ends (Growth App Business Discovery, RE Vendor Prospecting, …)
 * one opportunity engine and one business record.
 *
 * @see docs/foundations/PROSPECTING-ENGINE.md
 */

/** Discovery modes under the shared Prospecting Engine. */
export type ProspectingDiscoveryMode =
  | "business"
  | "vendor"
  | "buyer"
  | "commercial_property"
  | "industry";

export type ProspectingDiscoveryModeMeta = {
  id: ProspectingDiscoveryMode;
  label: string;
  /** What the operator is finding. */
  prospectKind: string;
  /** Where the primary UI lives. */
  primarySurface: "growth_app" | "industry_app";
  /** Default route hint (may be industry-specific). */
  routeHint: string;
  summary: string;
};

export const PROSPECTING_DISCOVERY_MODES: ProspectingDiscoveryModeMeta[] = [
  {
    id: "business",
    label: "Business Discovery",
    prospectKind: "B2B businesses",
    primarySurface: "growth_app",
    routeHint: "/apps/prospecting/discovery",
    summary: "Find businesses that may need your product or service.",
  },
  {
    id: "vendor",
    label: "Vendor Discovery",
    prospectKind: "Residential property owners / vendors",
    primarySurface: "industry_app",
    routeHint: "/apps/re/vendor-prospecting",
    summary:
      "Find property owners most worth speaking to — not a dump of every house.",
  },
  {
    id: "buyer",
    label: "Buyer Discovery",
    prospectKind: "Buyer demand / matching",
    primarySurface: "industry_app",
    routeHint: "/apps/re/buyer-leads",
    summary: "Match buyer demand to opportunities and listings.",
  },
  {
    id: "commercial_property",
    label: "Commercial Property Discovery",
    prospectKind: "Owners / landlords / commercial opportunities",
    primarySurface: "industry_app",
    routeHint: "/apps/re/vendor-prospecting",
    summary: "Commercial owners, landlords, and related opportunities.",
  },
  {
    id: "industry",
    label: "Industry Discovery",
    prospectKind: "Vertical-specific prospect models",
    primarySurface: "industry_app",
    routeHint: "/apps/prospecting",
    summary: "Future vertical-specific prospect models on the shared engine.",
  },
];

export function getProspectingDiscoveryMode(
  id: ProspectingDiscoveryMode,
): ProspectingDiscoveryModeMeta {
  return (
    PROSPECTING_DISCOVERY_MODES.find((m) => m.id === id) ??
    PROSPECTING_DISCOVERY_MODES[0]!
  );
}

/**
 * What each Industry App must supply for a discovery mode.
 * Keep providers modular — do not hard-code property data vendors in core.
 */
export type IndustryDiscoveryProfile = {
  mode: ProspectingDiscoveryMode;
  prospectType: string;
  /** Registered data-source adapter ids (never embed provider SDKs here). */
  dataSourceIds: string[];
  scoringModelId: string;
  signalCatalog: string[];
  qualificationNotes: string[];
  recommendedActionTemplates: string[];
  complianceNotes: string[];
  workflowSteps: string[];
  crmObjectHints: string[];
};

/** Modular property / residential data source — register adapters; do not hard-code vendors. */
export type ProspectingDataSourceKind =
  | "places"
  | "abn"
  | "crm"
  | "campaign_engagement"
  | "property_market"
  | "ownership"
  | "listings_history"
  | "manual"
  | "other";

export type ProspectingDataSourceDescriptor = {
  id: string;
  label: string;
  kind: ProspectingDataSourceKind;
  /** Modes this source may feed. */
  modes: ProspectingDiscoveryMode[];
  /**
   * AU privacy / licensing / platform-terms posture must be reviewed before enablement.
   * Core never assumes a source is lawful for every tenant.
   */
  complianceReviewRequired: boolean;
  status: "available" | "planned" | "disabled";
};

export const CORE_PROSPECTING_DATA_SOURCES: ProspectingDataSourceDescriptor[] = [
  {
    id: "google_places",
    label: "Google Places",
    kind: "places",
    modes: ["business"],
    complianceReviewRequired: true,
    status: "available",
  },
  {
    id: "abn_lookup",
    label: "ABN Lookup",
    kind: "abn",
    modes: ["business"],
    complianceReviewRequired: true,
    status: "available",
  },
  {
    id: "crm_contacts",
    label: "CRM contacts & relationships",
    kind: "crm",
    modes: ["business", "vendor", "buyer", "commercial_property"],
    complianceReviewRequired: false,
    status: "available",
  },
  {
    id: "campaign_engagement",
    label: "Appraisal / marketing engagement",
    kind: "campaign_engagement",
    modes: ["vendor", "buyer"],
    complianceReviewRequired: true,
    status: "planned",
  },
  {
    id: "property_market_modular",
    label: "Property market (modular provider)",
    kind: "property_market",
    modes: ["vendor", "commercial_property", "buyer"],
    complianceReviewRequired: true,
    status: "planned",
  },
  {
    id: "ownership_modular",
    label: "Ownership / tenure (modular provider)",
    kind: "ownership",
    modes: ["vendor", "commercial_property"],
    complianceReviewRequired: true,
    status: "planned",
  },
  {
    id: "listings_history_modular",
    label: "Listings history (modular provider)",
    kind: "listings_history",
    modes: ["vendor", "buyer", "commercial_property"],
    complianceReviewRequired: true,
    status: "planned",
  },
];
