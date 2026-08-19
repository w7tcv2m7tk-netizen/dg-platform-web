import type { Addon, IndustryApp, PlatformTier, PremiumApp } from "@/lib/plans";

export type CatalogStatus = "live" | "soon" | "rolling-out" | "included";

export type PlatformTierCatalogItem = {
  key: PlatformTier;
  label: string;
  icon: string;
  price: string;
  period: string;
  users: string;
  outcome: string;
  features: string[];
  popular?: boolean;
};

export type PlatformAddonCatalogItem = {
  key: Addon;
  label: string;
  icon: string;
  price: string;
  description: string;
  pricingHref: string;
};

export type IndustryAppCatalogItem = {
  appId: string;
  industryKey: IndustryApp;
  label: string;
  icon: string;
  price: string;
  description: string;
  status: CatalogStatus;
};

export type GrowthAppCatalogItem = {
  appId: string;
  /** Stripe / plan premium key when billed separately; omit for included Growth Apps. */
  premiumKey?: PremiumApp;
  label: string;
  icon: string;
  price: string;
  description: string;
  status?: CatalogStatus;
  badge?: string;
};

export type PlatformCapabilityCatalogItem = {
  appId: string;
  label: string;
  icon: string;
  price: string;
  description: string;
  status: CatalogStatus;
  badge?: string;
};

/** Mirrors digitalgate.com.au/pricing — Platform section */
export const PLATFORM_TIER_CATALOG: PlatformTierCatalogItem[] = [
  {
    key: "starter",
    label: "Starter",
    icon: "🚀",
    price: "$99",
    period: "/month",
    users: "1 User",
    outcome: "For businesses replacing spreadsheets.",
    features: [
      "Platform Core",
      "CRM & Dashboard",
      "AI Assistant",
      "Digital Twin snapshot",
    ],
  },
  {
    key: "professional",
    label: "Growth",
    icon: "📈",
    price: "$249",
    period: "/month",
    users: "5 Users",
    outcome: "For businesses ready to automate growth.",
    features: [
      "Everything in Starter",
      "Automation & workflows",
      "Email + SMS",
      "Websites",
      "Advanced reporting",
    ],
    popular: true,
  },
  {
    key: "business",
    label: "Scale",
    icon: "🏢",
    price: "$499",
    period: "/month",
    users: "Unlimited Users",
    outcome: "For teams running their entire operation.",
    features: [
      "Everything in Growth",
      "Advanced AI & automation",
      "API access",
      "Multiple pipelines",
      "Advanced permissions & BI",
    ],
  },
  {
    key: "enterprise",
    label: "Enterprise",
    icon: "🏛️",
    price: "Custom",
    period: "",
    users: "Unlimited Users",
    outcome: "For organisations needing complete customisation.",
    features: [
      "Everything in Scale",
      "White label",
      "Priority support & SLA",
      "Custom integrations",
    ],
  },
];

/** Mirrors pricing page — Extend your platform */
export const PLATFORM_ADDON_CATALOG: PlatformAddonCatalogItem[] = [
  {
    key: "extra_users",
    label: "Extra Users",
    icon: "👥",
    price: "+$29/user",
    description: "Additional team seats beyond your plan limit",
    pricingHref: "https://digitalgate.com.au/pricing#addons",
  },
  {
    key: "white_label",
    label: "White Label",
    icon: "🏷️",
    price: "+$199/mo",
    description: "Your brand on the platform — for agencies & resellers",
    pricingHref: "https://digitalgate.com.au/pricing#addons",
  },
];

