/**
 * Industry entitlements — resolve which Industry Apps / Templates an org may use.
 */

import {
  getIndustry,
  getTemplate,
  isTemplateActivatable,
  listIndustries,
  listTemplates,
  type IndustryCatalogueIndustry,
  type IndustryCatalogueTemplate,
} from "./catalogue";
import {
  INDUSTRY_PLATFORMS,
  resolveIndustrySpecialisation,
} from "./platform";

function platformTemplateIdFor(
  template: IndustryCatalogueTemplate,
): string | undefined {
  return INDUSTRY_PLATFORMS.find((p) => p.id === template.industryId)?.specialisations.find(
    (s) => s.id === template.id,
  )?.templateId;
}

export type OrgIndustrySettings = {
  templates?: Record<
    string,
    { active?: boolean; activatedAt?: string; deactivatedAt?: string }
  >;
  primaryTemplateByIndustry?: Record<string, string>;
};

export type ResolvedIndustryEntitlement = {
  industryId: string;
  industryName: string;
  entitled: boolean;
  includedTemplateId: string | null;
  activeTemplateIds: string[];
  availableTemplateIds: string[]; // activatable but not active
  comingSoonTemplateIds: string[];
  reservedTemplateIds: string[];
};

function normalizeKey(raw: string): string {
  const key = raw.trim();
  if (!key) return "";
  return key === "holiday-rentals" ? "short-stay" : key;
}

/** Resolve a purchased / enabled / preview key to catalogue template id(s). */
function resolveKeyToTemplateIds(raw: string): string[] {
  const key = normalizeKey(raw);
  if (!key) return [];

  const industry = getIndustry(key);
  if (industry) {
    return industry.templates.map((t) => t.id);
  }

  const template = getTemplate(key);
  if (template) return [template.id];

  const resolved = resolveIndustrySpecialisation(key);
  if (resolved) return [resolved.specialisation.id];

  return [];
}

function collectKnownTemplateIds(keys: string[]): Set<string> {
  const known = new Set<string>();
  for (const key of keys) {
    for (const id of resolveKeyToTemplateIds(key)) {
      known.add(id);
    }
  }
  return known;
}

function defaultIncludedTemplate(
  industry: IndustryCatalogueIndustry,
): IndustryCatalogueTemplate | undefined {
  return industry.templates.find((t) => t.isDefaultIncluded) ?? industry.templates[0];
}

function settingsEntryForTemplate(
  settings: OrgIndustrySettings | null | undefined,
  template: IndustryCatalogueTemplate,
): { active?: boolean; activatedAt?: string; deactivatedAt?: string } | undefined {
  if (!settings?.templates) return undefined;
  const byId = settings.templates[template.id];
  if (byId) return byId;
  if (template.slug !== template.id) {
    const bySlug = settings.templates[template.slug];
    if (bySlug) return bySlug;
  }
  const platformTemplateId = platformTemplateIdFor(template);
  if (platformTemplateId) return settings.templates[platformTemplateId];
  return undefined;
}

/**
 * Whether a template should be treated as active.
 * Migrates legacy enabledAppIds → active when no industrySettings entry exists yet.
 */
function isTemplateActive(
  template: IndustryCatalogueTemplate,
  settings: OrgIndustrySettings | null | undefined,
  enabledAppIds: Set<string>,
  appIdOwnerCounts: Map<string, number>,
): boolean {
  const entry = settingsEntryForTemplate(settings, template);
  if (entry) {
    return entry.active === true;
  }

  const platformTemplateId = platformTemplateIdFor(template);

  // Migration from enabled Gen 2 app ids
  if (
    enabledAppIds.has(template.id) ||
    enabledAppIds.has(template.slug) ||
    (platformTemplateId != null && enabledAppIds.has(platformTemplateId))
  ) {
    return true;
  }

  if (template.appId && enabledAppIds.has(template.appId)) {
    const owners = appIdOwnerCounts.get(template.appId) ?? 0;
    // Unique appId → activate; shared appId → only default-included
    if (owners <= 1 || template.isDefaultIncluded) {
      return true;
    }
  }

  return false;
}

export function readOrgIndustrySettings(
  settings: unknown,
): OrgIndustrySettings | null {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return null;
  }

  const root = settings as Record<string, unknown>;
  // Accept nested `{ industry: { … } }` or flat industry settings object
  const candidate =
    root.industry && typeof root.industry === "object" && !Array.isArray(root.industry)
      ? (root.industry as Record<string, unknown>)
      : root.industrySettings &&
          typeof root.industrySettings === "object" &&
          !Array.isArray(root.industrySettings)
        ? (root.industrySettings as Record<string, unknown>)
        : root;

  const templatesRaw = candidate.templates;
  const primaryRaw = candidate.primaryTemplateByIndustry;

  const templates: OrgIndustrySettings["templates"] = {};
  if (templatesRaw && typeof templatesRaw === "object" && !Array.isArray(templatesRaw)) {
    for (const [id, value] of Object.entries(templatesRaw as Record<string, unknown>)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const row = value as Record<string, unknown>;
      templates[id] = {
        active: typeof row.active === "boolean" ? row.active : undefined,
        activatedAt: typeof row.activatedAt === "string" ? row.activatedAt : undefined,
        deactivatedAt:
          typeof row.deactivatedAt === "string" ? row.deactivatedAt : undefined,
      };
    }
  }

  const primaryTemplateByIndustry: Record<string, string> = {};
  if (primaryRaw && typeof primaryRaw === "object" && !Array.isArray(primaryRaw)) {
    for (const [industryId, value] of Object.entries(
      primaryRaw as Record<string, unknown>,
    )) {
      if (typeof value === "string" && value.trim()) {
        primaryTemplateByIndustry[industryId] = value.trim();
      }
    }
  }

  const hasTemplates = Object.keys(templates).length > 0;
  const hasPrimary = Object.keys(primaryTemplateByIndustry).length > 0;
  if (!hasTemplates && !hasPrimary) {
    // Empty but valid shape when caller passed industry-shaped object with those keys
    if ("templates" in candidate || "primaryTemplateByIndustry" in candidate) {
      return { templates, primaryTemplateByIndustry };
    }
    return null;
  }

  return { templates, primaryTemplateByIndustry };
}

