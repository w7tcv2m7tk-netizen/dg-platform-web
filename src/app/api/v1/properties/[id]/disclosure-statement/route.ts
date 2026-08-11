import {
  BrandAssetStorageError,
  clearPropertyDisclosureStatement,
  getProperty,
  normalizePropertyDisclosureStatement,
  savePropertyDisclosureStatement,
  storeOrgFile,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export async function GET(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const property = await getProperty(session.organisationId, id);
  if (!property) {
    return NextResponse.json(
      { error: { code: "property_not_found", message: "Property not found" } },
      { status: 404 },
    );
  }

  const disclosureStatement = normalizePropertyDisclosureStatement(
    (property.metadata as Record<string, unknown> | null)?.disclosureStatement as
      | Record<string, unknown>
      | undefined,
  );

  return NextResponse.json({
    data: { disclosureStatement: disclosureStatement ?? null },
  });
}

export async function POST(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const property = await getProperty(session.organisationId, id);
  if (!property) {
    return NextResponse.json(
      { error: { code: "property_not_found", message: "Property not found" } },
      { status: 404 },
    );
  }

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

  const contentType = file.type || "application/pdf";
  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_type",
          message: "Use a PDF or image (PNG, JPG, WebP) of the disclosure statement",
        },
      },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: {
          code: "file_too_large",
          message: `File must be ${Math.round(MAX_BYTES / 1024 / 1024)} MB or smaller`,
        },
      },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const stored = await storeOrgFile({
      organisationId: session.organisationId,
      buffer,
      contentType,
      maxBytes: MAX_BYTES,
      keyPrefix: `property-docs/${id}/disclosure-statement`,
      sizeLabel: "Disclosure statement",
    });

    const disclosureStatement = {
      url: stored.url,
      fileName:
        file.name?.trim() ||
        `disclosure-statement.${contentType === "application/pdf" ? "pdf" : "bin"}`,
      contentType: stored.contentType,
      sizeBytes: stored.sizeBytes,
      storage: stored.storage,
      uploadedAt: new Date().toISOString(),
      uploadedBy: session.clerkUserId,
    };

    const updated = await savePropertyDisclosureStatement(
      session.organisationId,
      id,
      disclosureStatement,
      session.clerkUserId,
    );

    if (!updated) {
      return NextResponse.json(
        { error: { code: "property_not_found", message: "Property not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: { disclosureStatement } });
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

export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const updated = await clearPropertyDisclosureStatement(
    session.organisationId,
    id,
    session.clerkUserId,
  );

  if (!updated) {
    return NextResponse.json(
      { error: { code: "property_not_found", message: "Property not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: { disclosureStatement: null } });
}
