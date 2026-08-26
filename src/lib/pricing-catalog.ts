import type { Addon, IndustryApp, PlatformTier, PremiumApp } from "@/lib/plans";
import {
  INDUSTRY_PLATFORMS as CORE_INDUSTRY_PLATFORMS,
  INDUSTRY_PUBLIC_GROUPS,
  type IndustryRoadmapLane,
} from "@dg/platform-core";

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
  roadmap: IndustryRoadmapLane;
  publicGroup: string;
  specialisations: Array<{
    id: string;
    label: string;
    appId?: string;
    status: CatalogStatus | "future" | "reserved";
    summary: string;
  }>;
};

function mapSpecStatus(
  status: string,
): CatalogStatus | "future" | "reserved" {
  if (status === "live" || status === "rolling-out" || status === "soon") return status;
  if (status === "reserved") return "reserved";
  return "future";
}

/**
 * Industry Platforms — derived from platform-core lock (`INDUSTRY_PLATFORMS`).
 * Prefer `listIndustries()` / `INDUSTRY_CATALOGUE` for UX status + Template hrefs;
 * this catalog keeps AppsPlanCatalog pricing cards aligned with platform truth.
 * Public pricing groups: Available · Early Access · Coming Soon · Architecture Reserved.
 */
export const INDUSTRY_PLATFORM_CATALOG: IndustryPlatformCatalogItem[] =
  CORE_INDUSTRY_PLATFORMS.map((platform) => {
    const group =
      INDUSTRY_PUBLIC_GROUPS.find((g) =>
        (g.industryIds as readonly string[]).includes(platform.id),
      )?.label ?? platform.roadmap;
    return {
      platformId: platform.id,
      label: platform.label,
      icon: platform.icon,
      price: `+${platform.price}`,
      expansion:
        platform.roadmap === "reserved"
          ? "Architecture reserved — not an active sell"
          : "1 Template included · +$29/mo each additional",
      description: platform.summary,
      proposition: platform.proposition,
      roadmap: platform.roadmap,
      publicGroup: group,
      specialisations: platform.specialisations.map((s) => ({
        id: s.id,
        label: s.label,
        appId: s.appId,
        status: mapSpecStatus(s.status),
        summary: s.summary,
      })),
    };
  });

export { INDUSTRY_PUBLIC_GROUPS };

/** @deprecated Prefer INDUSTRY_PLATFORM_CATALOG or listIndustries() — flat Gen 2 module toggles only */
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
    price: "Hospitality & Accommodation",
    description: "Hospitality & Accommodation Template — bookings, guests & short-stay",
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
    description: "Creator & Media Industry — audience, content & studio",
    status: "rolling-out",
  },
];

/** Mirrors pricing page — Growth Apps (optional; same order as public pricing) */
export const GROWTH_APP_CATALOG: GrowthAppCatalogItem[] = [
  {
    appId: "prospecting",
    premiumKey: "prospecting_pro",
    label: "Prospecting & Opportunity Engine",
    icon: "◎",
    price: "+$99/mo",
    description:
      "Find businesses → discovery → opportunity score → pipeline → CRM — optional Growth App billed separately",
    status: "live",
  },
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
    appId: "ai-communications",
    premiumKey: "voice_ai",
    label: "AI Communications",
    icon: "🎙️",
    price: "+$99/mo",
    description: "AI-assisted communications — Voice Agents still in development",
  },
  {
    appId: "reviews",
    label: "Reputation",
    icon: "★",
    price: "Free",
    badge: "Included · Early Access",
    status: "rolling-out",
    description:
      "Unified review inbox, connector sources, timeline requests & Reputation Score™ when real data exists — no Growth App charge",
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
    appId: "documents",
    label: "Documents & Signing",
    icon: "📄",
    price: "Included",
    badge: "Core",
    description: "Agreements, disclosures, contracts — org document library",
    status: "included",
  },
  {
    appId: "communications",
    label: "Communications",
    icon: "✉",
    price: "Included",
    badge: "Core",
    description: "Business email history, compose, CRM-linked communication records",
    status: "included",
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
