/**
 * DigitalGate Marketplace — discover what a business can add.
 * Apps (installed) ≠ Marketplace (discover) ≠ Network (relationships).
 * Core capabilities are not listed — they already ship with the platform.
 */

import { platformApps } from "../apps/registry";
import type { AppTier } from "../apps/manifest";
import {
  getIndustryPrimaryHref,
  listIndustries,
  type IndustryCatalogueStatus,
} from "../industry/catalogue";

export const MARKETPLACE_CATEGORIES = [
  "apps",
  "services",
  "professionals",
  "partners",
  "integrations",
] as const;

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];

export const MARKETPLACE_CATEGORY_META: Record<
  MarketplaceCategory,
  { label: string; description: string }
> = {
  apps: {
    label: "Apps",
    description: "Industry and Growth capabilities you can add to your platform",
  },
  services: {
    label: "Services",
    description: "Operators who deliver work — design, bookkeeping, photography and more",
  },
  professionals: {
    label: "Professionals",
    description: "Trusted people and practices you can work with through your network",
  },
  partners: {
    label: "Partners",
    description: "Verified DigitalGate partners for implementation and growth support",
  },
  integrations: {
    label: "Integrations",
    description: "Connect the systems you already use into DigitalGate",
  },
};

export type MarketplaceListing = {
  id: string;
  category: MarketplaceCategory;
  name: string;
  summary: string;
  href?: string;
  badge?: string;
  /** Human-facing pill (e.g. Growth, Industry) — never permission IDs */
  layer?: string;
  ctaLabel?: string;
  tags?: string[];
  source: "app_registry" | "connector_catalog" | "org_company" | "curated";
  tier?: AppTier;
  industry?: string | null;
  /** Sort / section helpers */
  section?: "recommended" | "growth" | "industry" | "integrations" | "services" | "partners" | "coming_soon";
};

const CURATED_PARTNERS: MarketplaceListing[] = [
  {
    id: "partner:dg-agency",
    category: "partners",
    name: "DigitalGate Agency Partners",
    summary: "Implementation, onboarding and growth support from official DigitalGate partners.",
    badge: "Official",
    layer: "Partners",
    ctaLabel: "Explore",
    tags: ["onboarding", "agency"],
    source: "curated",
    section: "partners",
    href: "/dashboard/network",
  },
];

const CURATED_SERVICES: MarketplaceListing[] = [
  {
    id: "service:web-design",
    category: "services",
    name: "Web design & conversion",
    summary: "Landing pages, funnels and website improvements for your DigitalGate presence.",
    layer: "Services",
    ctaLabel: "Explore",
    tags: ["websites", "design"],
    source: "curated",
    section: "services",
    href: "/apps/websites",
  },
  {
    id: "service:accounting",
    category: "services",
    name: "Bookkeeping & accounting",
    summary: "GST-aware operators for Australian businesses — connect accounting tools when ready.",
    layer: "Services",
    ctaLabel: "Explore",
    tags: ["finance"],
    source: "curated",
    section: "services",
  },
  {
    id: "service:photography",
    category: "services",
    name: "Property photography & staging",
    summary: "Common referral partners for Real Estate and Accommodation businesses.",
    layer: "Services",
    ctaLabel: "Explore",
    tags: ["real-estate"],
    source: "curated",
    section: "services",
    href: "/dashboard/network/referrals",
  },
];

const CURATED_PROFESSIONALS: MarketplaceListing[] = [
  {
    id: "pro:coming-soon",
    category: "professionals",
    name: "Professionals directory",
    summary:
      "Trusted professionals from your network will appear here. Use Connections and Referrals to grow who you work with.",
    badge: "Coming soon",
    layer: "Professionals",
    ctaLabel: "View Connections",
    source: "curated",
    section: "coming_soon",
    href: "/dashboard/network/connections",
  },
];

/** Advanced Communications add-ons — Core Communications capabilities, not Growth Apps */
const CURATED_COMMS_ADDONS: MarketplaceListing[] = [
  {
    id: "capability:ai-voice-agents",
    category: "apps",
    name: "AI Voice Agents",
    summary:
      "Advanced AI voice agents under Core Communications — not a separate Growth App.",
    badge: "Add-on",
    layer: "Communications",
    ctaLabel: "Explore",
    tags: ["voice", "communications", "voice_ai"],
    source: "curated",
    section: "growth",
    href: "/apps/ai-communications/voice",
  },
  {
    id: "capability:ai-outreach",
    category: "apps",
    name: "AI Outreach",
    summary:
      "AI-assisted outreach under Core Communications — advanced add-on, not a Growth App silo.",
    badge: "Add-on",
    layer: "Communications",
    ctaLabel: "Explore",
    tags: ["outreach", "communications", "voice_ai"],
    source: "curated",
    section: "growth",
    href: "/apps/communications/outreach",
  },
  {
    id: "capability:advanced-call-centre",
    category: "apps",
    name: "Advanced Call Centre",
    summary:
      "Call Centre and agent orchestration under Core Communications — advanced AI add-on.",
    badge: "Add-on",
    layer: "Communications",
    ctaLabel: "Explore",
    tags: ["call-centre", "communications", "voice_ai"],
    source: "curated",
    section: "growth",
    href: "/apps/ai-communications/call-centre",
  },
];

