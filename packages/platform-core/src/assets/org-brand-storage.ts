import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredBrandAsset = {
  url: string;
  contentType: string;
  sizeBytes: number;
  storage: "public" | "blob" | "inline";
};

function extensionForContentType(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}

async function storeWithVercelBlob(
  organisationId: string,
  buffer: Buffer,
  contentType: string,
): Promise<StoredBrandAsset | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return null;

  try {
    const { put } = await import("@vercel/blob");
    const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
    const ext = extensionForContentType(contentType);
    const blob = await put(`org-assets/${organisationId}/${hash}.${ext}`, buffer, {
      access: "public",
      contentType,
      token,
    });
    return {
      url: blob.url,
      contentType,
      sizeBytes: buffer.length,
      storage: "blob",
    };
  } catch {
    return null;
  }
}

async function storeOnPublicDisk(
  organisationId: string,
  buffer: Buffer,
  contentType: string,
): Promise<StoredBrandAsset> {
  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const ext = extensionForContentType(contentType);
  const filename = `${hash}.${ext}`;
  const relativeDir = path.join("public", "org-assets", organisationId);
  const absoluteDir = path.join(process.cwd(), relativeDir);
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, filename), buffer);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.VERCEL_URL?.trim()?.replace(/^/, "https://") ||
    "";

  const url = baseUrl
    ? `${baseUrl}/org-assets/${organisationId}/${filename}`
    : `/org-assets/${organisationId}/${filename}`;

  return {
    url,
    contentType,
    sizeBytes: buffer.length,
    storage: "public",
  };
}

export async function storeOrgBrandAsset(input: {
  organisationId: string;
  buffer: Buffer;
  contentType: string;
  maxBytes?: number;
}): Promise<StoredBrandAsset> {
  const maxBytes = input.maxBytes ?? 400 * 1024;
  if (input.buffer.length > maxBytes) {
    throw new Error(`Image must be ${Math.round(maxBytes / 1024)} KB or smaller`);
  }

  const blobResult = await storeWithVercelBlob(
    input.organisationId,
    input.buffer,
    input.contentType,
  );
  if (blobResult) return blobResult;

  return storeOnPublicDisk(input.organisationId, input.buffer, input.contentType);
}
