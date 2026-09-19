import type { AppTier } from "./manifest";
import { INDUSTRY_TAXONOMY } from "./industry-taxonomy";
import { platformApps } from "./registry";

export const FOUNDING_MODE_CORE_APP_IDS = ["crm", "commerce", "documents", "communications", "websites", "infrastructure", "opportunities", "marketing", "advertising", "reviews"] as const;
export const GROWTH_APP_IDS_FOR_MODE = ["marketing", "advertising", "prospecting", "ai-visibility", "seo", "automation", "analytics", "social", "reviews"] as const;
export const INDUSTRY_APP_IDS_FOR_MODE = ["real-estate", "property-management", "commercial", "accommodation", "services", "finance", "automotive", "creator"] as const;

export function isFoundingCustomerMode(enabledIds: string[]): boolean { const allowed = new Set<string>(FOUNDING_MODE_CORE_APP_IDS); for (const id of enabledIds) if (!allowed.has(id)) return false; return true; }
export function hasProgressiveRevealApps(enabledIds: string[]): boolean { const set = new Set(enabledIds); return GROWTH_APP_IDS_FOR_MODE.some((id) => set.has(id)) || INDUSTRY_APP_IDS_FOR_MODE.some((id) => set.has(id)); }
export function getDefaultEnabledAppIds(): string[] { return FOUNDING_MODE_CORE_APP_IDS.filter((id) => Boolean(platformApps.get(id)?.enabled)); }

export type OrgAppsSettings = { enabled?: string[]; planPreview?: { platformTier?: string; industryApps?: string[]; industryTemplates?: string[]; premiumApps?: string[]; appliedAt?: string; source?: string; }; };
const PREMIUM_APP_MAP: Record<string, string[]> = { prospecting_pro: ["prospecting"], ai_visibility_pro: ["ai-visibility"], seo_pro: ["seo"], automation_pro: ["automation"], analytics_pro: ["analytics"], social_pro: ["social"], voice_ai: ["ai-communications"] };
const TIER_BASE_APPS: Record<string, string[]> = { starter: [...FOUNDING_MODE_CORE_APP_IDS], professional: [...FOUNDING_MODE_CORE_APP_IDS], business: [...FOUNDING_MODE_CORE_APP_IDS], enterprise: [...FOUNDING_MODE_CORE_APP_IDS] };
export type PlanSelectionInput = { platformTier: string; industryApps: string[]; premiumApps: string[] };

function runtimeAppIdsForIndustrySelection(selectionId: string): string[] {
  if (platformApps.get(selectionId)?.enabled) return [selectionId];

  const subIndustry = INDUSTRY_TAXONOMY
    .flatMap((group) => group.subIndustries)
    .find((item) => item.id === selectionId);
  if (subIndustry) return [subIndustry.appId];

  const taxonomySelectionId =
    selectionId === "hospitality-accommodation" ? "accommodation-hospitality" : selectionId;
  const group = INDUSTRY_TAXONOMY.find((item) => item.id === taxonomySelectionId);
  if (!group) return [];

  // A parent Industry marker is not permission to mount every child runtime.
  // Only single-runtime parents can safely resolve without an exact child.
  return group.appIds.length === 1 ? group.appIds : [];
}

export function appIdsFromPlanSelection(selection: PlanSelectionInput): string[] {
  const ids = new Set<string>(
    TIER_BASE_APPS[selection.platformTier] ?? TIER_BASE_APPS.professional,
  );
  for (const industrySelection of selection.industryApps) {
    for (const appId of runtimeAppIdsForIndustrySelection(industrySelection)) ids.add(appId);
  }
  for (const premium of selection.premiumApps) {
    for (const appId of PREMIUM_APP_MAP[premium] ?? []) ids.add(appId);
  }
  return [...ids].filter((id) => Boolean(platformApps.get(id)?.enabled));
}
export function resolveEnabledAppIds(orgSettings?: { apps?: OrgAppsSettings } | null): string[] { const configured = orgSettings?.apps?.enabled; const ids = Array.isArray(configured) && configured.length ? configured.filter((id) => Boolean(platformApps.get(id)?.enabled)) : getDefaultEnabledAppIds(); const next = [...ids]; for (const id of FOUNDING_MODE_CORE_APP_IDS) if (platformApps.get(id)?.enabled && !next.includes(id)) next.push(id); return next; }
export function isAppEnabled(appId: string, enabledIds: string[]): boolean { return enabledIds.includes(appId); }

