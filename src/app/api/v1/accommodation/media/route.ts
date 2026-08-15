import { NextResponse } from "next/server";

import {
  BrandAssetStorageError,
  storeOrgFile,
} from "@dg/platform-core/assets/org-brand-storage";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

/** Stay gallery photos — larger than brand logos. */
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const HARD_MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const url = new URL(req.url);
  const maxKb = Number(url.searchParams.get("maxKb") ?? "");
  const maxBytes =
    Number.isFinite(maxKb) && maxKb > 0
      ? Math.min(Math.round(maxKb * 1024), HARD_MAX_BYTES)
      : DEFAULT_MAX_BYTES;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_form", message: "Expected multipart form data" } },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: { code: "missing_file", message: "file is required" } },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_type",
          message: "Use PNG, JPG, WebP, or GIF",
        },
      },
      { status: 400 },
    );
  }

  if (file.size > maxBytes) {
    return NextResponse.json(
      {
        error: {
          code: "file_too_large",
          message: `Image must be ${Math.round(maxBytes / 1024)} KB or smaller.`,
        },
      },
      { status: 400 },
    );
  }

  const unitKeyRaw = form.get("unitKey");
  const unitKey =
    typeof unitKeyRaw === "string" && unitKeyRaw.trim()
      ? unitKeyRaw.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64)
      : "unit";

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const stored = await storeOrgFile({
      organisationId: session.organisationId,
      buffer,
      contentType: file.type,
      maxBytes,
      keyPrefix: `unit-gallery/${unitKey}`,
      sizeLabel: "Gallery image",
    });

    return NextResponse.json({
      data: {
        url: stored.url,
        contentType: stored.contentType,
        sizeBytes: stored.sizeBytes,
        storage: stored.storage,
      },
    });
  } catch (err) {
    if (err instanceof BrandAssetStorageError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json(
      { error: { code: "upload_failed", message } },
      { status: 422 },
    );
  }
}
