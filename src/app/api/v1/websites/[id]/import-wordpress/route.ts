import {
  importWebsiteFromWordPress,
  organisationHasWebsitesBuilder,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST — import WordPress pages into this Gen 2 Website (replaces pages, keeps draft).
 */
export async function POST(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (!canAccessWebsiteStudio(session, "edit")) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Insufficient permissions for websites.edit" } },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;
  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "feature_disabled", message: "Website Builder disabled" } },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    includePosts?: boolean;
  } | null;

  const result = await importWebsiteFromWordPress({
    organisationId: session.organisationId,
    websiteId: id,
    actorId: session.clerkUserId,
    includePosts: Boolean(body?.includePosts),
  });

  if (!result.ok) {
    const status =
      result.code === "not_found" ? 404 : result.code === "empty" ? 422 : 502;
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status },
    );
  }

  return NextResponse.json({ data: result.result });
}
