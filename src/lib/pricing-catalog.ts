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

export type IndustryPlatformCatalogItem = {
  platformId: string;
  label: string;
  icon: string;
  price: string;
  expansion: string;
  description: string;
  proposition: string;
  roadmap: "founding" | "coming" | "future";
  specialisations: Array<{
    id: string;
    label: string;
    appId?: string;
    status: CatalogStatus | "future";
    summary: string;
  }>;
};

/**
 * Industry Platforms — commercial catalog (Gen 2 lock).
 * Specialisation modules remain toggleable where appId exists.
 */
export const INDUSTRY_PLATFORM_CATALOG: IndustryPlatformCatalogItem[] = [
  {
    platformId: "property",
    label: "Property",
    icon: "🏢",
    price: "+$99/mo",
    expansion: "1 specialisation included · +$29/mo each additional",
    description:
      "One connected property operating platform — not five separate products.",
    proposition:
      "Activate Real Estate, Property Management, Accommodation, Commercial or Development as you grow.",
    roadmap: "founding",
    specialisations: [
      {
        id: "residential-real-estate",
        label: "Real Estate",
        appId: "real-estate",
        status: "live",
        summary: "Vendors, buyers, listings & appraisals",
      },
      {
        id: "property-management",
        label: "Property Management",
        appId: "property-management",
        status: "soon",
        summary: "Owners, tenants, leases & maintenance",
      },
      {
        id: "accommodation",
        label: "Accommodation",
        appId: "accommodation",
        status: "rolling-out",
        summary: "Bookings, guests, availability & revenue",
      },
      {
        id: "commercial-property",
        label: "Commercial Property",
        appId: "commercial",
        status: "soon",
        summary: "Commercial sales, leasing & assets",
      },
      {
        id: "property-development",
        label: "Property Development",
        status: "future",
        summary: "Projects, lots & settlements",
      },
    ],
  },
  {
    platformId: "finance",
    label: "Finance",
    icon: "💰",
    price: "+$99/mo",
    expansion: "1 specialisation included · +$29/mo each additional",
    description:
      "Professional finance ecosystem — Accounting & Bookkeeping first. Not an “Accounting App”.",
    proposition:
      "Accounting · Planning · Broking · Insurance · Lending · Advisory on one Finance platform.",
    roadmap: "founding",
    specialisations: [
      {
        id: "accounting-bookkeeping",
        label: "Accounting & Bookkeeping",
        appId: "finance",
        status: "soon",
        summary: "Clients, engagements, compliance & deadlines",
      },
      {
        id: "financial-planning",
        label: "Financial Planning",
        status: "soon",
        summary: "Advice workflows & annual reviews",
      },
      {
        id: "mortgage-finance-broking",
        label: "Mortgage & Finance Broking",
        status: "soon",
        summary: "Application → approval → settlement",
      },
      {
        id: "insurance",
        label: "Insurance",
        status: "soon",
        summary: "Quotes, policies & renewals",
      },
      {
        id: "business-advisory",
        label: "Business Advisory",
        status: "soon",
        summary: "Engagements, reviews & reporting",
      },
    ],
  },
  {
    platformId: "services",
    label: "Services",
    icon: "🛠️",
    price: "+$99/mo",
    expansion: "1 specialisation included · templates configure trades",
    description:
      "One Services App — Electrical, Cleaning, HVAC etc. via Service Templates.",
    proposition: "Never Electrician App / Plumber App — Industry + Template.",
    roadmap: "founding",
    specialisations: [
      {
        id: "trades",
        label: "Trades",
        appId: "services",
        status: "soon",
        summary: "Jobs, quotes & schedule",
      },
      {
        id: "cleaning",
        label: "Cleaning",
        status: "soon",
        summary: "Commercial & residential cleaning",
      },
      {
        id: "maintenance",
        label: "Maintenance",
        status: "soon",
        summary: "Maintenance & handyman",
      },
      {
        id: "construction",
        label: "Construction",
        status: "soon",
        summary: "Builder workflows",
      },
      {
        id: "field-services",
        label: "Field Services",
        status: "soon",
        summary: "Professional field services",
      },
    ],
  },
  {
    platformId: "commerce",
    label: "Commerce",
    icon: "🛒",
    price: "+$99/mo",
    expansion: "Coming soon — Retail · E-commerce · Wholesale",
    description:
      "Product businesses — not a separate Retail App. Order → Payment → Fulfilment.",
    proposition: "Retail, e-commerce, wholesale and distribution templates.",
    roadmap: "coming",
    specialisations: [
      { id: "retail", label: "Retail", status: "soon", summary: "Storefront & multi-location" },
      { id: "ecommerce", label: "E-commerce", status: "soon", summary: "Online commerce" },
      { id: "wholesale", label: "Wholesale", status: "soon", summary: "B2B wholesale" },
      { id: "distribution", label: "Distribution", status: "future", summary: "Distribution" },
    ],
  },
  {
    platformId: "automotive",
    label: "Automotive",
    icon: "🚗",
    price: "+$99/mo",
    expansion: "1 specialisation included · +$29/mo each additional",
    description: "Dealerships, mechanical, auto services and detailing.",
    proposition: "Inventory, quoting, servicing and follow-up on Core.",
    roadmap: "coming",
    specialisations: [
      {
        id: "dealerships",
        label: "Dealerships",
        appId: "automotive",
        status: "soon",
        summary: "Vehicle sales pipelines",
      },
      {
        id: "mechanical",
        label: "Mechanical",
        status: "soon",
        summary: "Workshop jobs",
      },
      {
        id: "automotive-services",
        label: "Automotive Services",
        status: "soon",
        summary: "Service workflows",
      },
      {
        id: "detailing",
        label: "Detailing",
        status: "soon",
        summary: "Detailing services",
      },
    ],
  },
  {
    platformId: "creator",
    label: "Creator",
    icon: "🎨",
    price: "+$99/mo",
    expansion: "1 specialisation included · +$29/mo each additional",
    description: "Creators, music, media and artists.",
    proposition: "Audience, content and memberships — lighter ops than Services.",
    roadmap: "coming",
    specialisations: [
      {
        id: "creators",
        label: "Creators",
        appId: "creator",
        status: "rolling-out",
        summary: "Creator businesses",
      },
      {
        id: "music-media",
        label: "Music & Media",
        status: "soon",
        summary: "Music and media businesses",
      },
      {
        id: "artists",
        label: "Artists",
        status: "soon",
        summary: "Artists and creatives",
      },
    ],
  },
];

