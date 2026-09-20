import { NextResponse } from "next/server";
import { BrandAssetStorageError, storeOrgFile } from "@dg/platform-core/assets/org-brand-storage";
import { assertPlatformOperator, updateOrganisationBusinessProfile } from "@dg/platform-core";

import {
  isNextResponse,
  rejectDemoLiveAction,
  requirePermission,
  requirePlatformAuth,
} from "@/lib/platform-api";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function sniffImageType(buffer: Buffer, declared: string): string | null {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) return "image/webp";
  return ALLOWED_TYPES.has(declared) ? declared : null;
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const requestedOrganisationId = req.headers.get("x-dg-operator-organisation")?.trim();
  const targetOrganisationId = requestedOrganisationId && requestedOrganisationId !== session.organisationId
    ? (assertPlatformOperator({ clerkUserId: session.clerkUserId, organisationId: session.organisationId, role: session.role, email: session.email }) ? requestedOrganisationId : null)
    : session.organisationId;
  if (!targetOrganisationId) return NextResponse.json({ error: { code: "operator_only", message: "DigitalGate operator authority required." } }, { status: 403 });
  if (targetOrganisationId !== session.organisationId) return NextResponse.json({ error: { code: "operator_read_only", message: "Customer brand assets are read-only in operator view." } }, { status: 409 });
  const denied = requirePermission(session, { module: "settings", action: "manage", scope: "organisation" });
  if (denied) return denied;
  const blocked = await rejectDemoLiveAction(session);
  if (blocked) return blocked;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: { code: "invalid_form", message: "Expected multipart form data" } }, { status: 400 });
  }

  const file = form.get("file");
  const kind = form.get("kind") === "icon" ? "icon" : "logo";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: { code: "missing_file", message: "Choose a logo or icon image" } }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: { code: "file_too_large", message: "Brand images must be 5 MB or smaller" } }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = sniffImageType(buffer, file.type);
  if (!contentType) {
    return NextResponse.json({ error: { code: "invalid_type", message: "Use PNG, JPG or WebP" } }, { status: 400 });
  }

  try {
    const stored = await storeOrgFile({
      organisationId: targetOrganisationId,
      buffer,
      contentType,
      maxBytes: MAX_BYTES,
      keyPrefix: "brand-assets",
      sizeLabel: "Brand image",
    });
    await updateOrganisationBusinessProfile(targetOrganisationId, {
      ...(kind === "icon" ? { iconUrl: stored.url } : { logoUrl: stored.url }),
    });
    return NextResponse.json({ data: { kind, url: stored.url, storage: stored.storage } });
  } catch (error) {
    if (error instanceof BrandAssetStorageError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    }
    return NextResponse.json({ error: { code: "upload_failed", message: "Brand image upload failed" } }, { status: 422 });
  }
}
