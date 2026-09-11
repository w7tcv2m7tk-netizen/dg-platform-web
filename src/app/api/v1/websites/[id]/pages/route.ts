import {
  createWebsitePage,
  duplicateWebsitePage,
  organisationHasWebsitesBuilder,
  reorderWebsitePages,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

type Ctx = { params: Promise<{ id: string }> };

function forbidden() {
  return NextResponse.json(
    { error: { code: "forbidden", message: "You do not have permission to change website pages." } },
    { status: 403 },
  );
}

function featureDisabled() {
  return NextResponse.json(
    { error: { code: "feature_disabled", message: "Design Studio isn't enabled for this business yet." } },
    { status: 403 },
  );
}

export async function POST(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (!canAccessWebsiteStudio(session, "create")) return forbidden();

  const { id } = await ctx.params;
  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) return featureDisabled();

  const body = (await req.json().catch(() => null)) as {
    action?: "duplicate" | "create";
    pageId?: string;
    title?: string;
    slug?: string;
    intent?: string;
    components?: unknown[];
  } | null;

  if (body?.action === "duplicate" || body?.pageId) {
    const pageId = body.pageId;
    if (!pageId) {
      return NextResponse.json(
        { error: { code: "validation_error", message: "Choose a page to duplicate and try again." } },
        { status: 400 },
      );
    }
    const page = await duplicateWebsitePage({
      organisationId: session.organisationId,
      websiteId: id,
      pageId,
      actorId: session.clerkUserId,
    });
    if (!page) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Page not found." } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: page }, { status: 201 });
  }

  if (!body?.title?.trim() || !body?.slug?.trim()) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "Enter a page title and URL slug and try again.",
        },
      },
      { status: 400 },
    );
  }

  const page = await createWebsitePage({
    organisationId: session.organisationId,
    websiteId: id,
    actorId: session.clerkUserId,
    title: body.title,
    slug: body.slug,
    intent: body.intent,
    components: body.components as never,
  });
  if (!page) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Website not found." } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: page }, { status: 201 });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (!canAccessWebsiteStudio(session, "edit")) return forbidden();

  const { id } = await ctx.params;
  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) return featureDisabled();

  const body = (await req.json().catch(() => null)) as {
    pageIds?: string[];
  } | null;

  if (!Array.isArray(body?.pageIds) || body.pageIds.length === 0) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Choose pages to reorder and try again." } },
      { status: 400 },
    );
  }

  try {
    const website = await reorderWebsitePages({
      organisationId: session.organisationId,
      websiteId: id,
      actorId: session.clerkUserId,
      pageIds: body.pageIds,
    });
    if (!website) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Website not found." } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: website });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "Pages could not be reordered. Refresh Studio and try again.",
        },
      },
      { status: 400 },
    );
  }
}