const INTEGRATION_CATALOG: MarketplaceListing[] = [
  {
    id: "int:wordpress",
    category: "integrations",
    name: "WordPress",
    summary: "Connect forms, websites and legacy sites into DigitalGate.",
    badge: "Available",
    layer: "Integrations",
    ctaLabel: "Connect",
    source: "connector_catalog",
    section: "integrations",
    href: "/dashboard/settings/connectors",
  },
  {
    id: "int:stripe",
    category: "integrations",
    name: "Stripe",
    summary: "Billing, Commerce checkout and referral payouts.",
    badge: "Available",
    layer: "Integrations",
    ctaLabel: "Connect",
    source: "connector_catalog",
    section: "integrations",
    href: "/dashboard/settings/billing",
  },
  {
    id: "int:google",
    category: "integrations",
    name: "Google Business Profile",
    summary: "Connect locations, business information and available review data.",
    badge: "Coming soon",
    layer: "Integrations",
    ctaLabel: "Explore",
    source: "connector_catalog",
    section: "coming_soon",
  },
  {
    id: "int:meta",
    category: "integrations",
    name: "Meta",
    summary: "Ads and page insights for Growth.",
    badge: "Coming soon",
    layer: "Integrations",
    ctaLabel: "Explore",
    source: "connector_catalog",
    section: "coming_soon",
  },
  {
    id: "int:xero",
    category: "integrations",
    name: "Xero",
    summary: "Accounting sync for Commerce and Finance.",
    badge: "Coming soon",
    layer: "Integrations",
    ctaLabel: "Explore",
    source: "connector_catalog",
    section: "coming_soon",
  },
];

function catalogueBadge(status: IndustryCatalogueStatus): string {
  switch (status) {
    case "AVAILABLE":
    case "FOUNDING":
      return "Available";
    case "EARLY_ACCESS":
      return "Early access";
    case "ARCHITECTURE_RESERVED":
      return "Architecture reserved";
    case "COMING_SOON":
    default:
      return "Coming soon";
  }
}

/** Industry Apps from catalogue — one card per Industry (not per Gen 2 module). */
function industryListingsFromCatalogue(enabledIds: string[]): MarketplaceListing[] {
  const enabled = new Set(enabledIds);
  return listIndustries().map((industry) => {
    const anyEnabled = industry.templates.some(
      (t) => t.appId != null && enabled.has(t.appId),
    );
    const badge = anyEnabled ? "Installed" : catalogueBadge(industry.status);
    const isSellable =
      industry.status === "AVAILABLE" ||
      industry.status === "EARLY_ACCESS" ||
      industry.status === "FOUNDING";
    const section =
      isSellable || anyEnabled ? ("industry" as const) : ("coming_soon" as const);
    const href = getIndustryPrimaryHref(industry.id) ?? `/apps/industry/${industry.slug}`;

    return {
      id: `industry:${industry.id}`,
      category: "apps" as const,
      name: industry.name,
      summary: industry.description,
      href: isSellable || anyEnabled ? href : undefined,
      badge,
      layer: "Industry",
      ctaLabel: anyEnabled ? "Open" : isSellable ? "Explore" : undefined,
      source: "app_registry" as const,
      tier: "business" as const,
      industry: industry.id,
      section,
      tags: industry.templates.map((t) => t.name),
    };
  });
}

function tierLayer(tier: AppTier): string {
  if (tier === "business") return "Industry";
  if (tier === "growth") return "Growth";
  return "Apps";
}

