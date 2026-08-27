/**
 * DigitalGate public page taxonomy — sitemap priority, breadcrumbs, schema types.
 * SoT for runtime SEO when page.seo.schemaType is not set in Studio.
 */

export const DIGITALGATE_ORIGIN = "https://digitalgate.com.au";
export const DIGITALGATE_APP_ORIGIN = "https://app.digitalgate.com.au";

export const DG_AUTHOR = {
  name: "Ben Roe",
  role: "Founder & Platform Architect, DigitalGate",
  url: `${DIGITALGATE_ORIGIN}/about/`,
};

/** Slugs that must never be indexed (utility, funnels, retired flows). */
export const DG_NOINDEX_SLUGS = new Set([
  "business-audit",
  "onboarding",
  "card",
]);

/** Migrated insight article slugs (insights/html/*.html). */
export const DG_INSIGHT_SLUGS = new Set([
  "ai-search-vs-traditional-seo",
  "ai-visibility-for-real-estate-agencies",
  "chatgpt-vs-google-for-real-estate-marketing",
  "entity-seo-for-real-estate-agencies",
  "how-chatgpt-chooses-which-businesses-to-recommend",
  "how-gemini-recommends-local-businesses",
  "local-seo-in-the-age-of-ai-search",
  "local-seo-real-estate-vendor-leads",
  "why-ai-search-changes-lead-generation-for-real-estate-agencies",
  "will-ai-replace-google-search",
  "from-dumb-businesses-to-smart-businesses",
  "intelligent-business-more-than-a-brain",
]);

/** Growth capability landing pages (/seo, /ai-visibility, …). */
export const DG_GROWTH_SLUGS = new Set([
  "growth",
  "seo",
  "ai-visibility",
  "automation",
  "analytics",
  "social",
  "reputation",
  "prospecting",
  "ai-communications",
]);

/** Intelligence / framework thought-leadership pages. */
export const DG_INTELLIGENCE_SLUGS = new Set([
  "business-brain",
  "ai-visibility-framework",
  "appraisal-magnet-system",
  "listing-pipeline-framework",
  "vendor-velocity-system",
]);

export type DgPageKind =
  | "home"
  | "marketing"
  | "insight"
  | "growth"
  | "intelligence"
  | "legal"
  | "utility";

export function classifyDgPageSlug(slug: string): DgPageKind {
  if (!slug || slug === "home") return "home";
  if (DG_INSIGHT_SLUGS.has(slug)) return "insight";
  if (DG_GROWTH_SLUGS.has(slug)) return "growth";
  if (DG_INTELLIGENCE_SLUGS.has(slug)) return "intelligence";
  if (
    slug === "privacy-policy" ||
    slug === "terms-conditions" ||
    slug === "legal-notice" ||
    slug === "founding-customer-terms"
  ) {
    return "legal";
  }
  if (DG_NOINDEX_SLUGS.has(slug)) return "utility";
  return "marketing";
}

export function dgPageShouldIndex(slug: string): boolean {
  return !DG_NOINDEX_SLUGS.has(slug);
}

export function dgSitemapPriority(slug: string, intent?: string | null): number {
  const kind = classifyDgPageSlug(slug);
  if (!slug || slug === "home" || intent === "home") return 1.0;
  if (kind === "growth" || kind === "insight") return 0.8;
  if (kind === "intelligence") return 0.75;
  if (slug === "pricing" || slug === "founding-customers") return 0.9;
  if (kind === "legal") return 0.3;
  if (kind === "utility") return 0.1;
  return 0.7;
}

export function dgSitemapChangefreq(
  slug: string,
  intent?: string | null,
): "weekly" | "monthly" | "yearly" {
  const kind = classifyDgPageSlug(slug);
  if (!slug || slug === "home" || intent === "home") return "weekly";
  if (kind === "insight") return "monthly";
  if (kind === "legal") return "yearly";
  return "monthly";
}

/** Breadcrumb trail for structured data (DigitalGate apex only). */
export function dgBreadcrumbs(
  slug: string,
): Array<{ name: string; path: string }> {
  const crumbs: Array<{ name: string; path: string }> = [
    { name: "DigitalGate", path: "/" },
  ];
  const kind = classifyDgPageSlug(slug);
  if (kind === "home") return crumbs;

  if (kind === "insight") {
    crumbs.push({ name: "Insights", path: "/insights" });
    return crumbs;
  }
  if (kind === "growth") {
    crumbs.push({ name: "Growth", path: "/growth" });
    if (slug !== "growth") {
      const label =
        slug === "ai-visibility"
          ? "AI Visibility"
          : slug === "ai-communications"
            ? "AI Communications"
            : slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
      crumbs.push({ name: label, path: `/${slug}` });
    }
    return crumbs;
  }
  if (kind === "intelligence") {
    crumbs.push({ name: "Intelligence", path: "/business-brain" });
    return crumbs;
  }
  return crumbs;
}

/** SoftwareApplication schema for Growth product pages. */
export function dgGrowthProductName(slug: string): string | null {
  const map: Record<string, string> = {
    seo: "DigitalGate SEO",
    "ai-visibility": "DigitalGate AI Visibility",
    automation: "DigitalGate Automation",
    analytics: "DigitalGate Analytics",
    social: "DigitalGate Social",
    reputation: "DigitalGate Reputation",
    prospecting: "DigitalGate Prospecting & Opportunity Engine",
    "ai-communications": "DigitalGate AI Communications",
  };
  return map[slug] ?? null;
}

export const DG_ORGANIZATION = {
  name: "DigitalGate",
  legalName: "DigitalGate Pty Ltd",
  url: DIGITALGATE_ORIGIN,
  logo: `${DIGITALGATE_APP_ORIGIN}/brand/logo-on-dark.png`,
  description:
    "DigitalGate is an AI-powered Business Operating Platform for modern businesses — Core, Industry, Growth and Intelligence on one connected foundation.",
  email: "hello@digitalgate.com.au",
  telephone: "+61405227227",
  address: {
    locality: "Gold Coast",
    region: "QLD",
    country: "AU",
  },
  founder: DG_AUTHOR.name,
  sameAs: [
    "https://www.linkedin.com/company/digitalgate",
    "https://www.facebook.com/digitalgate",
    "https://www.instagram.com/digitalgate",
  ],
};
