/**
 * Website asset CRUD — Organisation → Websites[] → Pages (structured components).
 */

import type { Prisma, Website, WebsitePage } from "@dg/database";

import { writeAuditLog } from "../audit";
import { getOrganisationBusinessProfile } from "../org/onboarding-profile";
import { resolveEnabledAppIds } from "../apps/org-apps";
import { generateSiteModel } from "./generate";
import { normalizeComponents, slugifySiteName } from "./schema";
import { resolveWebsiteTemplateId } from "./templates";
import type {
  SerializedWebsite,
  SerializedWebsitePage,
  WebsiteComponent,
  WebsiteSeo,
  WebsiteTemplateId,
  WebsiteTheme,
} from "./types";

/** Nested public paths (`apps/core/crm`) — slashes allowed, no leading/trailing slash. */
export function normalizePageSlug(raw: string): string {
  return raw
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9/-]/g, "-")
    .replace(/\/{2,}/g, "/")
    .replace(/-{2,}/g, "-")
    .replace(/\/-/g, "/")
    .replace(/-\//g, "/")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function serializePage(page: WebsitePage): SerializedWebsitePage {
  return {
    id: page.id,
    websiteId: page.websiteId,
    title: page.title,
    slug: page.slug,
    intent: page.intent,
    status: page.status,
    sortOrder: page.sortOrder,
    seo: (page.seo as WebsiteSeo | null) ?? null,
    components: normalizeComponents(page.components),
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}

function serializeWebsite(
  site: Website,
  pages?: WebsitePage[],
): SerializedWebsite {
  return {
    id: site.id,
    organisationId: site.organisationId,
    name: site.name,
    slug: site.slug,
    status: site.status,
    brief: site.brief,
    theme: (site.theme as WebsiteTheme | null) ?? null,
    seo: (site.seo as WebsiteSeo | null) ?? null,
    metadata: (site.metadata as Record<string, unknown> | null) ?? null,
    publishedAt: site.publishedAt?.toISOString() ?? null,
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.updatedAt.toISOString(),
    pages: pages?.map(serializePage),
  };
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const { prisma } = await import("@dg/database");
  let slug = slugifySiteName(base);
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const existing = await prisma.website.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

export async function listWebsites(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const items = await prisma.website.findMany({
    where: { organisationId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { pages: true } } },
  });
  return items.map((site) => ({
    ...serializeWebsite(site),
    pageCount: site._count.pages,
  }));
}

/** Sites with full page/component trees — for Content overview */
export async function listWebsitesWithPages(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const items = await prisma.website.findMany({
    where: { organisationId },
    orderBy: { updatedAt: "desc" },
    include: { pages: { orderBy: { sortOrder: "asc" } } },
  });
  return items.map((site) => serializeWebsite(site, site.pages));
}

export async function getWebsite(
  organisationId: string,
  websiteId: string,
): Promise<SerializedWebsite | null> {
  const { prisma } = await import("@dg/database");
  const site = await prisma.website.findFirst({
    where: { id: websiteId, organisationId },
    include: { pages: { orderBy: { sortOrder: "asc" } } },
  });
  if (!site) return null;
  return serializeWebsite(site, site.pages);
}

export async function getWebsiteBySlug(
  slug: string,
  opts?: { publishedOnly?: boolean },
): Promise<SerializedWebsite | null> {
  const { prisma } = await import("@dg/database");
  const site = await prisma.website.findUnique({
    where: { slug },
    include: { pages: { orderBy: { sortOrder: "asc" } } },
  });
  if (!site) return null;
  if (opts?.publishedOnly && site.status !== "published") return null;
  return serializeWebsite(site, site.pages);
}

export async function createWebsite(input: {
  organisationId: string;
  organisationName: string;
  actorId?: string;
  name?: string;
  brief?: string;
  /** When true, immediately generate pages from profile + brief */
  generate?: boolean;
  /** Industry starter pack — auto derives from Business Profile / enabled apps */
  template?: WebsiteTemplateId | "auto";
}) {
  const { prisma } = await import("@dg/database");
  const profile = await getOrganisationBusinessProfile(input.organisationId);
  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { settings: true },
  });
  const enabledAppIds = resolveEnabledAppIds(
    (org?.settings as { apps?: { enabled?: string[] } } | null) ?? null,
  );
  const template = resolveWebsiteTemplateId({
    explicit: input.template ?? "auto",
    industryVertical: profile?.industryVertical,
    enabledAppIds,
  });
  const display =
    input.name?.trim() ||
    profile?.tradingName?.trim() ||
    profile?.businessName?.trim() ||
    input.organisationName;
  const slug = await uniqueSlug(display);

  let generated: Awaited<ReturnType<typeof generateSiteModel>> | null = null;
  if (input.generate !== false) {
    generated = await generateSiteModel({
      organisationName: input.organisationName,
      profile,
      brief: input.brief,
      template,
      enabledAppIds,
    });
  }

  const siteName = generated?.model.name || `${display} Website`;
  const theme = generated?.model.theme ?? null;
  const seo = generated?.model.seo ?? null;

  const site = await prisma.website.create({
    data: {
      organisationId: input.organisationId,
      name: siteName,
      slug,
      status: "draft",
      brief: input.brief?.trim() || null,
      theme: (theme ?? undefined) as Prisma.InputJsonValue | undefined,
      seo: (seo ?? undefined) as Prisma.InputJsonValue | undefined,
      metadata: {
        generatorSource: generated?.source ?? "none",
        template: generated?.template ?? template,
        industryHooks: {
          realEstate: template === "real_estate",
          accommodation: template === "accommodation",
        },
        wpImport: {
          status: "not_started",
          note: "Connect WordPress, then queue import from Studio",
        },
      } as Prisma.InputJsonValue,
      pages: generated
        ? {
            create: generated.model.pages.map((page, index) => ({
              title: page.title,
              slug: page.slug,
              intent: page.intent ?? "custom",
              status: "draft",
              sortOrder: index,
              seo: (page.seo ?? undefined) as Prisma.InputJsonValue | undefined,
              components: page.components as unknown as Prisma.InputJsonValue,
            })),
          }
        : undefined,
    },
    include: { pages: { orderBy: { sortOrder: "asc" } } },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "Website",
    entityId: site.id,
    changes: { after: { name: site.name, slug: site.slug } },
  });

  return {
    website: serializeWebsite(site, site.pages),
    generator: generated
      ? { source: generated.source, error: generated.error ?? null }
      : null,
  };
}

