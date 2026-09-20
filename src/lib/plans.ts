export type PlatformTier = "starter" | "professional" | "business" | "enterprise";

/** Canonical tier gate for native specialist industry-platform integrations/APIs. */
export const INDUSTRY_INTEGRATION_MIN_TIER: PlatformTier = "business";
export const MULTI_BUSINESS_MIN_TIER: PlatformTier = "business";

export function canUseIndustryIntegrations(tier: PlatformTier | null | undefined): boolean {
  return tier === "business" || tier === "enterprise";
}

/** Multiple businesses/organisations under one subscription account require Scale+. */
export function canUseMultipleBusinesses(tier: PlatformTier | null | undefined): boolean {
  return tier === "business" || tier === "enterprise";
}


export type IndustryApp =
  | "real-estate"
  | "accommodation"
  | "finance"
  | "services"
  | "creator"
  | "automotive"
  | "commercial"
  | "property-management";

export type PremiumApp =
  | "advertising_pro"
  | "marketing_pro"
  | "growth_suite"
  | "seo_pro"
  | "social_pro"
  | "analytics_pro"
  | "ai_visibility_pro"
  | "automation_pro"
  | "voice_ai"
  | "prospecting_pro";

export type Addon = "white_label" | "extra_users";

export const PLATFORM_TIERS: {
  key: PlatformTier;
  label: string;
  price: string;
  tagline: string;
}[] = [
  {
    key: "starter",
    label: "Starter",
    price: "$99/mo",
    tagline: "For businesses replacing spreadsheets",
  },
  {
    key: "professional",
    label: "Growth",
    price: "$249/mo",
    tagline: "For businesses ready to automate growth",
  },
  {
    key: "business",
    label: "Scale",
    price: "$499/mo",
    tagline: "For teams running their entire operation",
  },
  {
    key: "enterprise",
    label: "Enterprise",
    price: "Custom",
    tagline: "For organisations needing complete customisation",
  },
];

/**
 * Industry Apps ($149/mo · 1 sub-industry App included · +$29/mo each additional).
 * Exact sub-industry Apps are the customer-facing identity; defaultApp remains
 * legacy compatibility metadata for older signup / Stripe flows.
 * @see @dg/platform-core industry/platform.ts
 */
export type IndustryPlatformKey =
  | "property"
  | "hospitality-accommodation"
  | "services"
  | "finance"
  | "professional"
  | "health-wellness"
  | "automotive"
  | "retail-commerce"
  | "creator-media"
  | "transport-logistics"
  | "agriculture-primary"
  | "education-organisations";

export const INDUSTRY_PLATFORMS: {
  key: IndustryPlatformKey;
  label: string;
  price: string;
  specialisations: string;
  /** Legacy runtime fallback for older signup / Stripe flows; never customer-facing child identity. */
  defaultApp: IndustryApp | null;
}[] = [
  {
    key: "property",
    label: "Property",
    price: "+$149/mo",
    specialisations: "Real Estate · Property Management · Commercial Property · Property Development · Buyers Agency · Property Advisory",
    defaultApp: "real-estate",
  },
  {
    key: "hospitality-accommodation",
    label: "Hospitality & Accommodation",
    price: "+$149/mo",
    specialisations: "Short-Stay · Hotels & Motels · Holiday Parks & Retreats · Venues & Events · Restaurants & Cafés · Bars",
    defaultApp: "accommodation",
  },
  {
    key: "services",
    label: "Services",
    price: "+$149/mo",
    specialisations: "Electrical · Plumbing · Cleaning · Maintenance · HVAC · Building & Construction · Landscaping · Pest Control · Painting · Handyman · Solar · Pool Service",
    defaultApp: "services",
  },
  {
    key: "finance",
    label: "Finance",
    price: "+$149/mo",
    specialisations: "Mortgage & Finance Broking · Lending · Financial Advice · Accounting & Bookkeeping · Insurance Broking · Wealth Management",
    defaultApp: "finance",
  },
  {
    key: "professional",
    label: "Professional",
    price: "+$149/mo",
    specialisations: "Legal · Consulting · Engineering · Architecture · Surveying · Recruitment · HR Advisory · Marketing Agency",
    defaultApp: null,
  },
  {
    key: "health-wellness",
    label: "Health & Wellness",
    price: "+$149/mo",
    specialisations: "Medical Practice · Allied Health · Physiotherapy · Psychology · Dental · Veterinary · Fitness & Wellness",
    defaultApp: null,
  },
  {
    key: "automotive",
    label: "Automotive",
    price: "+$149/mo",
    specialisations: "Vehicle Dealerships · Service & Repair · Vehicle Rental · Tyres & Automotive Parts",
    defaultApp: "automotive",
  },
  {
    key: "retail-commerce",
    label: "Retail & Commerce",
    price: "+$149/mo",
    specialisations: "Retail · E-commerce · Wholesale & Distribution · Consumer Products & Brands · Franchise & Multi-location Retail",
    defaultApp: null,
  },
  {
    key: "creator-media",
    label: "Creator & Media",
    price: "+$149/mo",
    specialisations: "Creators & Influencers · Music & Artists · Creative Agencies · Publishers & Media · Production & Media · Digital Products",
    defaultApp: "creator",
  },
  {
    key: "transport-logistics",
    label: "Transport & Logistics",
    price: "+$149/mo",
    specialisations: "Transport · Courier & Delivery · Freight & Logistics · Warehousing · Fleet Operations · Removalists",
    defaultApp: null,
  },
  {
    key: "agriculture-primary",
    label: "Agriculture & Primary Industries",
    price: "+$149/mo",
    specialisations: "Farming · Horticulture · Livestock · Rural Services · Primary Production",
    defaultApp: null,
  },
  {
    key: "education-organisations",
    label: "Education & Organisations",
    price: "+$149/mo",
    specialisations: "Education & Training · Schools · Childcare · Membership Organisations · Associations & Clubs · Non-profits",
    defaultApp: null,
  },
];

