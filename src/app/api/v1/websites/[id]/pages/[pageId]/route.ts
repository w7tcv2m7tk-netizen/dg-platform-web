import {
  organisationHasWebsitesBuilder,
  updateWebsitePage,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

type Ctx = { params: Promise<{ id: string; pageId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { id, pageId } = await ctx.params;
  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "feature_disabled", message: "Website Builder disabled" } },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    slug?: string;
    components?: unknown[];
    seo?: Record<string, unknown>;
    status?: string;
  } | null;

  try {
    const updated = await updateWebsitePage({
      organisationId: session.organisationId,
      websiteId: id,
      pageId,
      actorId: session.clerkUserId,
      title: body?.title,
      slug: body?.slug,
      components: body?.components as never,
      seo: body?.seo as never,
      status: body?.status,
    });

    if (!updated) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Page not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: err instanceof Error ? err.message : "Update failed",
        },
      },
      { status: 400 },
    );
  }
}
