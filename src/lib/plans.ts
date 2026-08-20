export type PlatformTier = "starter" | "professional" | "business" | "enterprise";

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
  | "seo_pro"
  | "social_pro"
  | "analytics_pro"
  | "ai_visibility_pro"
  | "automation_pro"
  | "voice_ai";

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
 * Industry Platforms customers buy ($99/mo). Selecting a platform activates a
 * default specialisation module until billing migrates to a single Property SKU.
 * @see @dg/platform-core industry/platform.ts
 */
export type IndustryPlatformKey =
  | "property"
  | "finance"
  | "services"
  | "commerce"
  | "automotive"
  | "creator";

export const INDUSTRY_PLATFORMS: {
  key: IndustryPlatformKey;
  label: string;
  price: string;
  specialisations: string;
  /** Default Gen 2 module enabled when this Industry is selected at signup */
  defaultApp: IndustryApp | null;
}[] = [
  {
    key: "property",
    label: "Property",
    price: "+$99/mo",
    specialisations: "Real Estate · PM · Accommodation · Commercial · Development",
    defaultApp: "real-estate",
  },
  {
    key: "finance",
    label: "Finance",
    price: "+$99/mo",
    specialisations: "Accounting · Planning · Broking · Insurance · Advisory",
    defaultApp: "finance",
  },
  {
    key: "services",
    label: "Services",
    price: "+$99/mo",
    specialisations: "Trades · Cleaning · Maintenance · Construction · Field",
    defaultApp: "services",
  },
  {
    key: "commerce",
    label: "Commerce",
    price: "+$99/mo",
    specialisations: "Retail · E-commerce · Wholesale · Distribution",
    defaultApp: null,
  },
  {
    key: "automotive",
    label: "Automotive",
    price: "+$99/mo",
    specialisations: "Dealerships · Mechanical · Auto Services · Detailing",
    defaultApp: "automotive",
  },
  {
    key: "creator",
    label: "Creator",
    price: "+$99/mo",
    specialisations: "Creators · Music · Media · Artists",
    defaultApp: "creator",
  },
];

/** @deprecated Prefer INDUSTRY_PLATFORMS — kept for Stripe / enabled-app toggles */
export const INDUSTRY_APPS: { key: IndustryApp; label: string; price: string; under: string }[] = [
  { key: "real-estate", label: "Real Estate", price: "Property · included*", under: "property" },
  { key: "accommodation", label: "Accommodation", price: "Property · +$29*", under: "property" },
  { key: "property-management", label: "Property Management", price: "Property · +$29*", under: "property" },
  { key: "commercial", label: "Commercial Property", price: "Property · +$29*", under: "property" },
  { key: "services", label: "Services", price: "+$99/mo", under: "services" },
  { key: "finance", label: "Finance", price: "+$99/mo", under: "finance" },
  { key: "automotive", label: "Automotive", price: "+$99/mo", under: "automotive" },
  { key: "creator", label: "Creator", price: "+$99/mo", under: "creator" },
];

export const PREMIUM_APPS: { key: PremiumApp; label: string; price: string }[] = [
  { key: "ai_visibility_pro", label: "AI Visibility", price: "+$99/mo" },
  { key: "seo_pro", label: "SEO", price: "+$99/mo" },
  { key: "automation_pro", label: "Automation", price: "+$49/mo" },
  { key: "analytics_pro", label: "Analytics", price: "+$49/mo" },
  { key: "social_pro", label: "Social", price: "+$79/mo" },
  { key: "voice_ai", label: "AI Communications", price: "+$99/mo" },
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
    "Finance & Mortgage Broking": "finance",
    "Professional Services": "services",
    "Property Management": "property-management",
    "Commercial Property": "commercial",
    "Automotive": "automotive",
    "Creators & Personal Brands": "creator",
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

  return { platformTier, industryApps, premiumApps, addons: [] };
}