export async function regenerateWebsitePages(input: {
  organisationId: string;
  websiteId: string;
  actorId?: string;
  brief?: string;
  template?: WebsiteTemplateId | "auto";
}) {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.website.findFirst({
    where: { id: input.websiteId, organisationId: input.organisationId },
  });
  if (!existing) return null;

  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { name: true, settings: true },
  });
  const profile = await getOrganisationBusinessProfile(input.organisationId);
  const enabledAppIds = resolveEnabledAppIds(
    (org?.settings as { apps?: { enabled?: string[] } } | null) ?? null,
  );
  const meta = (existing.metadata as Record<string, unknown> | null) ?? {};
  const priorTemplate =
    typeof meta.template === "string" ? meta.template : undefined;
  const template = resolveWebsiteTemplateId({
    explicit:
      input.template ??
      (priorTemplate === "real_estate" ||
      priorTemplate === "accommodation" ||
      priorTemplate === "generic"
        ? priorTemplate
        : "auto"),
    industryVertical: profile?.industryVertical,
    enabledAppIds,
  });
  const brief = input.brief ?? existing.brief;
  const generated = await generateSiteModel({
    organisationName: org?.name ?? "Business",
    profile,
    brief,
    template,
    enabledAppIds,
  });

  await prisma.websitePage.deleteMany({ where: { websiteId: existing.id } });
  await prisma.website.update({
    where: { id: existing.id },
    data: {
      brief: brief?.trim() || existing.brief,
      name: generated.model.name || existing.name,
      theme: (generated.model.theme ?? existing.theme) as Prisma.InputJsonValue,
      seo: (generated.model.seo ?? existing.seo) as Prisma.InputJsonValue,
      metadata: {
        ...meta,
        generatorSource: generated.source,
        template: generated.template,
        industryHooks: {
          realEstate: generated.template === "real_estate",
          accommodation: generated.template === "accommodation",
        },
        regeneratedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  });
  await prisma.websitePage.createMany({
    data: generated.model.pages.map((page, index) => ({
      websiteId: existing.id,
      title: page.title,
      slug: page.slug,
      intent: page.intent ?? "custom",
      status: "draft",
      sortOrder: index,
      seo: (page.seo ?? undefined) as Prisma.InputJsonValue | undefined,
      components: page.components as unknown as Prisma.InputJsonValue,
    })),
  });

  const updated = await getWebsite(input.organisationId, existing.id);
  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "Website",
    entityId: existing.id,
    changes: { after: { regenerated: true, source: generated.source } },
  });

  return {
    website: updated,
    generator: { source: generated.source, error: generated.error ?? null },
  };
}

