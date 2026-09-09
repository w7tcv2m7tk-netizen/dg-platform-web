import {
  organisationHasWebsitesBuilder,
  suggestWebsiteMarkup,
  type MarkupKind,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

type Ctx = { params: Promise<{ id: string }> };

const KINDS: MarkupKind[] = ["page-html", "header", "footer", "css"];

/** AI improve/generate for Studio markup fields (review-then-save). */
export async function POST(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  await ctx.params;
  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "feature_disabled", message: "Website Builder disabled" } },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    kind?: string;
    current?: string;
    instruction?: string;
    siteName?: string;
  } | null;

  if (!body?.kind || !KINDS.includes(body.kind as MarkupKind)) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Invalid kind" } },
      { status: 422 },
    );
  }

  const result = await suggestWebsiteMarkup({
    kind: body.kind as MarkupKind,
    current: typeof body.current === "string" ? body.current : "",
    instruction: body.instruction,
    siteName: body.siteName,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: { code: "ai_error", message: result.error } },
      { status: 400 },
    );
  }

  return NextResponse.json({
    data: { content: result.content, provider: result.provider },
  });
}
