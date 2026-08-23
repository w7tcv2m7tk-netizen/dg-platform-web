import type { AppTier } from "./manifest";
import { platformApps } from "./registry";

/**
 * Founding Mode defaults — Core operate apps only.
 * Growth / Industry are progressive (purchase, beta enrol, or Apps toggle by admin).
 */
export const FOUNDING_MODE_CORE_APP_IDS = [
  "crm",
  "commerce",
  "websites",
  "opportunities",
] as const;

/** Default installed apps for new orgs — Founding Mode slim set. */
export function getDefaultEnabledAppIds(): string[] {
  return FOUNDING_MODE_CORE_APP_IDS.filter((id) =>
    Boolean(platformApps.get(id)?.enabled),
  );
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
  prospecting_pro: ["prospecting"],
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
  ],
  business: [
    "crm",
    "commerce",
    "websites",
    "infrastructure",
    "opportunities",
    "reviews",
  ],
  enterprise: [
    "crm",
    "commerce",
    "websites",
    "infrastructure",
    "opportunities",
    "reviews",
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

/**
 * Resolve enabled apps for an org.
 * Does not auto-inject Growth apps — progressive disclosure / purchase.
 */
export function resolveEnabledAppIds(
  orgSettings?: { apps?: OrgAppsSettings } | null,
): string[] {
  const configured = orgSettings?.apps?.enabled;
  const ids =
    Array.isArray(configured) && configured.length
      ? configured.filter((id) => platformApps.get(id))
      : getDefaultEnabledAppIds();

  const next = [...ids];

  for (const id of ["opportunities"] as const) {
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
  core: "Core · Operate",
  business: "Industry · Operate",
  growth: "Grow",
  internal: "Internal",
};

/** Catalog order — Core → Industry → Growth (sidebar uses Intelligent Layer IA). */
export const APP_TIER_ORDER: AppTier[] = ["core", "business", "growth", "internal"];