export async function updateWebsite(input: {
  organisationId: string;
  websiteId: string;
  actorId?: string;
  name?: string;
  /** Public /sites/[slug] — only [a-z0-9-], uniqueness enforced */
  slug?: string;
  brief?: string;
  theme?: WebsiteTheme;
  seo?: WebsiteSeo;
  status?: string;
  metadata?: Record<string, unknown>;
}) {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.website.findFirst({
    where: { id: input.websiteId, organisationId: input.organisationId },
  });
  if (!existing) return null;

  const data: Prisma.WebsiteUpdateInput = {};
  if (input.name?.trim()) data.name = input.name.trim();
  if (input.slug !== undefined) {
    const next = slugifySiteName(input.slug);
    if (next && next !== existing.slug) {
      data.slug = await uniqueSlug(next, existing.id);
    }
  }
  if (input.brief !== undefined) data.brief = input.brief?.trim() || null;
  if (input.theme) data.theme = input.theme as Prisma.InputJsonValue;
  if (input.seo) data.seo = input.seo as Prisma.InputJsonValue;
  if (input.metadata) {
    data.metadata = {
      ...((existing.metadata as Record<string, unknown> | null) ?? {}),
      ...input.metadata,
    } as Prisma.InputJsonValue;
  }
  if (input.status === "published") {
    data.status = "published";
    data.publishedAt = existing.publishedAt ?? new Date();
  } else if (input.status === "draft" || input.status === "archived") {
    data.status = input.status;
  }

  const site = await prisma.website.update({
    where: { id: existing.id },
    data,
    include: { pages: { orderBy: { sortOrder: "asc" } } },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "Website",
    entityId: site.id,
    changes: { after: { status: site.status, name: site.name } },
  });

  return serializeWebsite(site, site.pages);
}

export async function updateWebsitePage(input: {
  organisationId: string;
  websiteId: string;
  pageId: string;
  actorId?: string;
  title?: string;
  slug?: string;
  components?: WebsiteComponent[];
  seo?: WebsiteSeo;
  status?: string;
}) {
  const { prisma } = await import("@dg/database");
  const site = await prisma.website.findFirst({
    where: { id: input.websiteId, organisationId: input.organisationId },
    select: { id: true },
  });
  if (!site) return null;

  const page = await prisma.websitePage.findFirst({
    where: { id: input.pageId, websiteId: site.id },
  });
  if (!page) return null;

  let nextSlug: string | undefined;
  if (input.slug !== undefined) {
    const cleaned = normalizePageSlug(input.slug);
    if (!cleaned) {
      throw new Error("Page slug must use letters, numbers, hyphens, or slashes");
    }
    if (cleaned !== page.slug) {
      const clash = await prisma.websitePage.findFirst({
        where: {
          websiteId: site.id,
          slug: cleaned,
          NOT: { id: page.id },
        },
        select: { id: true },
      });
      if (clash) throw new Error("Another page already uses that slug");
      nextSlug = cleaned;
    }
  }

  const updated = await prisma.websitePage.update({
    where: { id: page.id },
    data: {
      title: input.title?.trim() || undefined,
      slug: nextSlug,
      status: input.status || undefined,
      seo: input.seo
        ? (input.seo as Prisma.InputJsonValue)
        : undefined,
      components: input.components
        ? (normalizeComponents(input.components) as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "WebsitePage",
    entityId: updated.id,
    changes: { after: { title: updated.title, slug: updated.slug } },
  });

  return serializePage(updated);
}

/**
 * Permanently delete a website (and cascaded pages).
 * Linked infrastructure domains are detached (websiteId set null).
 */
export async function deleteWebsite(input: {
  organisationId: string;
  websiteId: string;
  actorId?: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.website.findFirst({
    where: { id: input.websiteId, organisationId: input.organisationId },
    select: { id: true, name: true, slug: true },
  });
  if (!existing) {
    return { ok: false, code: "not_found", message: "Website not found" };
  }

  await prisma.website.delete({ where: { id: existing.id } });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "delete",
    entityType: "Website",
    entityId: existing.id,
    changes: { before: { name: existing.name, slug: existing.slug } },
  });

  return { ok: true };
}

/** Delete a page. Refuses if it is the only page on the site. */
export async function deleteWebsitePage(input: {
  organisationId: string;
  websiteId: string;
  pageId: string;
  actorId?: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const { prisma } = await import("@dg/database");
  const site = await prisma.website.findFirst({
    where: { id: input.websiteId, organisationId: input.organisationId },
    select: { id: true },
  });
  if (!site) {
    return { ok: false, code: "not_found", message: "Website not found" };
  }

  const page = await prisma.websitePage.findFirst({
    where: { id: input.pageId, websiteId: site.id },
    select: { id: true, title: true, slug: true },
  });
  if (!page) {
    return { ok: false, code: "not_found", message: "Page not found" };
  }

  const pageCount = await prisma.websitePage.count({
    where: { websiteId: site.id },
  });
  if (pageCount <= 1) {
    return {
      ok: false,
      code: "last_page",
      message: "Cannot delete the only page on a website. Add another page first.",
    };
  }

  await prisma.websitePage.delete({ where: { id: page.id } });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "delete",
    entityType: "WebsitePage",
    entityId: page.id,
    changes: { before: { title: page.title, slug: page.slug } },
  });

  return { ok: true };
}

