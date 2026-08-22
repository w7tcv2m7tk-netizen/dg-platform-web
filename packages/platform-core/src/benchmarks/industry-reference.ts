import type { BenchmarkCategoryId } from "./types";

export type IndustryReferenceKey =
  | "real_estate"
  | "accommodation"
  | "services"
  | "default";

export type IndustryReferenceBaseline = {
  label: string;
  categories: Record<BenchmarkCategoryId, { median: number; top25: number }>;
  metrics: Record<
    string,
    {
      median: number;
      top25: number;
      /** Display suffix, e.g. " min", "%", " reviews" */
      suffix?: string;
      /** When true, values are shown as decimals (e.g. star rating) */
      decimal?: boolean;
    }
  >;
};

const BASE_CATEGORIES: IndustryReferenceBaseline["categories"] = {
  business_intelligence: { median: 58, top25: 82 },
  customer_crm: { median: 62, top25: 86 },
  digital_presence: { median: 71, top25: 89 },
  seo: { median: 64, top25: 84 },
  ai_visibility: { median: 44, top25: 73 },
  reputation: { median: 68, top25: 88 },
  marketing: { median: 55, top25: 78 },
  automation: { median: 48, top25: 76 },
  commercial: { median: 60, top25: 85 },
  growth: { median: 57, top25: 80 },
};

const BASE_METRICS: IndustryReferenceBaseline["metrics"] = {
  google_rating: { median: 4.4, top25: 4.8, decimal: true },
  review_volume: { median: 61, top25: 120, suffix: " reviews" },
  website_health: { median: 71, top25: 89 },
  ai_visibility: { median: 44, top25: 73 },
  crm_follow_up: { median: 54, top25: 86, suffix: "%" },
};

const REAL_ESTATE: IndustryReferenceBaseline = {
  label: "Real estate",
  categories: {
    ...BASE_CATEGORIES,
    customer_crm: { median: 66, top25: 88 },
    reputation: { median: 72, top25: 91 },
    ai_visibility: { median: 48, top25: 76 },
    growth: { median: 61, top25: 84 },
  },
  metrics: {
    ...BASE_METRICS,
    google_rating: { median: 4.5, top25: 4.9, decimal: true },
    review_volume: { median: 78, top25: 140, suffix: " reviews" },
    website_health: { median: 74, top25: 90 },
  },
};

const ACCOMMODATION: IndustryReferenceBaseline = {
  label: "Accommodation & hospitality",
  categories: {
    ...BASE_CATEGORIES,
    reputation: { median: 76, top25: 92 },
    digital_presence: { median: 74, top25: 90 },
    marketing: { median: 62, top25: 82 },
  },
  metrics: {
    ...BASE_METRICS,
    google_rating: { median: 4.6, top25: 4.9, decimal: true },
    review_volume: { median: 95, top25: 180, suffix: " reviews" },
  },
};

const SERVICES: IndustryReferenceBaseline = {
  label: "Professional services",
  categories: {
    ...BASE_CATEGORIES,
    customer_crm: { median: 64, top25: 85 },
    automation: { median: 52, top25: 78 },
    commercial: { median: 65, top25: 87 },
  },
  metrics: BASE_METRICS,
};

const DEFAULT: IndustryReferenceBaseline = {
  label: "Small business",
  categories: BASE_CATEGORIES,
  metrics: BASE_METRICS,
};

export function resolveIndustryReferenceKey(
  industryVertical?: string | null,
): IndustryReferenceKey {
  const v = (industryVertical ?? "").toLowerCase().replace(/-/g, "_");
  if (v.includes("real") && v.includes("estate")) return "real_estate";
  if (v.includes("accommodation") || v.includes("hospitality")) return "accommodation";
  if (v.includes("service") || v.includes("professional")) return "services";
  return "default";
}

export function getIndustryReference(
  industryVertical?: string | null,
): IndustryReferenceBaseline {
  const key = resolveIndustryReferenceKey(industryVertical);
  switch (key) {
    case "real_estate":
      return REAL_ESTATE;
    case "accommodation":
      return ACCOMMODATION;
    case "services":
      return SERVICES;
    default:
      return DEFAULT;
  }
}

export function formatIndustryLabel(industryVertical?: string | null): string {
  return getIndustryReference(industryVertical).label;
}
