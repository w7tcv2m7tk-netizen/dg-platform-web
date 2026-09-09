import { NextResponse } from "next/server";
import {
  deleteStudioLibraryImage,
  organisationHasWebsitesBuilder,
} from "@dg/platform-core";
import { BrandAssetStorageError } from "@dg/platform-core/assets/org-brand-storage";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (!canAccessWebsiteStudio(session, "delete")) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Insufficient permissions for websites.delete" } },
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

  const { id } = await ctx.params;
  const imageId = id?.trim() ?? "";
  if (!imageId) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Image id is required" } },
      { status: 400 },
    );
  }

  try {
    const removed = await deleteStudioLibraryImage({
      organisationId: session.organisationId,
      imageId,
    });
    if (!removed) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Image not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: { id: removed.id } });
  } catch (err) {
    if (err instanceof BrandAssetStorageError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : "Delete failed";
    const forbidden = message.includes("not owned");
    return NextResponse.json(
      { error: { code: forbidden ? "forbidden" : "delete_failed", message } },
      { status: forbidden ? 403 : 422 },
    );
  }
}
