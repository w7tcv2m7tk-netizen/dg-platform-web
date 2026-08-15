import { createHash } from "node:crypto";

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
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

function objectKey(
  organisationId: string,
  contentType: string,
  buffer: Buffer,
  keyPrefix?: string,
): string {
  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const ext = extensionForContentType(contentType);
  const prefix = keyPrefix?.replace(/^\/+|\/+$/g, "") || "";
  return prefix
    ? `org-assets/${organisationId}/${prefix}/${hash}.${ext}`
    : `org-assets/${organisationId}/${hash}.${ext}`;
}

async function storeWithVercelBlob(
  organisationId: string,
  buffer: Buffer,
  contentType: string,
  keyPrefix?: string,
): Promise<StoredBrandAsset | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return null;

  try {
    const { put } = await import("@vercel/blob");
    const blob = await put(objectKey(organisationId, contentType, buffer, keyPrefix), buffer, {
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
  keyPrefix?: string,
): Promise<StoredBrandAsset> {
  // Lazy — top-level node:fs breaks Turbopack when @dg/platform-core is imported by clients.
  const { mkdir, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");

  const key = objectKey(organisationId, contentType, buffer, keyPrefix);
  // key is org-assets/... — strip that for public/ layout
  const relativePath = key.startsWith("org-assets/") ? key : `org-assets/${key}`;
  const absolutePath = path.join(process.cwd(), "public", relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.VERCEL_URL?.trim()?.replace(/^/, "https://") ||
    "";

  const url = baseUrl ? `${baseUrl}/${relativePath}` : `/${relativePath}`;

  return {
    url,
    contentType,
    sizeBytes: buffer.length,
    storage: "public",
  };
}

/** Brand logos/icons and listing images (same Blob / public disk backends). */
export async function storeOrgBrandAsset(input: {
  organisationId: string;
  buffer: Buffer;
  contentType: string;
  maxBytes?: number;
}): Promise<StoredBrandAsset> {
  return storeOrgFile({
    ...input,
    maxBytes: input.maxBytes ?? 400 * 1024,
    sizeLabel: "Image",
  });
}

/**
 * General org file store (PDFs, images, etc.) via Vercel Blob or local public/.
 * Used for property documents such as signed agency agreements.
 */
export async function storeOrgFile(input: {
  organisationId: string;
  buffer: Buffer;
  contentType: string;
  maxBytes?: number;
  /** Optional path under org-assets/{orgId}/, e.g. property-docs/{propertyId} */
  keyPrefix?: string;
  sizeLabel?: string;
}): Promise<StoredBrandAsset> {
  const maxBytes = input.maxBytes ?? 400 * 1024;
  const sizeLabel = input.sizeLabel ?? "File";
  if (input.buffer.length > maxBytes) {
    throw new BrandAssetStorageError(
      `${sizeLabel} must be ${Math.round(maxBytes / 1024)} KB or smaller`,
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
    input.keyPrefix,
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
  return storeOnPublicDisk(
    input.organisationId,
    input.buffer,
    input.contentType,
    input.keyPrefix,
  );
}
