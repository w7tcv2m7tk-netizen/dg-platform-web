import type { AppTier } from "./manifest";
import { platformApps } from "./registry";

export const FOUNDING_MODE_CORE_APP_IDS = ["crm", "commerce", "documents", "communications", "websites", "infrastructure", "opportunities"] as const;
export const GROWTH_APP_IDS_FOR_MODE = ["marketing", "prospecting", "ai-visibility", "seo", "automation", "analytics", "social", "reviews"] as const;
export const INDUSTRY_APP_IDS_FOR_MODE = ["real-estate", "property-management", "commercial", "accommodation", "services", "finance", "automotive", "creator"] as const;

export function isFoundingCustomerMode(enabledIds: string[]): boolean { const allowed = new Set<string>(FOUNDING_MODE_CORE_APP_IDS); for (const id of enabledIds) if (!allowed.has(id)) return false; return true; }
export function hasProgressiveRevealApps(enabledIds: string[]): boolean { const set = new Set(enabledIds); return GROWTH_APP_IDS_FOR_MODE.some((id) => set.has(id)) || INDUSTRY_APP_IDS_FOR_MODE.some((id) => set.has(id)); }
export function getDefaultEnabledAppIds(): string[] { return FOUNDING_MODE_CORE_APP_IDS.filter((id) => Boolean(platformApps.get(id)?.enabled)); }

export type OrgAppsSettings = { enabled?: string[]; planPreview?: { platformTier?: string; industryApps?: string[]; industryTemplates?: string[]; premiumApps?: string[]; appliedAt?: string; source?: string; }; };
const PREMIUM_APP_MAP: Record<string, string[]> = { marketing_pro: ["marketing"], prospecting_pro: ["prospecting"], ai_visibility_pro: ["ai-visibility"], seo_pro: ["seo"], automation_pro: ["automation"], analytics_pro: ["analytics"], social_pro: ["social"], reviews_pro: ["reviews"], voice_ai: ["ai-communications"] };
const TIER_BASE_APPS: Record<string, string[]> = { starter: [...FOUNDING_MODE_CORE_APP_IDS], professional: [...FOUNDING_MODE_CORE_APP_IDS], business: [...FOUNDING_MODE_CORE_APP_IDS], enterprise: [...FOUNDING_MODE_CORE_APP_IDS] };
export type PlanSelectionInput = { platformTier: string; industryApps: string[]; premiumApps: string[] };
export function appIdsFromPlanSelection(selection: PlanSelectionInput): string[] { const ids = new Set<string>(TIER_BASE_APPS[selection.platformTier] ?? TIER_BASE_APPS.professional); for (const industry of selection.industryApps) ids.add(industry); for (const premium of selection.premiumApps) for (const appId of PREMIUM_APP_MAP[premium] ?? []) ids.add(appId); return [...ids].filter((id) => Boolean(platformApps.get(id)?.enabled)); }
export function resolveEnabledAppIds(orgSettings?: { apps?: OrgAppsSettings } | null): string[] { const configured = orgSettings?.apps?.enabled; const ids = Array.isArray(configured) && configured.length ? configured.filter((id) => Boolean(platformApps.get(id)?.enabled)) : getDefaultEnabledAppIds(); const next = [...ids]; for (const id of FOUNDING_MODE_CORE_APP_IDS) if (platformApps.get(id)?.enabled && !next.includes(id)) next.push(id); return next; }
export function isAppEnabled(appId: string, enabledIds: string[]): boolean { return enabledIds.includes(appId); }

const SERVICE_TEMPLATE_TO_SUBINDUSTRY: Record<string, string> = { electrician: "electrical", plumber: "plumbing", cleaner: "cleaning", maintenance: "maintenance", builder: "building-construction", landscaper: "landscaping", hvac: "hvac", pest_control: "pest-control", painter: "painting", handyman: "handyman", solar: "solar", pool_service: "pool-service", general: "general-services" };
export function collectIndustrySelectionIds(settings?: { apps?: { planPreview?: { industryApps?: string[]; industryTemplates?: string[] } }; profile?: { purchasedApps?: string[] }; services?: { templateKey?: string }; gen2Onboarding?: { operatingProfile?: { primaryIndustry?: string; secondaryIndustries?: string[]; primaryTemplate?: string; templates?: string[] } } } | null): string[] {
  const ids = new Set<string>();
  const operating = settings?.gen2Onboarding?.operatingProfile;
  for (const id of [operating?.primaryIndustry, operating?.primaryTemplate]) if (typeof id === "string" && id.trim()) ids.add(id.trim());
  for (const id of [...(operating?.secondaryIndustries ?? []), ...(operating?.templates ?? [])]) if (typeof id === "string" && id.trim()) ids.add(id.trim());
  for (const id of settings?.profile?.purchasedApps ?? []) if (typeof id === "string" && id.trim()) ids.add(id.trim());
  for (const id of settings?.apps?.planPreview?.industryApps ?? []) if (typeof id === "string" && id.trim()) ids.add(id.trim());
  for (const id of settings?.apps?.planPreview?.industryTemplates ?? []) if (typeof id === "string" && id.trim()) ids.add(id.trim());
  const templateKey = settings?.services?.templateKey; if (typeof templateKey === "string" && templateKey.trim()) { const key = templateKey.trim(); ids.add(SERVICE_TEMPLATE_TO_SUBINDUSTRY[key] ?? key); }
  return [...ids];
}

/** Customer-facing Industry Apps: only apps selected by the operating profile are shown by default. */
export function resolveVisibleIndustryAppIds(settings?: Parameters<typeof collectIndustrySelectionIds>[0]): string[] {
  const selected = new Set(collectIndustrySelectionIds(settings));
  const planApps = settings?.apps?.planPreview?.industryApps ?? [];
  for (const id of planApps) selected.add(id);
  return INDUSTRY_APP_IDS_FOR_MODE.filter((id) => selected.has(id));
}

export function shouldShowIndustryApp(appId: string, settings?: Parameters<typeof collectIndustrySelectionIds>[0], revealOtherIndustries = false): boolean {
  if (!(INDUSTRY_APP_IDS_FOR_MODE as readonly string[]).includes(appId)) return true;
  return revealOtherIndustries || resolveVisibleIndustryAppIds(settings).includes(appId as (typeof INDUSTRY_APP_IDS_FOR_MODE)[number]);
}

export const APP_TIER_LABELS: Record<AppTier, string> = { core: "Core · Operate", business: "Industry · Operate", growth: "Grow", internal: "Internal" };
export const APP_TIER_ORDER: AppTier[] = ["core", "business", "growth", "internal"];