/** Mirrors pricing page — Industry Apps grid (property ecosystem grouped first) */
export const INDUSTRY_APP_CATALOG: IndustryAppCatalogItem[] = [
  {
    appId: "real-estate",
    industryKey: "real-estate",
    label: "Real Estate",
    icon: "🏠",
    price: "+$99/mo",
    description: "Vendor leads, appraisals, listings & buyer pipelines",
    status: "live",
  },
  {
    appId: "accommodation",
    industryKey: "accommodation",
    label: "Accommodation",
    icon: "🏨",
    price: "+$99/mo",
    description: "Bookings, guests, housekeeping & OTA sync",
    status: "rolling-out",
  },
  {
    appId: "property-management",
    industryKey: "property-management",
    label: "Property Management",
    icon: "🔑",
    price: "+$99/mo",
    description: "Long-term rentals — owners, tenants, leases & maintenance",
    status: "soon",
  },
  {
    appId: "commercial",
    industryKey: "commercial",
    label: "Commercial Property",
    icon: "🏢",
    price: "+$99/mo",
    description: "Commercial sales, leasing, landlords, tenants & assets",
    status: "soon",
  },
  {
    appId: "services",
    industryKey: "services",
    label: "Services",
    icon: "🔧",
    price: "+$99/mo",
    description: "One App for trades — jobs, quotes, schedule; industry via Service Templates",
    status: "soon",
  },
  {
    appId: "finance",
    industryKey: "finance",
    label: "Finance",
    icon: "💰",
    price: "+$99/mo",
    description: "Loans, lenders, borrowers & finance pipeline",
    status: "soon",
  },
  {
    appId: "automotive",
    industryKey: "automotive",
    label: "Automotive",
    icon: "🚗",
    price: "+$99/mo",
    description: "Inventory, test drives & dealership pipelines",
    status: "soon",
  },
  {
    appId: "creator",
    industryKey: "creator",
    label: "Creator",
    icon: "✨",
    price: "+$99/mo",
    description: "Audience tools, content & creator studio",
    status: "rolling-out",
  },
];

/** Mirrors pricing page — Growth Apps (same order as public pricing) */
export const GROWTH_APP_CATALOG: GrowthAppCatalogItem[] = [
  {
    appId: "ai-visibility",
    premiumKey: "ai_visibility_pro",
    label: "AI Visibility",
    icon: "🤖",
    price: "+$99/mo",
    description: "AI search visibility scoring & monitoring",
  },
  {
    appId: "seo",
    premiumKey: "seo_pro",
    label: "SEO",
    icon: "🔍",
    price: "+$99/mo",
    description: "Deep audits, rankings & technical optimisation",
  },
  {
    appId: "automation",
    premiumKey: "automation_pro",
    label: "Automation",
    icon: "⚡",
    price: "+$49/mo",
    description: "Multi-step workflows, triggers & webhooks",
  },
  {
    appId: "analytics",
    premiumKey: "analytics_pro",
    label: "Analytics",
    icon: "📊",
    price: "+$49/mo",
    description: "KPI snapshots, trends & custom reporting",
  },
  {
    appId: "social",
    premiumKey: "social_pro",
    label: "Social",
    icon: "📱",
    price: "+$79/mo",
    description: "Publish to LinkedIn, Facebook, Instagram, X & Pinterest",
  },
  {
    appId: "reviews",
    label: "Reputation",
    icon: "★",
    price: "Included",
    badge: "Founding Customer Early Access",
    status: "rolling-out",
    description:
      "Unified review inbox, connector sources, timeline requests & Reputation Score™ when real data exists",
  },
  {
    appId: "ai-communications",
    premiumKey: "voice_ai",
    label: "AI Communications",
    icon: "🎙️",
    price: "+$99/mo",
    description: "AI-assisted communications — Voice Agents still in development",
  },
];

/** Mirrors pricing page — Platform Capabilities (Core · Platform: Commerce, Websites, Infrastructure) */
export const PLATFORM_CAPABILITY_CATALOG: PlatformCapabilityCatalogItem[] = [
  {
    appId: "commerce",
    label: "Commerce",
    icon: "💳",
    price: "Included",
    badge: "Founding Customer Early Access",
    description: "Payments, quotes, invoices & checkout",
    status: "rolling-out",
  },
  {
    appId: "websites",
    label: "Design Studio",
    icon: "🌐",
    price: "Included",
    badge: "Included on Growth+",
    description: "Websites, funnels, logos, content, and Health Centre",
    status: "included",
  },
  {
    appId: "infrastructure",
    label: "Infrastructure",
    icon: "⚙",
    price: "Included",
    badge: "Founding Customer Early Access",
    description: "Domains, DNS, email, SSL & hosting — available progressively",
    status: "rolling-out",
  },
];

export const PRICING_PAGE_URL = "https://digitalgate.com.au/pricing";
