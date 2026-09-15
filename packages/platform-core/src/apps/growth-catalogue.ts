import { INDUSTRY_TAXONOMY } from "./industry-taxonomy";

export type GrowthAppCatalogueItem = {
  id: string;
  name: string;
  monthlyCents: number;
  description: string;
  included?: boolean;
};

/** Canonical Growth Apps catalogue used by onboarding, Apps and pricing surfaces. */
export const GROWTH_APP_CATALOGUE: GrowthAppCatalogueItem[] = [
  { id: "marketing", name: "Marketing", monthlyCents: 0, included: true, description: "Campaigns, audiences, funnels, attribution and optimisation." },
  { id: "prospecting", name: "Prospecting", monthlyCents: 9900, description: "Find, prioritise and convert new opportunities." },
  { id: "ai-visibility", name: "AI Visibility", monthlyCents: 9900, description: "Measure and improve how AI assistants recommend your business." },
  { id: "seo", name: "SEO", monthlyCents: 9900, description: "Search visibility, technical SEO and content opportunity intelligence." },
  { id: "automation", name: "Automation", monthlyCents: 4900, description: "Automate follow-up and repeatable business processes." },
  { id: "analytics", name: "Analytics", monthlyCents: 4900, description: "Connected performance reporting and business intelligence." },
  { id: "social", name: "Social", monthlyCents: 7900, description: "Plan, publish and measure social activity." },
  { id: "reviews", name: "Reputation", monthlyCents: 0, included: true, description: "Build, monitor and respond to customer reputation signals." },
];

export const GROWTH_APP_IDS = GROWTH_APP_CATALOGUE.map((app) => app.id);

export function growthAppPrice(id: string) {
  return GROWTH_APP_CATALOGUE.find((app) => app.id === id)?.monthlyCents ?? 0;
}

export function recommendedGrowthAppsForIndustry(industryId?: string | null): string[] {
  const baseline = ["marketing", "analytics", "reviews"];
  const recommendations: Record<string, string[]> = {
    property: ["prospecting", "ai-visibility", "seo", "automation"],
    finance: ["prospecting", "ai-visibility", "automation"],
    services: ["prospecting", "seo", "automation", "reviews"],
    "accommodation-hospitality": ["ai-visibility", "seo", "social", "reviews"],
    automotive: ["prospecting", "seo", "social", "reviews"],
    "creator-media": ["social", "ai-visibility", "analytics"],
  };
  return [...new Set([...baseline, ...(industryId ? recommendations[industryId] ?? [] : [])])];
}

export function resolveIndustryFromTemplate(templateId?: string | null) {
  if (!templateId) return null;
  return INDUSTRY_TAXONOMY.find((group) => group.subIndustries.some((sub) => sub.id === templateId)) ?? null;
}

export function resolveIndustryAppIdsFromTemplates(templateIds: string[]) {
  return [...new Set(INDUSTRY_TAXONOMY.flatMap((group) => group.subIndustries).filter((sub) => templateIds.includes(sub.id)).map((sub) => sub.appId))];
}
