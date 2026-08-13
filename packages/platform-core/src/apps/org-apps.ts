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
  ai_visibility_pro: ["ai-visibility"],
  seo_pro: ["seo"],
  automation_pro: ["automation"],
  analytics_pro: ["analytics"],
  social_pro: ["social"],
  voice_ai: ["ai-communications"],
};

const TIER_BASE_APPS: Record<string, string[]> = {
  starter: [
    "crm",
    "commerce",
    "websites",
    "infrastructure",
    "opportunities",
    "reviews",
  ],
  professional: [
    "crm",
    "commerce",
    "websites",
    "infrastructure",
    "opportunities",
    "reviews",
    "automation",
  ],
  business: [
    "crm",
    "commerce",
    "websites",
    "infrastructure",
    "opportunities",
    "reviews",
    "automation",
  ],
  enterprise: [
    "crm",
    "commerce",
    "websites",
    "infrastructure",
    "opportunities",
    "reviews",
    "automation",
  ],
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
  const ids =
    Array.isArray(configured) && configured.length
      ? configured.filter((id) => platformApps.get(id))
      : getDefaultEnabledAppIds();

  const next = [...ids];

  // Core platform capabilities — always available when shipped enabled.
  for (const id of ["opportunities"] as const) {
    if (platformApps.get(id)?.enabled && !next.includes(id)) {
      next.push(id);
    }
  }

  // Honest Growth slice — available when shipped enabled in the registry.
  for (const id of [
    "seo",
    "ai-visibility",
    "analytics",
    "reviews",
    "social",
    "marketing",
    "ai-communications",
  ] as const) {
    if (platformApps.get(id)?.enabled && !next.includes(id)) {
      next.push(id);
    }
  }

  return next;
}

export function isAppEnabled(appId: string, enabledIds: string[]): boolean {
  return enabledIds.includes(appId);
}

export const APP_TIER_LABELS: Record<AppTier, string> = {
  core: "Core · Platform",
  business: "Business Apps",
  growth: "Growth & Intelligence",
  internal: "Internal",
};

/** Sidebar / catalog order — Core → Business Apps → Growth & Intelligence. */
export const APP_TIER_ORDER: AppTier[] = ["core", "business", "growth", "internal"];
