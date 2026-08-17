import type { SerializedWebsitePage } from "@dg/platform-core";

export type WebsitePageGroupId =
  | "core"
  | "apps"
  | "apps-core"
  | "apps-infrastructure"
  | "apps-industry"
  | "apps-growth"
  | "units"
  | "property"
  | "location"
  | "seo"
  | "legal"
  | "posts";

export type WebsitePageGroup = {
  id: WebsitePageGroupId;
  label: string;
  pages: SerializedWebsitePage[];
};

const GROUP_ORDER: WebsitePageGroupId[] = [
  "core",
  "apps",
  "apps-core",
  "apps-infrastructure",
  "apps-industry",
  "apps-growth",
  "units",
  "property",
  "location",
  "seo",
  "legal",
  "posts",
];

const GROUP_LABELS: Record<WebsitePageGroupId, string> = {
  core: "Core pages",
  apps: "Apps hub",
  "apps-core": "Core Apps",
  "apps-infrastructure": "Infrastructure Apps",
  "apps-industry": "Industry Apps",
  "apps-growth": "Growth Apps",
  units: "Units",
  property: "Property pages",
  location: "Location pages",
  seo: "SEO pages",
  legal: "Legal pages",
  posts: "Posts",
};

const CORE_INTENTS = new Set([
  "home",
  "about",
  "contact",
  "services",
  "stay",
]);

const CORE_SLUGS = new Set([
  "home",
  "sell",
  "buy",
  "about",
  "contact",
  "agents",
  "insights",
  "pricing",
  "services",
  "gallery",
  "experiences",
  "music",
  "mixes",
  "founding-customers",
  "founding-customer-terms",
  "discover",
  "strategy-session",
  "onboarding",
  "card",
  "business-audit",
  "hideaway-circle",
  "beta",
  "buyer-consultation",
  "property-appraisal",
  "property-report",
  "book-aetherra",
]);

const LEGAL_RE =
  /^(privacy|privacy-policy|terms|terms-conditions|terms-of-service|legal|legal-notice|agent-disclaimer|artist-disclaimer|copyright-notice|cookie|cookies|disclaimer)(-|$)/i;

/** Suburb / location landing pages (agent + appraisal + local attraction variants). */
const LOCATION_RE =
  /^(real-estate-agent|property-appraisal|stay-in|accommodation-in|holiday-in)-[a-z0-9-]+$/i;

const LOCATION_SLUGS = new Set([
  "currumbin-rock-pools",
  "cougal-cascades",
  "currumbin-valley-harvest",
  "currumbin-valley-guide",
  "currumbin-eco-village",
]);

/** Hub pages that look location-ish but belong in core. */
const LOCATION_HUB_SLUGS = new Set([
  "property-appraisal",
  "real-estate-agent-gold-coast",
]);

const CORE_EXTRA_SLUGS = new Set(["reviews", "booking-confirmed"]);

/** CVH stay hub + individual unit pages. */
const UNIT_SLUGS = new Set([
  "stay",
  "accommodation",
  "garden-studio",
  "private-studio",
  "tiny-home",
  "sanctuary-dome",
  "rainforest-dome",
  "canopy-dome",
  "starlight-dome",
  "the-shed",
]);

function slugOf(page: SerializedWebsitePage): string {
  return (page.slug || "").toLowerCase().replace(/^\/+|\/+$/g, "");
}

/** CVH accommodation listings hub + unit detail pages. */
export function isUnitListingPage(page: SerializedWebsitePage): boolean {
  const slug = slugOf(page);
  const intent = (page.intent || "").toLowerCase();
  if (intent === "redirect") return false;
  if (slug === "booking-confirmed") return false;
  if (UNIT_SLUGS.has(slug)) return true;
  return slug.startsWith("accommodation/") || /-(dome)$/i.test(slug);
}

/** RR listing hub + individual property detail pages (`properties` / legacy `property`, `property/...`). */
export function isPropertyListingPage(page: SerializedWebsitePage): boolean {
  const slug = slugOf(page);
  const intent = (page.intent || "").toLowerCase();
  if (intent === "redirect") return false;
  return (
    slug === "properties" ||
    slug === "property" ||
    slug.startsWith("property/")
  );
}

/** Collect slugs referenced by Insights post grids (treated as Posts). */
export function collectPostSlugs(
  pages: SerializedWebsitePage[] | undefined | null,
): Set<string> {
  const out = new Set<string>();
  for (const page of pages ?? []) {
    for (const component of page.components ?? []) {
      if (component.type !== "post_grid") continue;
      const posts = Array.isArray(component.props?.posts)
        ? component.props.posts
        : [];
      for (const item of posts) {
        if (!item || typeof item !== "object") continue;
        const href = typeof (item as { href?: unknown }).href === "string"
          ? (item as { href: string }).href
          : "";
        if (!href) continue;
        const cleaned = href
          .replace(/\?.*$/, "")
          .replace(/\/sites\/[^/]+\//, "")
          .replace(/^\/+|\/+$/g, "")
          .toLowerCase();
        if (cleaned && cleaned !== "insights") out.add(cleaned);
      }
    }
  }
  return out;
}

export function classifyWebsitePage(
  page: SerializedWebsitePage,
  postSlugs?: Set<string>,
): WebsitePageGroupId {
  const slug = slugOf(page);
  const intent = (page.intent || "").toLowerCase();

  if (LEGAL_RE.test(slug)) return "legal";

  if (slug === "apps") return "apps";
  if (slug.startsWith("apps/core")) return "apps-core";
  if (slug.startsWith("apps/infrastructure")) return "apps-infrastructure";
  if (slug.startsWith("apps/industry")) return "apps-industry";
  if (slug.startsWith("apps/growth")) return "apps-growth";

  if (isUnitListingPage(page)) return "units";

  if (isPropertyListingPage(page)) return "property";

  if (postSlugs?.has(slug)) return "posts";

  if (
    LOCATION_SLUGS.has(slug) ||
    (LOCATION_RE.test(slug) &&
      !LOCATION_HUB_SLUGS.has(slug) &&
      !slug.endsWith("-gold-coast"))
  ) {
    return "location";
  }

  if (
    CORE_INTENTS.has(intent) ||
    CORE_SLUGS.has(slug) ||
    CORE_EXTRA_SLUGS.has(slug)
  ) {
    return "core";
  }

  // Long-form / programmatic SEO landings that are not posts
  if (
    /market|report|prices|selling|appraisal|agent|visibility|framework|pipeline|magnet|velocity|beta|strategy|guide|things-to-do|weekend|romantic|waterfalls|hidden-gems/i.test(
      slug,
    )
  ) {
    return "seo";
  }

  // Remaining custom pages: prefer SEO over dumping into core
  if (intent === "custom" || !intent) return "seo";

  return "core";
}

export function groupWebsitePages(
  pages: SerializedWebsitePage[] | undefined | null,
): WebsitePageGroup[] {
  const list = pages ?? [];
  const postSlugs = collectPostSlugs(list);
  const buckets: Record<WebsitePageGroupId, SerializedWebsitePage[]> = {
    core: [],
    apps: [],
    "apps-core": [],
    "apps-infrastructure": [],
    "apps-industry": [],
    "apps-growth": [],
    units: [],
    property: [],
    location: [],
    seo: [],
    legal: [],
    posts: [],
  };

  for (const page of list) {
    buckets[classifyWebsitePage(page, postSlugs)].push(page);
  }

  return GROUP_ORDER.filter((id) => buckets[id].length > 0).map((id) => ({
    id,
    label: GROUP_LABELS[id],
    pages: buckets[id],
  }));
}
