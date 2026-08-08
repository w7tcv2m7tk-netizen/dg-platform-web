import {
  getWebsite,
  organisationHasWebsitesBuilder,
  regenerateWebsitePages,
  updateWebsite,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;
  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "feature_disabled", message: "Website Builder disabled" } },
      { status: 403 },
    );
  }

  const website = await getWebsite(session.organisationId, id);
  if (!website) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Website not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: website });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;
  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "feature_disabled", message: "Website Builder disabled" } },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    brief?: string;
    status?: string;
    regenerate?: boolean;
    theme?: Record<string, unknown>;
    seo?: Record<string, unknown>;
  } | null;

  if (body?.regenerate) {
    const result = await regenerateWebsitePages({
      organisationId: session.organisationId,
      websiteId: id,
      actorId: session.clerkUserId,
      brief: body.brief,
    });
    if (!result) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Website not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: result });
  }

  const updated = await updateWebsite({
    organisationId: session.organisationId,
    websiteId: id,
    actorId: session.clerkUserId,
    name: body?.name,
    brief: body?.brief,
    status: body?.status,
    theme: body?.theme as never,
    seo: body?.seo as never,
  });

  if (!updated) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Website not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: updated });
}
