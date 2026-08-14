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

export const INDUSTRY_APPS: { key: IndustryApp; label: string; price: string }[] = [
  { key: "real-estate", label: "Real Estate", price: "+$99/mo" },
  { key: "accommodation", label: "Accommodation", price: "+$99/mo" },
  { key: "property-management", label: "Property Management", price: "+$99/mo" },
  { key: "commercial", label: "Commercial Property", price: "+$99/mo" },
  { key: "services", label: "Services", price: "+$99/mo" },
  { key: "finance", label: "Finance", price: "+$99/mo" },
  { key: "automotive", label: "Automotive", price: "+$99/mo" },
  { key: "creator", label: "Creator", price: "+$99/mo" },
];

export const PREMIUM_APPS: { key: PremiumApp; label: string; price: string }[] = [
  { key: "ai_visibility_pro", label: "AI Visibility", price: "+$99/mo" },
  { key: "seo_pro", label: "SEO", price: "+$99/mo" },
  { key: "automation_pro", label: "Automation", price: "+$49/mo" },
  { key: "analytics_pro", label: "Analytics", price: "+$49/mo" },
  { key: "social_pro", label: "Social", price: "+$79/mo" },
  { key: "voice_ai", label: "Voice AI", price: "+$99/mo" },
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

  if (interested.includes("Voice AI")) premiumApps.push("voice_ai");

  return { platformTier, industryApps, premiumApps, addons: [] };
}
