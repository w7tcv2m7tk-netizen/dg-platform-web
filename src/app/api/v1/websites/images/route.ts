import { NextResponse } from "next/server";
import {
  addStudioLibraryImage,
  listStudioLibraryImages,
  organisationHasWebsitesBuilder,
} from "@dg/platform-core";
import {
  BrandAssetStorageError,
  storeOrgFile,
} from "@dg/platform-core/assets/org-brand-storage";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const HARD_MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function sniffImageContentType(buffer: Buffer, declared: string): string | null {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  const head = buffer.toString("ascii", 0, 6);
  if (head === "GIF87a" || head === "GIF89a") return "image/gif";
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return ALLOWED_TYPES.has(declared) ? declared : null;
}

function labelFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return (base || "Image").slice(0, 80);
}

function asDimension(value: FormDataEntryValue | null): number {
  if (typeof value !== "string") return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.round(n), 20_000);
}

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (!canAccessWebsiteStudio(session, "view")) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Insufficient permissions for websites.view" } },
      { status: 403 },
    );
  }

  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "feature_disabled", message: "Website Builder disabled" } },
      { status: 403 },
    );
  }

  const images = await listStudioLibraryImages(session.organisationId);
  return NextResponse.json({ data: { images } });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (!canAccessWebsiteStudio(session, "edit")) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Insufficient permissions for websites.edit" } },
      { status: 403 },
    );
  }

  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "feature_disabled", message: "Website Builder disabled" } },
      { status: 403 },
    );
  }

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

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = sniffImageContentType(buffer, file.type);
  if (!contentType) {
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

  const labelRaw = form.get("label");
  const label =
    typeof labelRaw === "string" && labelRaw.trim()
      ? labelRaw.trim().slice(0, 80)
      : labelFromFilename(file.name);

  try {
    const stored = await storeOrgFile({
      organisationId: session.organisationId,
      buffer,
      contentType,
      maxBytes,
      keyPrefix: "studio-images",
      sizeLabel: "Image",
    });

    const image = await addStudioLibraryImage({
      organisationId: session.organisationId,
      image: {
        label,
        src: stored.url,
        width: asDimension(form.get("width")),
        height: asDimension(form.get("height")),
        alt: label,
      },
    });

    return NextResponse.json({ data: { image, storage: stored.storage } });
  } catch (err) {
    if (err instanceof BrandAssetStorageError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : "Upload failed";
    const full = message.includes("full");
    return NextResponse.json(
      { error: { code: full ? "library_full" : "upload_failed", message } },
      { status: full ? 409 : 422 },
    );
  }
}