/** @deprecated Prefer INDUSTRY_PLATFORMS — kept for Stripe / enabled-app toggles */
export const INDUSTRY_APPS: { key: IndustryApp; label: string; price: string; under: string }[] = [
  { key: "real-estate", label: "Real Estate", price: "Included w/ Property", under: "property" },
  {
    key: "accommodation",
    label: "Accommodation",
    price: "Included w/ Hospitality",
    under: "hospitality-accommodation",
  },
  { key: "property-management", label: "Property Management", price: "+$29/mo sub-industry App", under: "property" },
  { key: "commercial", label: "Commercial Property", price: "+$29/mo sub-industry App", under: "property" },
  { key: "services", label: "Services", price: "+$149/mo", under: "services" },
  { key: "finance", label: "Finance", price: "+$149/mo", under: "finance" },
  { key: "automotive", label: "Automotive", price: "+$149/mo", under: "automotive" },
  { key: "creator", label: "Creator", price: "+$149/mo", under: "creator-media" },
];

export const PREMIUM_APPS: { key: PremiumApp; label: string; price: string }[] = [
  { key: "prospecting_pro", label: "Prospecting & Opportunity Engine", price: "+$99/mo" },
  { key: "ai_visibility_pro", label: "AI Visibility", price: "+$99/mo" },
  { key: "seo_pro", label: "SEO", price: "+$99/mo" },
  { key: "automation_pro", label: "Automation", price: "+$49/mo" },
  { key: "analytics_pro", label: "Analytics", price: "+$49/mo" },
  { key: "social_pro", label: "Social", price: "+$79/mo" },
  { key: "voice_ai", label: "AI Voice Agents", price: "+$99/mo" },
];

export const ADDONS: { key: Addon; label: string; price: string }[] = [
  { key: "extra_users", label: "Extra Users", price: "+$29/user" },
  { key: "white_label", label: "White Label", price: "+$199/mo" },
];

export type SignupSelection = {
  platformTier: PlatformTier | "";
  industryApps: IndustryApp[];
  premiumApps: PremiumApp[];
  addons: Addon[];
};

export type DiscoveryInput = {
  teamSize?: string;
  industry?: string;
  challenges?: string[];
  softwareSpend?: string;
  aiLevel?: string;
  interestedIn?: string[];
};

/** Rule-based plan recommendation from AI Discovery answers. */
export function recommendPlanFromDiscovery(input: DiscoveryInput): SignupSelection {
  const challenges = input.challenges ?? [];
  const interested = input.interestedIn ?? [];
  let platformTier: PlatformTier = "professional";

  const team = input.teamSize ?? "";
  if (team === "Just me" || team === "1") {
    platformTier = "starter";
  } else if (team === "26–50" || team === "50+" || team === "11–25") {
    platformTier = "business";
  }

  const industryMap: Record<string, IndustryApp> = {
    "Real Estate": "real-estate",
    "Accommodation & Hospitality": "accommodation",
    "Hospitality & Accommodation": "accommodation",
    "Finance & Mortgage Broking": "finance",
    // Knowledge firms → Professional Industry (Coming); do not map to trades Services
    "Property Management": "property-management",
    "Commercial Property": "commercial",
  };
  const industryApps: IndustryApp[] = [];
  const mapped = input.industry ? industryMap[input.industry] : undefined;
  if (mapped) industryApps.push(mapped);

  const premiumApps: PremiumApp[] = [];
  if (
    challenges.includes("ai-visibility") ||
    challenges.includes("online-visibility") ||
    interested.includes("AI Visibility")
  ) {
    premiumApps.push("ai_visibility_pro");
  }
  if (challenges.includes("manual-follow-up") || interested.includes("Automation")) {
    premiumApps.push("automation_pro");
  }

  if (interested.includes("Voice AI") || interested.includes("AI Communications")) {
    premiumApps.push("voice_ai");
  }
  if (
    interested.includes("Prospecting") ||
    interested.includes("Prospecting & Opportunity Engine") ||
    challenges.includes("lead-generation") ||
    challenges.includes("pipeline")
  ) {
    premiumApps.push("prospecting_pro");
  }

  return { platformTier, industryApps, premiumApps, addons: [] };
}
