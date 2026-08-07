import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredBrandAsset = {
  url: string;
  contentType: string;
  sizeBytes: number;
  storage: "public" | "blob" | "inline";
};

export const BLOB_TOKEN_REQUIRED_MESSAGE =
  "Set BLOB_READ_WRITE_TOKEN in Vercel for logo/icon uploads";

export class BrandAssetStorageError extends Error {
  readonly code: "blob_required" | "blob_failed" | "file_too_large";
  readonly status: number;

  constructor(
    message: string,
    code: "blob_required" | "blob_failed" | "file_too_large",
    status: number,
  ) {
    super(message);
    this.name = "BrandAssetStorageError";
    this.code = code;
    this.status = status;
  }
}

/** True on Vercel / Lambda where the filesystem is read-only. */
export function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.AWS_LAMBDA_FUNCTION_NAME,
  );
}

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
    throw new BrandAssetStorageError(
      `Image must be ${Math.round(maxBytes / 1024)} KB or smaller`,
      "file_too_large",
      400,
    );
  }

  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
  const serverless = isServerlessRuntime();

  // Never mkdir/write under public/ on Vercel or Lambda — the bundle is read-only.
  if (serverless && !hasBlobToken) {
    throw new BrandAssetStorageError(BLOB_TOKEN_REQUIRED_MESSAGE, "blob_required", 503);
  }

  const blobResult = await storeWithVercelBlob(
    input.organisationId,
    input.buffer,
    input.contentType,
  );
  if (blobResult) return blobResult;

  if (serverless) {
    throw new BrandAssetStorageError(
      "Vercel Blob upload failed. Check BLOB_READ_WRITE_TOKEN and Blob store access.",
      "blob_failed",
      503,
    );
  }

  // Local / non-serverless: fall back to public/org-assets for dev convenience.
  return storeOnPublicDisk(input.organisationId, input.buffer, input.contentType);
}
