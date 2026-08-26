/**
 * Industry catalogue — commercial / UX surface over INDUSTRY_PLATFORMS.
 *
 * Industry App = vertical subscription · Template = specialised configuration.
 */

import {
  INDUSTRY_COMMERCIAL_LOCK,
  INDUSTRY_PLATFORMS,
  resolveIndustryFromAppId,
  type IndustryPlatform,
  type IndustryRoadmapLane,
  type IndustrySpecialisation,
  type IndustrySpecialisationStatus,
} from "./platform";

export type IndustryCatalogueStatus =
  | "AVAILABLE"
  | "EARLY_ACCESS"
  | "FOUNDING"
  | "COMING_SOON"
  | "ARCHITECTURE_RESERVED";

export type IndustryCatalogueTemplate = {
  id: string;
  industryId: string;
  name: string;
  slug: string;
  description: string;
  status: IndustryCatalogueStatus;
  /** Gen 2 app module when live */
  appId?: string;
  /** Preferred href for switcher / sidebar */
  primaryHref: string;
  /** Included with Industry subscription when this is the default primary */
  isDefaultIncluded?: boolean;
  coreObjects?: string[];
  workflows?: string[];
};

export type IndustryCatalogueIndustry = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  status: IndustryCatalogueStatus;
  monthlyPriceCents: number;
  includedTemplates: number;
  additionalTemplatePriceCents: number;
  templates: IndustryCatalogueTemplate[];
};

/** Prefer explicit defaults over “first specialisation”. */
const DEFAULT_INCLUDED_BY_INDUSTRY: Record<string, string> = {
  property: "real-estate",
  "hospitality-accommodation": "short-stay",
  services: "trades",
  finance: "accounting",
  "creator-media": "creators",
  automotive: "dealerships",
};

export function mapRoadmap(lane: IndustryRoadmapLane): IndustryCatalogueStatus {
  switch (lane) {
    case "available":
      return "AVAILABLE";
    case "early-access":
      return "EARLY_ACCESS";
    case "coming":
      return "COMING_SOON";
    case "reserved":
      return "ARCHITECTURE_RESERVED";
    default:
      return "COMING_SOON";
  }
}

export function mapSpecialisationStatus(
  status: IndustrySpecialisationStatus,
  opts?: { appId?: string; specialisationId?: string; industryId?: string },
): IndustryCatalogueStatus {
  if (opts?.industryId === "health-wellness") {
    return "ARCHITECTURE_RESERVED";
  }

  switch (status) {
    case "live":
      return opts?.specialisationId === "real-estate" || opts?.appId === "real-estate"
        ? "FOUNDING"
        : "AVAILABLE";
    case "rolling-out":
      return "EARLY_ACCESS";
    case "soon":
      // Mounted Gen 2 apps that are still “soon” in platform truth → early access in catalogue
      return opts?.appId ? "EARLY_ACCESS" : "COMING_SOON";
    case "future":
      return "COMING_SOON";
    case "reserved":
      return "ARCHITECTURE_RESERVED";
    default:
      return "COMING_SOON";
  }
}

function buildPrimaryHref(
  spec: IndustrySpecialisation,
  industrySlug: string,
  templateSlug: string,
): string {
  const id = spec.id;
  const appId = spec.appId;

  if (id === "real-estate" || appId === "real-estate") return "/apps/re";
  if (id === "property-management" || appId === "property-management") {
    return "/apps/property-management";
  }
  if (id === "commercial" || id === "commercial-property" || appId === "commercial") {
    return "/apps/commercial";
  }
  if (id === "accommodation" || id === "short-stay" || appId === "accommodation") {
    return "/apps/accommodation";
  }
  if (appId === "services") {
    const templateId = spec.templateId;
    if (templateId && templateId !== "general") {
      return `/apps/services?template=${encodeURIComponent(templateId)}`;
    }
    return "/apps/services";
  }
  if (appId === "finance") return "/apps/finance";
  if (appId === "automotive") return "/apps/automotive";
  if (appId === "creator") return "/apps/creator";

  return `/apps/industry/${industrySlug}/templates/${templateSlug}`;
}

function defaultIncludedId(platform: IndustryPlatform): string {
  return DEFAULT_INCLUDED_BY_INDUSTRY[platform.id] ?? platform.specialisations[0]?.id ?? "";
}

function buildTemplate(
  platform: IndustryPlatform,
  spec: IndustrySpecialisation,
  isDefaultIncluded: boolean,
): IndustryCatalogueTemplate {
  const slug = spec.id;
  return {
    id: spec.id,
    industryId: platform.id,
    name: spec.label,
    slug,
    description: spec.summary,
    status: mapSpecialisationStatus(spec.status, {
      appId: spec.appId,
      specialisationId: spec.id,
      industryId: platform.id,
    }),
    appId: spec.appId,
    primaryHref: buildPrimaryHref(spec, platform.id, slug),
    isDefaultIncluded: isDefaultIncluded || undefined,
  };
}

/** Platform templateId for a catalogue template (for matching / query params). */
function platformTemplateId(template: IndustryCatalogueTemplate): string | undefined {
  const platform = INDUSTRY_PLATFORMS.find((p) => p.id === template.industryId);
  return platform?.specialisations.find((s) => s.id === template.id)?.templateId;
}