export async function createWebsitePage(input: {
  organisationId: string;
  websiteId: string;
  actorId?: string;
  title: string;
  slug: string;
  intent?: string;
  components?: WebsiteComponent[];
  seo?: WebsiteSeo;
}) {
  const { prisma } = await import("@dg/database");
  const site = await prisma.website.findFirst({
    where: { id: input.websiteId, organisationId: input.organisationId },
    include: { pages: { select: { sortOrder: true }, orderBy: { sortOrder: "desc" }, take: 1 } },
  });
  if (!site) return null;

  const sortOrder = (site.pages[0]?.sortOrder ?? -1) + 1;
  const page = await prisma.websitePage.create({
    data: {
      websiteId: site.id,
      title: input.title.trim(),
      slug: normalizePageSlug(input.slug),
      intent: input.intent ?? "custom",
      status: "draft",
      sortOrder,
      seo: (input.seo ?? undefined) as Prisma.InputJsonValue | undefined,
      components: (input.components
        ? normalizeComponents(input.components)
        : []) as unknown as Prisma.InputJsonValue,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "WebsitePage",
    entityId: page.id,
  });

  return serializePage(page);
}

/** Duplicate a page with a unique slug and refreshed component ids */
export async function duplicateWebsitePage(input: {
  organisationId: string;
  websiteId: string;
  pageId: string;
  actorId?: string;
}): Promise<SerializedWebsitePage | null> {
  const { prisma } = await import("@dg/database");
  const site = await prisma.website.findFirst({
    where: { id: input.websiteId, organisationId: input.organisationId },
    select: { id: true },
  });
  if (!site) return null;

  const source = await prisma.websitePage.findFirst({
    where: { id: input.pageId, websiteId: site.id },
  });
  if (!source) return null;

  const components = normalizeComponents(source.components).map((c) => ({
    ...c,
    id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`,
  }));

  let baseSlug = `${source.slug}-copy`.slice(0, 60);
  let slug = baseSlug;
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? baseSlug : `${baseSlug}-${i + 1}`.slice(0, 64);
    const clash = await prisma.websitePage.findFirst({
      where: { websiteId: site.id, slug: candidate },
      select: { id: true },
    });
    if (!clash) {
      slug = candidate;
      break;
    }
  }

  const maxSort = await prisma.websitePage.findFirst({
    where: { websiteId: site.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const page = await prisma.websitePage.create({
    data: {
      websiteId: site.id,
      title: `${source.title} (copy)`,
      slug,
      intent: source.intent ?? "custom",
      status: "draft",
      sortOrder: (maxSort?.sortOrder ?? -1) + 1,
      seo: (source.seo as Prisma.InputJsonValue) ?? undefined,
      components: components as unknown as Prisma.InputJsonValue,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "WebsitePage",
    entityId: page.id,
    changes: { after: { duplicatedFrom: source.id, slug: page.slug } },
  });

  return serializePage(page);
}

/** Reorder pages — pageIds is the desired order (all pages for the site) */
export async function reorderWebsitePages(input: {
  organisationId: string;
  websiteId: string;
  actorId?: string;
  pageIds: string[];
}): Promise<SerializedWebsite | null> {
  const { prisma } = await import("@dg/database");
  const site = await prisma.website.findFirst({
    where: { id: input.websiteId, organisationId: input.organisationId },
    include: { pages: { select: { id: true } } },
  });
  if (!site) return null;

  const existingIds = new Set(site.pages.map((p) => p.id));
  if (
    input.pageIds.length !== existingIds.size ||
    input.pageIds.some((id) => !existingIds.has(id))
  ) {
    throw new Error("pageIds must include every page exactly once");
  }

  await prisma.$transaction(
    input.pageIds.map((id, index) =>
      prisma.websitePage.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "Website",
    entityId: site.id,
    changes: { after: { pageOrder: input.pageIds } },
  });

  return getWebsite(input.organisationId, site.id);
}