function appListingsFromRegistry(enabledIds: string[]): MarketplaceListing[] {
  const enabled = new Set(enabledIds);
  return platformApps
    .list()
    .filter((a) => (a.manifest.visibility ?? "customer") === "customer")
    .filter((a) => (a.manifest.tier ?? "core") !== "internal")
    // Legacy AI Communications silo — advanced capabilities are curated add-ons under Core.
    .filter((a) => a.manifest.id !== "ai-communications")
    // Core already ships with the platform — Marketplace is for what you can add.
    // Industry cards come from catalogue; registry here is Growth (and non-industry) only.
    .filter((a) => a.manifest.tier === "growth")
    .map((a) => {
      const m = a.manifest;
      const href = m.routes[0]?.path ?? m.navigation[0]?.href;
      const isEnabled = enabled.has(m.id) || a.enabled;
      const isLive = a.enabled;
      const badge = !isLive
        ? "Coming soon"
        : isEnabled
          ? "Installed"
          : "Available";
      const section = !isLive ? ("coming_soon" as const) : ("growth" as const);
      return {
        id: `app:${m.id}`,
        category: "apps" as const,
        name: m.name,
        summary: m.description,
        href: isLive ? href : undefined,
        badge,
        layer: tierLayer(m.tier),
        ctaLabel: !isLive ? undefined : isEnabled ? "Open" : "Explore",
        source: "app_registry" as const,
        tier: m.tier,
        section,
      };
    });
}

export type OrgCompanyListingInput = {
  id: string;
  name: string;
  industry?: string | null;
  website?: string | null;
};

export type MarketplaceRecommendation = {
  title: string;
  reason: string;
  listing: MarketplaceListing;
};

export function buildMarketplaceCatalog(input?: {
  /** @deprecated CRM companies belong in Network → Connections, not Marketplace */
  companies?: OrgCompanyListingInput[];
  category?: MarketplaceCategory | "all";
  query?: string;
  enabledAppIds?: string[];
}): {
  categories: typeof MARKETPLACE_CATEGORY_META;
  listings: MarketplaceListing[];
  totals: Record<MarketplaceCategory | "all", number>;
  recommended: MarketplaceRecommendation[];
  sections: {
    growth: MarketplaceListing[];
    industry: MarketplaceListing[];
    integrations: MarketplaceListing[];
    services: MarketplaceListing[];
    partners: MarketplaceListing[];
    comingSoon: MarketplaceListing[];
  };
} {
  const enabledIds = input?.enabledAppIds ?? [];
  const growthListings = appListingsFromRegistry(enabledIds);
  const industryListings = industryListingsFromCatalogue(enabledIds);
  const appListings = [...industryListings, ...growthListings, ...CURATED_COMMS_ADDONS];

  const all: MarketplaceListing[] = [
    ...appListings,
    ...CURATED_SERVICES,
    ...CURATED_PROFESSIONALS,
    ...CURATED_PARTNERS,
    ...INTEGRATION_CATALOG,
  ];

  const q = input?.query?.trim().toLowerCase();
  const category = input?.category && input.category !== "all" ? input.category : null;

  let listings = all;
  if (category) listings = listings.filter((l) => l.category === category);
  if (q) {
    listings = listings.filter((l) => {
      const hay = [l.name, l.summary, l.layer ?? "", ...(l.tags ?? [])].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  const totals = {
    all: all.length,
    apps: all.filter((l) => l.category === "apps").length,
    services: all.filter((l) => l.category === "services").length,
    professionals: all.filter((l) => l.category === "professionals").length,
    partners: all.filter((l) => l.category === "partners").length,
    integrations: all.filter((l) => l.category === "integrations").length,
  };

  // Prefer an available Growth app the org has not enabled yet.
  const recommended: MarketplaceRecommendation[] = [];
  const prospecting = appListings.find(
    (l) => l.id === "app:prospecting" && l.badge === "Available",
  );
  const growthCandidate =
    prospecting ??
    appListings.find((l) => l.section === "growth" && l.badge === "Available");
  if (growthCandidate) {
    recommended.push({
      title: "DigitalGate recommends",
      reason:
        "Grow through acquisition — find and prioritise businesses that fit your ideal customer profile.",
      listing: growthCandidate,
    });
  } else {
    const industryCandidate = industryListings.find(
      (l) => l.section === "industry" && l.badge === "Available",
    );
    if (industryCandidate) {
      recommended.push({
        title: "Recommended for your business",
        reason: "Specialise your operating environment for your industry.",
        listing: industryCandidate,
      });
    }
  }

  const inView = (l: MarketplaceListing) => listings.some((x) => x.id === l.id);

  return {
    categories: MARKETPLACE_CATEGORY_META,
    listings,
    totals,
    recommended: recommended.filter((r) => inView(r.listing) || !category),
    sections: {
      growth: listings.filter((l) => l.section === "growth"),
      industry: listings.filter((l) => l.section === "industry"),
      integrations: listings.filter((l) => l.section === "integrations"),
      services: listings.filter((l) => l.section === "services"),
      partners: listings.filter((l) => l.section === "partners"),
      comingSoon: listings.filter((l) => l.section === "coming_soon"),
    },
  };
}

/** @deprecated Use category id `apps` */
export const MARKETPLACE_SOFTWARE_ALIAS = "software" as const;
