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

/** Additional beta flags enrolled when an app is enabled through the app catalogue. */
export const APP_ENABLE_BETA_FLAGS: Record<string, string> = {
  "real-estate": "re.beta",
  accommodation: "acc.beta",
};

/** Enrol closed-beta flags only for apps that are actually enabled for the org. */
export function enrolIndustryBetasForEnabled(
  featureFlags: Record<string, boolean> | undefined,
  enabled: string[],
): Record<string, boolean> {
  const next = { ...(featureFlags && typeof featureFlags === "object" ? featureFlags : {}) };
  for (const appId of enabled) {
    const flag = industryBetaFlagForAppId(appId);
    if (flag && next[flag] !== false) next[flag] = true;
    const extra = APP_ENABLE_BETA_FLAGS[appId];
    if (extra && next[extra] !== false) next[extra] = true;
  }
  return next;
}

/**
 * Optional filter: Industry floors only when their beta flag is on.
 * Do not use for Apps install / sidebar enabled list — those toggle independently;
 * enrol flags when enabling via PATCH /api/v1/org/apps instead.
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
