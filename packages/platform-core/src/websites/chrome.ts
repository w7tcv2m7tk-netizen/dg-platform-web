import type { Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import type { SerializedWebsite } from "./types";
import { getWebsite } from "./crud";

export type WebsiteChromePatch = Partial<{
  headerHtml: string;
  footerHtml: string;
  customCss: string;
}>;

const CHROME_KEYS = ["headerHtml", "footerHtml", "customCss"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normaliseWebsiteChromePatch(
  value: unknown,
): WebsiteChromePatch | null {
  if (!isRecord(value)) return null;
  const patch: WebsiteChromePatch = {};
  for (const key of CHROME_KEYS) {
    if (value[key] === undefined) continue;
    if (typeof value[key] !== "string") return null;
    patch[key] = value[key];
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

export function mergeWebsiteChromeMetadata(
  metadata: unknown,
  patch: WebsiteChromePatch,
): Record<string, unknown> {
  const currentMetadata = isRecord(metadata) ? metadata : {};
  const currentChrome = isRecord(currentMetadata.chrome)
    ? currentMetadata.chrome
    : {};
  return {
    ...currentMetadata,
    chrome: {
      ...currentChrome,
      ...patch,
    },
  };
}

/**
 * Patch only the requested Website Studio chrome fields.
 *
 * The conditional updatedAt write prevents two concurrent editors from
 * silently overwriting each other's unrelated header/footer/CSS changes.
 * On a collision we re-read current Neon state, merge the same narrow patch,
 * and retry rather than replaying stale browser state.
 */
export async function patchWebsiteChrome(input: {
  organisationId: string;
  websiteId: string;
  actorId?: string;
  patch: WebsiteChromePatch;
}): Promise<SerializedWebsite | null> {
  const { prisma } = await import("@dg/database");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const existing = await prisma.website.findFirst({
      where: {
        id: input.websiteId,
        organisationId: input.organisationId,
      },
      select: {
        id: true,
        metadata: true,
        updatedAt: true,
      },
    });
    if (!existing) return null;

    const metadata = mergeWebsiteChromeMetadata(existing.metadata, input.patch);
    const result = await prisma.website.updateMany({
      where: {
        id: existing.id,
        organisationId: input.organisationId,
        updatedAt: existing.updatedAt,
      },
      data: {
        metadata: metadata as Prisma.InputJsonValue,
      },
    });

    if (result.count !== 1) continue;

    await writeAuditLog({
      organisationId: input.organisationId,
      actorId: input.actorId,
      action: "update",
      entityType: "Website",
      entityId: existing.id,
      changes: { after: { chromeFields: Object.keys(input.patch) } },
    });

    return getWebsite(input.organisationId, existing.id);
  }

  throw new Error("Website chrome changed concurrently; retry the save");
}
