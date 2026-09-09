import type { Prisma } from "@dg/database";

import { deleteOrgFile, orgOwnedAssetUrl } from "../assets/org-brand-storage";

export const STUDIO_IMAGES_SETTINGS_KEY = "studioImages";
export const MAX_STUDIO_IMAGES = 80;

export type StudioLibraryImage = {
  id: string;
  label: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  createdAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asPositiveInt(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(Math.round(n), 20_000);
}

export function parseStudioLibraryImages(settings: unknown): StudioLibraryImage[] {
  const root = isRecord(settings) ? settings[STUDIO_IMAGES_SETTINGS_KEY] : null;
  if (!Array.isArray(root)) return [];
  const out: StudioLibraryImage[] = [];
  for (const row of root) {
    if (!isRecord(row)) continue;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const src = typeof row.src === "string" ? row.src.trim() : "";
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!id || !src || !label) continue;
    out.push({
      id: id.slice(0, 80),
      label: label.slice(0, 80),
      src: src.slice(0, 2000),
      width: asPositiveInt(row.width),
      height: asPositiveInt(row.height),
      alt:
        typeof row.alt === "string" && row.alt.trim()
          ? row.alt.trim().slice(0, 160)
          : label.slice(0, 160),
      createdAt:
        typeof row.createdAt === "string" && row.createdAt.trim()
          ? row.createdAt
          : new Date(0).toISOString(),
    });
  }
  return out.slice(0, MAX_STUDIO_IMAGES);
}

export function mergeStudioLibraryImages(
  settings: unknown,
  images: StudioLibraryImage[],
): Record<string, unknown> {
  const current = isRecord(settings) ? settings : {};
  return {
    ...current,
    [STUDIO_IMAGES_SETTINGS_KEY]: images.slice(0, MAX_STUDIO_IMAGES),
  };
}

export async function listStudioLibraryImages(
  organisationId: string,
): Promise<StudioLibraryImage[]> {
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  return parseStudioLibraryImages(org?.settings);
}

export async function addStudioLibraryImage(input: {
  organisationId: string;
  image: Omit<StudioLibraryImage, "id" | "createdAt"> & { id?: string };
}): Promise<StudioLibraryImage> {
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { id: true, settings: true },
  });
  if (!org) throw new Error("Organisation not found");

  const existing = parseStudioLibraryImages(org.settings);
  if (existing.length >= MAX_STUDIO_IMAGES) {
    throw new Error(`Image library is full (${MAX_STUDIO_IMAGES} images)`);
  }

  const image: StudioLibraryImage = {
    id: input.image.id?.trim() || crypto.randomUUID(),
    label: input.image.label.trim().slice(0, 80) || "Image",
    src: input.image.src.trim(),
    width: asPositiveInt(input.image.width),
    height: asPositiveInt(input.image.height),
    alt: (input.image.alt.trim() || input.image.label.trim() || "Image").slice(0, 160),
    createdAt: new Date().toISOString(),
  };

  const next = mergeStudioLibraryImages(org.settings, [image, ...existing]);
  await prisma.organisation.update({
    where: { id: org.id },
    data: { settings: next as unknown as Prisma.InputJsonValue },
  });
  return image;
}

export async function deleteStudioLibraryImage(input: {
  organisationId: string;
  imageId: string;
}): Promise<StudioLibraryImage | null> {
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { id: true, settings: true },
  });
  if (!org) return null;

  const existing = parseStudioLibraryImages(org.settings);
  const image = existing.find((row) => row.id === input.imageId) ?? null;
  if (!image) return null;

  if (!orgOwnedAssetUrl(image.src, input.organisationId)) {
    throw new Error("Asset URL is not owned by this organisation");
  }

  const remaining = existing.filter((row) => row.id !== input.imageId);
  const next = mergeStudioLibraryImages(org.settings, remaining);
  await prisma.organisation.update({
    where: { id: org.id },
    data: { settings: next as unknown as Prisma.InputJsonValue },
  });

  try {
    await deleteOrgFile({
      organisationId: input.organisationId,
      url: image.src,
    });
  } catch {
    // Catalog is already updated — leftover Blob objects are orphaned, not shown.
  }
  return image;
}