/** @deprecated Prefer INDUSTRY_PLATFORM_CATALOG — flat module list for toggles */
export const INDUSTRY_APP_CATALOG: IndustryAppCatalogItem[] = [
  {
    appId: "real-estate",
    industryKey: "real-estate",
    label: "Real Estate",
    icon: "🏠",
    price: "Property",
    description: "Property specialisation — vendors, appraisals, listings & buyers",
    status: "live",
  },
  {
    appId: "accommodation",
    industryKey: "accommodation",
    label: "Accommodation",
    icon: "🏨",
    price: "Property",
    description: "Property specialisation — bookings, guests & short-stay",
    status: "rolling-out",
  },
  {
    appId: "property-management",
    industryKey: "property-management",
    label: "Property Management",
    icon: "🔑",
    price: "Property",
    description: "Property specialisation — owners, tenants, leases",
    status: "soon",
  },
  {
    appId: "commercial",
    industryKey: "commercial",
    label: "Commercial Property",
    icon: "🏢",
    price: "Property",
    description: "Property specialisation — commercial sales & leasing",
    status: "soon",
  },
  {
    appId: "services",
    industryKey: "services",
    label: "Services",
    icon: "🔧",
    price: "+$99/mo",
    description: "Services Industry — jobs & quotes; trades via Service Templates",
    status: "soon",
  },
  {
    appId: "finance",
    industryKey: "finance",
    label: "Finance",
    icon: "💰",
    price: "+$99/mo",
    description: "Finance Industry — Accounting first; broking, planning, insurance templates",
    status: "soon",
  },
  {
    appId: "automotive",
    industryKey: "automotive",
    label: "Automotive",
    icon: "🚗",
    price: "+$99/mo",
    description: "Automotive Industry — dealerships, mechanical & detailing",
    status: "soon",
  },
  {
    appId: "creator",
    industryKey: "creator",
    label: "Creator",
    icon: "✨",
    price: "+$99/mo",
    description: "Creator Industry — audience, content & studio",
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
    description: "Websites, funnels, brand, content, and Health Centre",
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
