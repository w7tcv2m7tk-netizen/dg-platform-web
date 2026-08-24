import {
  createOrgDocument,
  listOrgDocuments,
  type DocumentKind,
  type DocumentSigningStatus,
  type DocumentStatus,
} from "@dg/platform-core";
import {
  BrandAssetStorageError,
  storeOrgFile,
} from "@dg/platform-core/assets/org-brand-storage";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const KINDS = new Set<DocumentKind>([
  "agency_agreement",
  "disclosure_statement",
  "contract",
  "engagement",
  "authority",
  "loan_document",
  "service_agreement",
  "other",
]);

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind")?.trim() || undefined;
  const entityType = url.searchParams.get("entityType")?.trim() || undefined;
  const entityId = url.searchParams.get("entityId")?.trim() || undefined;
  const signingStatus =
    url.searchParams.get("signingStatus")?.trim() ||
    url.searchParams.get("status")?.trim() ||
    undefined;
  const documentStatus = url.searchParams.get("documentStatus")?.trim() || undefined;

  try {
    const documents = await listOrgDocuments({
      organisationId: session.organisationId,
      kind,
      entityType,
      entityId,
      signingStatus,
      documentStatus,
    });
    return NextResponse.json({ data: { documents } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "List failed";
    return NextResponse.json(
      { error: { code: "list_failed", message } },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

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

  const kindRaw = String(form.get("kind") ?? "other").trim() as DocumentKind;
  if (!KINDS.has(kindRaw)) {
    return NextResponse.json(
      { error: { code: "invalid_kind", message: "Unknown document kind" } },
      { status: 400 },
    );
  }

  const contentType = file.type || "application/pdf";
  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_type",
          message: "Use a PDF or image (PNG, JPG, WebP)",
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
      { status: 422 },
    );
  }

  const signedFlag = String(form.get("signed") ?? "1").trim();
  const signingStatus: DocumentSigningStatus =
    signedFlag === "0" || signedFlag === "false" ? "ready" : "completed";
  const documentStatus: DocumentStatus = "active";

  const entityType = String(form.get("entityType") ?? "").trim() || undefined;
  const entityId = String(form.get("entityId") ?? "").trim() || undefined;
  const name =
    String(form.get("name") ?? "").trim() ||
    file.name?.trim() ||
    `${kindRaw}.pdf`;

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const keyPrefix = entityId
      ? `documents/${kindRaw}/${entityType ?? "entity"}/${entityId}`
      : `documents/${kindRaw}`;
    const stored = await storeOrgFile({
      organisationId: session.organisationId,
      buffer,
      contentType,
      maxBytes: MAX_BYTES,
      keyPrefix,
      sizeLabel: "Document",
    });

    const document = await createOrgDocument({
      organisationId: session.organisationId,
      name,
      kind: kindRaw,
      mimeType: stored.contentType,
      sizeBytes: stored.sizeBytes,
      storageKey: stored.url,
      url: stored.url,
      storage: stored.storage,
      documentStatus,
      signingStatus,
      signingProvider: "manual_upload",
      sourceApp: "documents",
      entityType,
      entityId,
      upsertForEntity: Boolean(entityType && entityId),
      metadata: {
        uploadedAt: new Date().toISOString(),
        uploadedBy: session.clerkUserId,
      },
    });

    return NextResponse.json({ data: { document } });
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