export function resolveIndustryEntitlements(input: {
  enabledAppIds?: string[];
  purchasedApps?: string[];
  planPreviewIndustryApps?: string[];
  industrySettings?: OrgIndustrySettings | null;
}): { industries: ResolvedIndustryEntitlement[]; activeTemplateIds: string[] } {
  const enabledAppIds = new Set(
    (input.enabledAppIds ?? []).map(normalizeKey).filter(Boolean),
  );
  const settings = input.industrySettings ?? null;

  const knownFromPurchase = collectKnownTemplateIds([
    ...(input.purchasedApps ?? []),
    ...(input.planPreviewIndustryApps ?? []),
    ...(input.enabledAppIds ?? []),
  ]);

  const appIdOwnerCounts = new Map<string, number>();
  for (const template of listTemplates()) {
    if (!template.appId) continue;
    appIdOwnerCounts.set(
      template.appId,
      (appIdOwnerCounts.get(template.appId) ?? 0) + 1,
    );
  }

  const allActive = new Set<string>();
  const industries: ResolvedIndustryEntitlement[] = [];

  for (const industry of listIndustries()) {
    const activeTemplateIds: string[] = [];
    const availableTemplateIds: string[] = [];
    const comingSoonTemplateIds: string[] = [];
    const reservedTemplateIds: string[] = [];

    let anySettingsActive = false;

    for (const template of industry.templates) {
      const settingsEntry = settingsEntryForTemplate(settings, template);
      if (settingsEntry?.active === true) {
        anySettingsActive = true;
      }

      const active = isTemplateActive(
        template,
        settings,
        enabledAppIds,
        appIdOwnerCounts,
      );
      if (active) {
        activeTemplateIds.push(template.id);
        allActive.add(template.id);
      }

      if (template.status === "ARCHITECTURE_RESERVED") {
        reservedTemplateIds.push(template.id);
      } else if (template.status === "COMING_SOON") {
        comingSoonTemplateIds.push(template.id);
      }
    }

    const entitledFromKeys = industry.templates.some((t) => knownFromPurchase.has(t.id));
    const entitled = entitledFromKeys || anySettingsActive;

    for (const template of industry.templates) {
      if (!isTemplateActivatable(template.status)) continue;
      if (activeTemplateIds.includes(template.id)) continue;
      // Available when entitled, or as the path to entitle by activating the first template
      availableTemplateIds.push(template.id);
    }

    const preferredPrimary =
      settings?.primaryTemplateByIndustry?.[industry.id] ??
      defaultIncludedTemplate(industry)?.id ??
      null;

    industries.push({
      industryId: industry.id,
      industryName: industry.name,
      entitled,
      includedTemplateId: preferredPrimary,
      activeTemplateIds,
      availableTemplateIds,
      comingSoonTemplateIds,
      reservedTemplateIds,
    });
  }

  return {
    industries,
    activeTemplateIds: Array.from(allActive),
  };
}

/** Patch to activate or deactivate a template in org industry settings. */
export function buildTemplateActivationPatch(
  current: OrgIndustrySettings | null | undefined,
  templateId: string,
  active: boolean,
  now: string = new Date().toISOString(),
): OrgIndustrySettings {
  const template = getTemplate(templateId);
  const id = template?.id ?? normalizeKey(templateId);
  const prev = current?.templates?.[id];
  const templates: NonNullable<OrgIndustrySettings["templates"]> = {
    ...(current?.templates ?? {}),
    [id]: {
      ...prev,
      active,
      ...(active
        ? { activatedAt: now, deactivatedAt: undefined }
        : { deactivatedAt: now }),
    },
  };

  const primaryTemplateByIndustry = {
    ...(current?.primaryTemplateByIndustry ?? {}),
  };

  if (active && template) {
    const industryId = template.industryId;
    if (!primaryTemplateByIndustry[industryId]) {
      primaryTemplateByIndustry[industryId] = id;
    }
  }

  return { templates, primaryTemplateByIndustry };
}

/** Set the included / primary template for an industry. */
export function buildPrimaryTemplatePatch(
  current: OrgIndustrySettings | null | undefined,
  industryId: string,
  templateId: string,
): OrgIndustrySettings {
  const template = getTemplate(templateId);
  const id = template?.id ?? normalizeKey(templateId);
  return {
    templates: { ...(current?.templates ?? {}) },
    primaryTemplateByIndustry: {
      ...(current?.primaryTemplateByIndustry ?? {}),
      [industryId]: id,
    },
  };
}
