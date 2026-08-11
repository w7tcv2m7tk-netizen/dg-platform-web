/**
 * DigitalGate Marketplace discovery — Network layer (Phase 5 foundations).
 * Extends App install marketplace into Software · Services · Professionals · Partners · Integrations.
 * See docs/foundations/NETWORK-LAYER.md §3 and APP-MARKETPLACE.md.
 */

import { platformApps } from "../apps/registry";
import type { AppTier } from "../apps/manifest";

export const MARKETPLACE_CATEGORIES = [
  "software",
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
  software: {
    label: "Software",
    description: "Installable Apps, templates, and automations on DigitalGate",
  },
  services: {
    label: "Services",
    description: "Operators who deliver work — agencies, consultants, field services",
  },
  professionals: {
    label: "Professionals",
    description: "People and practices in your CRM network (Contact = person)",
  },
  partners: {
    label: "Partners",
    description: "Verified DigitalGate partners and recommended specialists",
  },
  integrations: {
    label: "Integrations",
    description: "Connectors that sync your digital world into the platform",
  },
};

export type MarketplaceListing = {
  id: string;
  category: MarketplaceCategory;
  name: string;
  summary: string;
  href?: string;
  badge?: string;
  tags?: string[];
  source: "app_registry" | "connector_catalog" | "org_company" | "curated";
  tier?: AppTier;
  industry?: string | null;
};

const CURATED_PARTNERS: MarketplaceListing[] = [
  {
    id: "partner:dg-agency",
    category: "partners",
    name: "DigitalGate Agency Partners",
    summary: "Implementation, onboarding, and growth support for new organisations",
    badge: "Official",
    tags: ["onboarding", "agency"],
    source: "curated",
    href: "/dashboard/apps",
  },
  {
    id: "partner:wp-hosting",
    category: "partners",
    name: "WordPress hosting specialists",
    summary: "Partners who run Gen 1 sites as Connectors into Platform Gen 2",
    badge: "Recommended",
    tags: ["wordpress", "hosting"],
    source: "curated",
    href: "/dashboard/settings/connectors",
  },
];

const CURATED_SERVICES: MarketplaceListing[] = [
  {
    id: "service:web-design",
    category: "services",
    name: "Web design & conversion",
    summary: "Landing pages, funnels, and site health improvements",
    tags: ["websites", "design"],
    source: "curated",
    href: "/apps/websites",
  },
  {
    id: "service:accounting",
    category: "services",
    name: "Bookkeeping & accounting",
    summary: "AU GST-aware operators — connect later via Xero / MYOB",
    tags: ["finance", "au"],
    source: "curated",
  },
  {
    id: "service:photography",
    category: "services",
    name: "Property photography & staging",
    summary: "Common Real Estate referral partners in the B2B network",
    tags: ["real-estate"],
    source: "curated",
    href: "/dashboard/network",
  },
];

const INTEGRATION_CATALOG: MarketplaceListing[] = [
  {
    id: "int:wordpress",
    category: "integrations",
    name: "WordPress",
    summary: "Forms, accommodation, RE, and site health via connector API keys",
    badge: "Live",
    tags: ["connector"],
    source: "connector_catalog",
    href: "/dashboard/settings/connectors",
  },
  {
    id: "int:stripe",
    category: "integrations",
    name: "Stripe",
    summary: "Billing, Commerce checkout, and Refer & Earn invoice.paid credits",
    badge: "Live",
    tags: ["billing", "commerce"],
    source: "connector_catalog",
    href: "/dashboard/settings/billing",
  },
  {
    id: "int:google",
    category: "integrations",
    name: "Google (GBP / Analytics)",
    summary: "GBP reviews feed Reputation + visibility signals — connector planned",
    badge: "Planned",
    tags: ["reviews", "reputation", "analytics"],
    source: "connector_catalog",
  },
  {
    id: "int:meta",
    category: "integrations",
    name: "Meta",
    summary: "Ads and page insights for Growth Apps",
    badge: "Planned",
    tags: ["marketing"],
    source: "connector_catalog",
  },
  {
    id: "int:xero",
    category: "integrations",
    name: "Xero",
    summary: "Accounting sync for Commerce — later Connectors phase",
    badge: "Planned",
    tags: ["finance"],
    source: "connector_catalog",
  },
];

function softwareListingsFromRegistry(): MarketplaceListing[] {
  return platformApps
    .list()
    .filter((a) => (a.manifest.visibility ?? "customer") === "customer")
    .map((a) => {
      const m = a.manifest;
      const href = m.routes[0]?.path ?? m.navigation[0]?.href;
      return {
        id: `app:${m.id}`,
        category: "software" as const,
        name: m.name,
        summary: m.description,
        href,
        badge: a.enabled ? "Available" : "Coming soon",
        tags: [m.tier, ...(m.features?.slice(0, 2) ?? [])],
        source: "app_registry" as const,
        tier: m.tier,
      };
    });
}

export type OrgCompanyListingInput = {
  id: string;
  name: string;
  industry?: string | null;
  website?: string | null;
};

export function buildMarketplaceCatalog(input?: {
  companies?: OrgCompanyListingInput[];
  category?: MarketplaceCategory | "all";
  query?: string;
}): {
  categories: typeof MARKETPLACE_CATEGORY_META;
  listings: MarketplaceListing[];
  totals: Record<MarketplaceCategory | "all", number>;
} {
  const professionals: MarketplaceListing[] = (input?.companies ?? []).map((c) => ({
    id: `company:${c.id}`,
    category: "professionals",
    name: c.name,
    summary: c.industry
      ? `${c.industry} · from your CRM companies`
      : "Company in your organisation CRM — Contact remains the person",
    href: `/apps/crm/companies/${c.id}`,
    badge: "Your network",
    tags: c.industry ? [c.industry] : ["crm"],
    source: "org_company",
    industry: c.industry,
  }));

  const all: MarketplaceListing[] = [
    ...softwareListingsFromRegistry(),
    ...CURATED_SERVICES,
    ...professionals,
    ...CURATED_PARTNERS,
    ...INTEGRATION_CATALOG,
  ];

  const q = input?.query?.trim().toLowerCase();
  const category = input?.category && input.category !== "all" ? input.category : null;

  let listings = all;
  if (category) listings = listings.filter((l) => l.category === category);
  if (q) {
    listings = listings.filter((l) => {
      const hay = [l.name, l.summary, ...(l.tags ?? [])].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  const totals = {
    all: all.length,
    software: all.filter((l) => l.category === "software").length,
    services: all.filter((l) => l.category === "services").length,
    professionals: all.filter((l) => l.category === "professionals").length,
    partners: all.filter((l) => l.category === "partners").length,
    integrations: all.filter((l) => l.category === "integrations").length,
  };

  return {
    categories: MARKETPLACE_CATEGORY_META,
    listings,
    totals,
  };
}