const SERVICE_TEMPLATE_TO_SUBINDUSTRY: Record<string, string> = { electrician: "electrical", plumber: "plumbing", cleaner: "cleaning", maintenance: "maintenance", builder: "building-construction", landscaper: "landscaping", hvac: "hvac", pest_control: "pest-control", painter: "painting", handyman: "handyman", solar: "solar", pool_service: "pool-service", general: "general-services" };
type IndustrySelectionSettings = { apps?: { planPreview?: { industryApps?: string[]; industryTemplates?: string[] } }; profile?: { purchasedApps?: string[] }; services?: { templateKey?: string; activeTemplateKeys?: string[]; primaryTemplateKey?: string }; industry?: { templates?: Record<string, { active?: boolean }> }; gen2Onboarding?: { operatingProfile?: { primaryIndustry?: string; secondaryIndustries?: string[]; primaryTemplate?: string; templates?: string[] } } };
export function collectIndustrySelectionIds(settings?: IndustrySelectionSettings | null): string[] {
  const ids = new Set<string>();
  const operating = settings?.gen2Onboarding?.operatingProfile;
  for (const id of [operating?.primaryIndustry, operating?.primaryTemplate]) if (typeof id === "string" && id.trim()) ids.add(id.trim());
  for (const id of [...(operating?.secondaryIndustries ?? []), ...(operating?.templates ?? [])]) if (typeof id === "string" && id.trim()) ids.add(id.trim());
  for (const id of settings?.profile?.purchasedApps ?? []) if (typeof id === "string" && id.trim()) ids.add(id.trim());
  for (const id of settings?.apps?.planPreview?.industryApps ?? []) if (typeof id === "string" && id.trim()) ids.add(id.trim());
  for (const id of settings?.apps?.planPreview?.industryTemplates ?? []) if (typeof id === "string" && id.trim()) ids.add(id.trim());
  for (const [id, entry] of Object.entries(settings?.industry?.templates ?? {})) if (entry?.active === true && id.trim()) ids.add(id.trim());
  const serviceKeys = [
    ...(settings?.services?.activeTemplateKeys ?? []),
    settings?.services?.primaryTemplateKey,
    settings?.services?.templateKey,
  ];
  for (const templateKey of serviceKeys) {
    if (typeof templateKey === "string" && templateKey.trim()) {
      const key = templateKey.trim();
      ids.add(SERVICE_TEMPLATE_TO_SUBINDUSTRY[key] ?? key);
    }
  }
  return [...ids];
}

function explicitSubindustryAppIds(settings?: IndustrySelectionSettings | null): Set<string> {
  const explicit = new Set<string>();
  const operating = settings?.gen2Onboarding?.operatingProfile;
  const selections = [operating?.primaryTemplate, ...(operating?.templates ?? []), ...(settings?.apps?.planPreview?.industryTemplates ?? []), ...Object.entries(settings?.industry?.templates ?? {}).filter(([, entry]) => entry?.active === true).map(([id]) => id)];
  for (const serviceTemplate of [
    ...(settings?.services?.activeTemplateKeys ?? []),
    settings?.services?.primaryTemplateKey,
    settings?.services?.templateKey,
  ]) {
    if (serviceTemplate) selections.push(SERVICE_TEMPLATE_TO_SUBINDUSTRY[serviceTemplate] ?? serviceTemplate);
  }
  for (const selectionId of selections) {
    if (!selectionId) continue;
    const subIndustry = INDUSTRY_TAXONOMY.flatMap((item) => item.subIndustries).find((item) => item.id === selectionId);
    if (subIndustry) explicit.add(subIndustry.appId);
  }
  return explicit;
}

function industryAppIdsForSelection(selectionId: string, explicitApps: Set<string>): string[] {
  if ((INDUSTRY_APP_IDS_FOR_MODE as readonly string[]).includes(selectionId)) return [selectionId];
  const subIndustry = INDUSTRY_TAXONOMY.flatMap((item) => item.subIndustries).find((item) => item.id === selectionId);
  if (subIndustry) return [subIndustry.appId];
  const group = INDUSTRY_TAXONOMY.find((item) => item.id === selectionId);
  if (!group) return [];
  const explicitForGroup = group.appIds.filter((appId) => explicitApps.has(appId));
  return explicitForGroup.length ? explicitForGroup : group.appIds;
}

/** Customer-facing Industry Apps: explicit subindustry choices win over a broad industry group. */
export function resolveVisibleIndustryAppIds(settings?: IndustrySelectionSettings | null): string[] {
  const visible = new Set<string>();
  const explicitApps = explicitSubindustryAppIds(settings);
  for (const selectionId of collectIndustrySelectionIds(settings)) {
    for (const appId of industryAppIdsForSelection(selectionId, explicitApps)) visible.add(appId);
  }
  return INDUSTRY_APP_IDS_FOR_MODE.filter((id) => visible.has(id));
}

export function shouldShowIndustryApp(appId: string, settings?: IndustrySelectionSettings | null, revealOtherIndustries = false): boolean {
  if (!(INDUSTRY_APP_IDS_FOR_MODE as readonly string[]).includes(appId)) return true;
  return revealOtherIndustries || resolveVisibleIndustryAppIds(settings).includes(appId as (typeof INDUSTRY_APP_IDS_FOR_MODE)[number]);
}

export const APP_TIER_LABELS: Record<AppTier, string> = { core: "Core · Operate", business: "Industry · Operate", growth: "Grow", internal: "Internal" };
export const APP_TIER_ORDER: AppTier[] = ["core", "business", "growth", "internal"];
