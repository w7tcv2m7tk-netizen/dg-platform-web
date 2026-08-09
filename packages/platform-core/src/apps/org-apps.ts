import type { AppTier } from "./manifest";
import { platformApps } from "./registry";

/** Default installed apps — registry `enabled: true` customer apps */
export function getDefaultEnabledAppIds(): string[] {
  return platformApps
    .customerApps()
    .map((a) => a.manifest.id);
}

export type OrgAppsSettings = {
  enabled?: string[];
  planPreview?: {
    platformTier?: string;
    industryApps?: string[];
    premiumApps?: string[];
    appliedAt?: string;
  };
};

const PREMIUM_APP_MAP: Record<string, string[]> = {
  seo_pro: ["seo"],
  social_pro: ["social"],
  analytics_pro: ["analytics"],
  ai_visibility_pro: ["ai-visibility"],
  automation_pro: ["automation"],
  voice_ai: ["ai-communications"],
};

const TIER_BASE_APPS: Record<string, string[]> = {
  starter: ["crm", "commerce"],
  professional: ["crm", "commerce", "websites", "infrastructure", "automation"],
  business: ["crm", "commerce", "websites", "infrastructure", "automation"],
  enterprise: ["crm", "commerce", "websites", "infrastructure", "automation"],
};

export type PlanSelectionInput = {
  platformTier: string;
  industryApps: string[];
  premiumApps: string[];
};

/** Resolve app IDs from plan picker selection (preview / provisioning). */
export function appIdsFromPlanSelection(selection: PlanSelectionInput): string[] {
  const ids = new Set<string>();

  const base = TIER_BASE_APPS[selection.platformTier] ?? TIER_BASE_APPS.professional;
  for (const id of base) ids.add(id);

  for (const industry of selection.industryApps) {
    ids.add(industry);
  }

  for (const premium of selection.premiumApps) {
    for (const appId of PREMIUM_APP_MAP[premium] ?? []) {
      ids.add(appId);
    }
  }

  return [...ids].filter((id) => Boolean(platformApps.get(id)));
}

export function resolveEnabledAppIds(
  orgSettings?: { apps?: OrgAppsSettings } | null,
): string[] {
  const configured = orgSettings?.apps?.enabled;
  if (Array.isArray(configured) && configured.length) {
    return configured.filter((id) => platformApps.get(id));
  }
  return getDefaultEnabledAppIds();
}

export function isAppEnabled(appId: string, enabledIds: string[]): boolean {
  return enabledIds.includes(appId);
}

export const APP_TIER_LABELS: Record<AppTier, string> = {
  core: "Core · Platform",
  business: "Business Apps",
  growth: "Growth Apps",
  internal: "Internal",
};

export const APP_TIER_ORDER: AppTier[] = ["core", "business", "growth", "internal"];
