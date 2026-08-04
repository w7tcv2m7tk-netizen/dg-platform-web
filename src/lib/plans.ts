export type PlatformTier = "starter" | "professional" | "business" | "enterprise";

export type IndustryApp =
  | "real-estate"
  | "accommodation"
  | "finance"
  | "services"
  | "automotive"
  | "commercial";

export type PremiumApp =
  | "seo_pro"
  | "social_pro"
  | "analytics_pro"
  | "ai_visibility_pro"
  | "automation_pro";

export type Addon = "voice_ai" | "training" | "white_label" | "extra_users";

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
    tagline: "Core CRM for solo operators",
  },
  {
    key: "professional",
    label: "Professional",
    price: "$249/mo",
    tagline: "Automation + 1 industry app",
  },
  {
    key: "business",
    label: "Business",
    price: "$499/mo",
    tagline: "AI visibility + unlimited apps",
  },
  {
    key: "enterprise",
    label: "Enterprise",
    price: "Custom",
    tagline: "White-label + priority support",
  },
];

export const INDUSTRY_APPS: { key: IndustryApp; label: string; price: string }[] = [
  { key: "real-estate", label: "Real Estate", price: "+$99/mo" },
  { key: "accommodation", label: "Accommodation", price: "+$99/mo" },
  { key: "finance", label: "Finance", price: "+$99/mo" },
  { key: "services", label: "Services & Trades", price: "+$99/mo" },
  { key: "automotive", label: "Automotive", price: "+$99/mo" },
  { key: "commercial", label: "Commercial", price: "+$99/mo" },
];

export const PREMIUM_APPS: { key: PremiumApp; label: string; price: string }[] = [
  { key: "seo_pro", label: "SEO Pro", price: "+$99/mo" },
  { key: "social_pro", label: "Social Pro", price: "+$79/mo" },
  { key: "analytics_pro", label: "Analytics Pro", price: "+$49/mo" },
  { key: "ai_visibility_pro", label: "AI Visibility Pro", price: "+$99/mo" },
  { key: "automation_pro", label: "Automation Pro", price: "+$49/mo" },
];

export const ADDONS: { key: Addon; label: string; price: string }[] = [
  { key: "voice_ai", label: "Voice AI", price: "+$99/mo" },
  { key: "training", label: "Training & Onboarding", price: "$497 once" },
  { key: "white_label", label: "White Label", price: "+$199/mo" },
  { key: "extra_users", label: "Extra Users", price: "+$29/user" },
];

export type SignupSelection = {
  platformTier: PlatformTier | "";
  industryApps: IndustryApp[];
  premiumApps: PremiumApp[];
  addons: Addon[];
};
