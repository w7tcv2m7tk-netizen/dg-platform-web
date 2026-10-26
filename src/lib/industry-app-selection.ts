import { collectIndustrySelectionIds, shouldShowIndustryApp } from "@dg/platform-core";

export type IndustrySelectionSettings = {
  industry?: { templates?: Record<string, { active?: boolean }> };
  gen2Onboarding?: { operatingProfile?: { templates?: string[] } };
  apps?: { planPreview?: { industryApps?: string[]; industryTemplates?: string[] } };
  services?: { templateKey?: string; activeTemplateKeys?: string[]; primaryTemplateKey?: string };
  // Deliberately excluded from selection resolution: this customer-editable
  // legacy purchase claim must never stand in for canonical app selection.
  profile?: { purchasedApps?: string[] };
};

/** Mirrors the page gate's persisted selection rules, without legacy purchase claims. */
export function organisationIndustrySelectionIds(settings: IndustrySelectionSettings | null | undefined): string[] {
  const canonical = settings?.industry?.templates ?? {};
  if (Object.keys(canonical).length > 0) {
    return Object.entries(canonical).filter(([, entry]) => entry?.active === true).map(([id]) => id);
  }
  return collectIndustrySelectionIds({ ...settings, profile: undefined });
}

export function organisationHasSelectedIndustryApp(
  settings: IndustrySelectionSettings | null | undefined,
  appId: string,
): boolean {
  const templates = organisationIndustrySelectionIds(settings);
  return shouldShowIndustryApp(appId, {
    gen2Onboarding: { operatingProfile: { templates } },
  });
}