function buildIndustry(platform: IndustryPlatform): IndustryCatalogueIndustry {
  const defaultId = defaultIncludedId(platform);
  const templates = platform.specialisations.map((spec) =>
    buildTemplate(platform, spec, spec.id === defaultId),
  );

  return {
    id: platform.id,
    name: platform.label,
    slug: platform.id,
    icon: platform.icon,
    description: platform.summary,
    status: mapRoadmap(platform.roadmap),
    monthlyPriceCents: INDUSTRY_COMMERCIAL_LOCK.industryPriceCents,
    includedTemplates: INDUSTRY_COMMERCIAL_LOCK.includedTemplates,
    additionalTemplatePriceCents: INDUSTRY_COMMERCIAL_LOCK.additionalTemplatePriceCents,
    templates,
  };
}

export const INDUSTRY_CATALOGUE: IndustryCatalogueIndustry[] =
  INDUSTRY_PLATFORMS.map(buildIndustry);

export function listIndustries(): IndustryCatalogueIndustry[] {
  return INDUSTRY_CATALOGUE;
}

export function getIndustry(id: string): IndustryCatalogueIndustry | undefined {
  const key = id.trim();
  if (!key) return undefined;
  return INDUSTRY_CATALOGUE.find((i) => i.id === key || i.slug === key);
}

export function listTemplates(industryId?: string): IndustryCatalogueTemplate[] {
  if (!industryId) {
    return INDUSTRY_CATALOGUE.flatMap((i) => i.templates);
  }
  return getIndustry(industryId)?.templates ?? [];
}

export function getTemplate(id: string): IndustryCatalogueTemplate | undefined {
  const key = id.trim() === "holiday-rentals" ? "short-stay" : id.trim();
  if (!key) return undefined;
  for (const industry of INDUSTRY_CATALOGUE) {
    const match = industry.templates.find((t) => {
      if (t.id === key || t.slug === key || t.appId === key) return true;
      return platformTemplateId(t) === key;
    });
    if (match) return match;
  }
  return undefined;
}

export function getIndustryForTemplate(
  templateId: string,
): IndustryCatalogueIndustry | undefined {
  const template = getTemplate(templateId);
  if (!template) return undefined;
  return getIndustry(template.industryId);
}

export function isTemplateActivatable(status: IndustryCatalogueStatus): boolean {
  return status === "AVAILABLE" || status === "EARLY_ACCESS" || status === "FOUNDING";
}

export function templateHref(template: IndustryCatalogueTemplate): string {
  return template.primaryHref;
}

/**
 * Preferred industry entry href: first active template with a Gen 2 mount (appId),
 * else the default-included template href.
 */
export function getIndustryPrimaryHref(
  industryId: string,
  activeTemplateIds?: string[],
): string | undefined {
  const industry = getIndustry(industryId);
  if (!industry) return undefined;

  const activeSet = new Set((activeTemplateIds ?? []).map((id) => id.trim()).filter(Boolean));
  if (activeSet.size > 0) {
    for (const template of industry.templates) {
      const tid = platformTemplateId(template);
      const isActive =
        activeSet.has(template.id) ||
        activeSet.has(template.slug) ||
        (tid != null && activeSet.has(tid)) ||
        (template.appId != null && activeSet.has(template.appId));
      if (isActive && template.appId) {
        return template.primaryHref;
      }
    }
    for (const template of industry.templates) {
      const tid = platformTemplateId(template);
      const isActive =
        activeSet.has(template.id) ||
        activeSet.has(template.slug) ||
        (tid != null && activeSet.has(tid));
      if (isActive) return template.primaryHref;
    }
  }

  const included = industry.templates.find((t) => t.isDefaultIncluded);
  return included?.primaryHref ?? industry.templates[0]?.primaryHref;
}

/** Map a shell pathname to catalogue industry id (Property, Services, …). */
export function industryIdFromPathname(pathname: string): string | null {
  const path = pathname.split("?")[0] ?? pathname;

  const scaffold = path.match(/^\/apps\/industry\/([^/]+)(?:\/|$)/);
  if (scaffold?.[1]) {
    const industry = getIndustry(scaffold[1]);
    return industry?.id ?? null;
  }

  // Gen 2 app mounts → industry
  const appPrefixes: Array<{ prefix: string; appId: string }> = [
    { prefix: "/apps/re", appId: "real-estate" },
    { prefix: "/apps/property-management", appId: "property-management" },
    { prefix: "/apps/commercial", appId: "commercial" },
    { prefix: "/apps/accommodation", appId: "accommodation" },
    { prefix: "/apps/services", appId: "services" },
    { prefix: "/apps/finance", appId: "finance" },
    { prefix: "/apps/automotive", appId: "automotive" },
    { prefix: "/apps/creator", appId: "creator" },
  ];

  for (const { prefix, appId } of appPrefixes) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      const fromApp = resolveIndustryFromAppId(appId);
      if (fromApp) return fromApp.platform.id;
      const template = getTemplate(appId);
      return template?.industryId ?? null;
    }
  }

  return null;
}
