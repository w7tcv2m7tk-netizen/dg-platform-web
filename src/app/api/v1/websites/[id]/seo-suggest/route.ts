import {
  organisationHasWebsitesBuilder,
  suggestWebsiteSeo,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

type Ctx = { params: Promise<{ id: string }> };

/** AI SEO suggestions for a page or the whole site (review-then-save in Studio). */
export async function POST(req: Request, ctx: Ctx) {
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
    scope?: "site" | "page";
    pageId?: string;
  } | null;
  const scope = body?.scope === "site" ? "site" : "page";

  const result = await suggestWebsiteSeo({
    organisationId: session.organisationId,
    websiteId: id,
    scope,
    pageId: body?.pageId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: { code: "ai_error", message: result.error } },
      { status: 400 },
    );
  }

  return NextResponse.json({ data: { seo: result.seo, provider: result.provider } });
}
