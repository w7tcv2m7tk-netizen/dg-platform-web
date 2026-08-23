/**
 * Industry App closed-beta gates — apps install when enrolled via feature flags,
 * not open to every org by default.
 */

export const PM_BETA_FLAG = "pm.beta" as const;
export const COMMERCIAL_BETA_FLAG = "commercial.beta" as const;
export const SERVICES_BETA_FLAG = "services.beta" as const;
export const FINANCE_BETA_FLAG = "finance.beta" as const;

const GATED_APPS: Array<{ appId: string; flag: string }> = [
  { appId: "property-management", flag: PM_BETA_FLAG },
  { appId: "commercial", flag: COMMERCIAL_BETA_FLAG },
  { appId: "services", flag: SERVICES_BETA_FLAG },
  { appId: "finance", flag: FINANCE_BETA_FLAG },
];

export function industryBetaFlagForAppId(appId: string): string | null {
  return GATED_APPS.find((g) => g.appId === appId)?.flag ?? null;
}

export function isIndustryBetaGatedApp(appId: string): boolean {
  return GATED_APPS.some((g) => g.appId === appId);
}

/**
 * Filter enabled app IDs so Industry floors only appear when their beta flag is on.
 * Call after Acc / RE beta filters.
 */
export function filterAppsForIndustryBetas(
  enabledAppIds: string[],
  featureFlags: Record<string, boolean> | undefined | null,
): string[] {
  const flags = featureFlags ?? {};
  return enabledAppIds.filter((id) => {
    const gate = GATED_APPS.find((g) => g.appId === id);
    if (!gate) return true;
    return flags[gate.flag] === true;
  });
}
