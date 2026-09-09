import type { Prisma, WebsitePage } from "@dg/database";

import { writeAuditLog } from "../audit";
import { normalizeComponents } from "./schema";
import type { SerializedWebsitePage, WebsiteComponent, WebsiteSeo } from "./types";

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

export function mergeWebsitePageSeo(
  current: WebsiteSeo | null | undefined,
  patch: Partial<WebsiteSeo>,
): WebsiteSeo {
  return { ...(current ?? {}), ...patch };
}

export function patchWebsitePageComponentList(
  components: WebsiteComponent[],
  componentId: string,
  propsPatch: Record<string, unknown>,
): WebsiteComponent[] | null {
  let found = false;
  const next = components.map((component) => {
    if (component.id !== componentId) return component;
    found = true;
    return {
      ...component,
      props: { ...(component.props ?? {}), ...propsPatch },
    };
  });
  return found ? next : null;
}

async function loadTenantPage(input: {
  organisationId: string;
  websiteId: string;
  pageId: string;
}) {
  const { prisma } = await import("@dg/database");
  const site = await prisma.website.findFirst({
    where: { id: input.websiteId, organisationId: input.organisationId },
    select: { id: true },
  });
  if (!site) return null;
  return prisma.websitePage.findFirst({
    where: { id: input.pageId, websiteId: site.id },
  });
}

async function optimisticPageUpdate(input: {
  organisationId: string;
  websiteId: string;
  pageId: string;
  actorId?: string;
  buildData: (page: WebsitePage) => Prisma.WebsitePageUpdateManyMutationInput | null;
}): Promise<SerializedWebsitePage | null> {
  const { prisma } = await import("@dg/database");

  for (let attempt = 0; attempt < 3; attempt++) {
    const page = await loadTenantPage(input);
    if (!page) return null;
    const data = input.buildData(page);
    if (!data) return null;

    const result = await prisma.websitePage.updateMany({
      where: {
        id: page.id,
        websiteId: page.websiteId,
        updatedAt: page.updatedAt,
      },
      data,
    });
    if (result.count !== 1) continue;

    const updated = await prisma.websitePage.findUnique({ where: { id: page.id } });
    if (!updated) return null;
    await writeAuditLog({
      organisationId: input.organisationId,
      actorId: input.actorId,
      action: "update",
      entityType: "WebsitePage",
      entityId: updated.id,
    });
    return serializePage(updated);
  }

  throw new Error("Page changed concurrently; retry the save");
}

export async function patchWebsitePageComponent(input: {
  organisationId: string;
  websiteId: string;
  pageId: string;
  actorId?: string;
  componentId: string;
  props: Record<string, unknown>;
}) {
  return optimisticPageUpdate({
    ...input,
    buildData: (page) => {
      const components = patchWebsitePageComponentList(
        normalizeComponents(page.components),
        input.componentId,
        input.props,
      );
      if (!components) return null;
      return { components: components as unknown as Prisma.InputJsonValue };
    },
  });
}

export async function patchWebsitePageSeo(input: {
  organisationId: string;
  websiteId: string;
  pageId: string;
  actorId?: string;
  patch: Partial<WebsiteSeo>;
}) {
  return optimisticPageUpdate({
    ...input,
    buildData: (page) => ({
      seo: mergeWebsitePageSeo(
        (page.seo as WebsiteSeo | null) ?? null,
        input.patch,
      ) as Prisma.InputJsonValue,
    }),
  });
}
