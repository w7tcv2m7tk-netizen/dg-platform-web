/**
 * Website Builder — structured site model (not raw HTML).
 * See docs/foundations/WEBSITE-BUILDER.md
 */

export type HealthCheckStatus = "pass" | "warn" | "fail";

export type HealthCheck = {
  id: string;
  label: string;
  status: HealthCheckStatus;
  detail: string;
};

export type SiteHealthSnapshot = {
  site: string;
  generatedAt: string;
  score: number;
  pass: number;
  warn: number;
  fail: number;
  checks: HealthCheck[];
  pagespeed: {
    mobile: number | null;
    desktop: number | null;
    checkedAt: string | null;
  };
  ssl: {
    enabled: boolean;
  };
};

export type SiteHealthFetchErrorCode =
  | "missing_api_key"
  | "auth_failed"
  | "not_found"
  | "upstream_error"
  | "network_error";

export type SiteHealthFetchResult =
  | { ok: true; snapshot: SiteHealthSnapshot }
  | {
      ok: false;
      code: SiteHealthFetchErrorCode;
      message: string;
      status?: number;
    };

/** Typed component kinds the renderer + Studio understand */
export const WEBSITE_COMPONENT_TYPES = [
  "nav",
  "hero",
  "trust",
  "services",
  "about",
  "testimonials",
  "cta",
  "faq",
  "contact_form",
  "footer",
  /** WP import / content blocks */
  "heading",
  "paragraph",
  "image",
  "list",
  "html",
  "post_grid",
] as const;

export type WebsiteComponentType = (typeof WEBSITE_COMPONENT_TYPES)[number];

export type WebsiteComponent = {
  id: string;
  type: WebsiteComponentType;
  props: Record<string, unknown>;
};

export type WebsitePageIntent =
  | "home"
  | "about"
  | "services"
  | "listings"
  | "stay"
  | "contact"
  | "custom";

/** Starter IA packs for industry-aware generation */
export type WebsiteTemplateId = "generic" | "real_estate" | "accommodation";

/** Funnel Builder v0 — single-page conversion templates */
export type FunnelTemplateId =
  | "lead_capture"
  | "appraisal_request"
  | "booking_enquiry";

export type WebsiteTheme = {
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
  iconUrl?: string;
  businessName?: string;
  fontHeading?: string;
  fontBody?: string;
};

export type WebsiteSeo = {
  title?: string;
  description?: string;
  keywords?: string[];
  /** Open Graph — falls back to title/description when omitted */
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
};

export type WebsiteStatus = "draft" | "published" | "archived";

export type SerializedWebsitePage = {
  id: string;
  websiteId: string;
  title: string;
  slug: string;
  intent: string | null;
  status: string;
  sortOrder: number;
  seo: WebsiteSeo | null;
  components: WebsiteComponent[];
  createdAt: string;
  updatedAt: string;
};

export type SerializedWebsite = {
  id: string;
  organisationId: string;
  name: string;
  slug: string;
  status: string;
  brief: string | null;
  theme: WebsiteTheme | null;
  seo: WebsiteSeo | null;
  metadata: Record<string, unknown> | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  pages?: SerializedWebsitePage[];
};

/** AI generator output shape */
export type GeneratedSiteModel = {
  name?: string;
  seo?: WebsiteSeo;
  theme?: Partial<WebsiteTheme>;
  pages: Array<{
    title: string;
    slug: string;
    intent?: WebsitePageIntent | string;
    seo?: WebsiteSeo;
    components: WebsiteComponent[];
  }>;
};
