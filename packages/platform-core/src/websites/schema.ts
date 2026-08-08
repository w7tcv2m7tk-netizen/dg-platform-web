/**
 * Component defaults + validation for the structured website model.
 */

import {
  WEBSITE_COMPONENT_TYPES,
  type WebsiteComponent,
  type WebsiteComponentType,
  type GeneratedSiteModel,
} from "./types";

function cuidLike() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function isWebsiteComponentType(v: unknown): v is WebsiteComponentType {
  return (
    typeof v === "string" &&
    (WEBSITE_COMPONENT_TYPES as readonly string[]).includes(v)
  );
}

export function normalizeComponent(raw: unknown): WebsiteComponent | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!isWebsiteComponentType(obj.type)) return null;
  const props =
    obj.props && typeof obj.props === "object" && !Array.isArray(obj.props)
      ? (obj.props as Record<string, unknown>)
      : {};
  return {
    id: typeof obj.id === "string" && obj.id ? obj.id : cuidLike(),
    type: obj.type,
    props,
  };
}

export function normalizeComponents(raw: unknown): WebsiteComponent[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeComponent).filter((c): c is WebsiteComponent => c !== null);
}

export function component(type: WebsiteComponentType, props: Record<string, unknown>): WebsiteComponent {
  return { id: cuidLike(), type, props };
}

/** Parse AI JSON (with optional fences) into a GeneratedSiteModel */
export function parseGeneratedSiteModel(text: string): GeneratedSiteModel | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    const pagesRaw = Array.isArray(obj.pages) ? obj.pages : null;
    if (!pagesRaw || pagesRaw.length === 0) return null;

    const pages = pagesRaw
      .map((p) => {
        if (!p || typeof p !== "object") return null;
        const page = p as Record<string, unknown>;
        const title = typeof page.title === "string" ? page.title : null;
        const slug = typeof page.slug === "string" ? page.slug : null;
        if (!title || !slug) return null;
        return {
          title,
          slug: slug.replace(/^\/+/, "").toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          intent: typeof page.intent === "string" ? page.intent : "custom",
          seo:
            page.seo && typeof page.seo === "object"
              ? (page.seo as GeneratedSiteModel["pages"][0]["seo"])
              : undefined,
          components: normalizeComponents(page.components),
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (pages.length === 0) return null;

    return {
      name: typeof obj.name === "string" ? obj.name : undefined,
      seo:
        obj.seo && typeof obj.seo === "object"
          ? (obj.seo as GeneratedSiteModel["seo"])
          : undefined,
      theme:
        obj.theme && typeof obj.theme === "object"
          ? (obj.theme as GeneratedSiteModel["theme"])
          : undefined,
      pages,
    };
  } catch {
    return null;
  }
}

export function slugifySiteName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || `site-${Date.now().toString(36)}`;
}
