import {
  organisationHasWebsitesBuilder,
  suggestComponentProps,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

type Ctx = { params: Promise<{ id: string }> };

/** AI copy improvement for a single component's props (review-then-save). */
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
    type?: string;
    props?: Record<string, unknown>;
    siteName?: string;
  } | null;

  if (!body?.type || !body.props || typeof body.props !== "object") {
    return NextResponse.json(
      { error: { code: "validation_error", message: "type and props are required" } },
      { status: 422 },
    );
  }

  const result = await suggestComponentProps({
    type: body.type,
    props: body.props,
    siteName: body.siteName,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: { code: "ai_error", message: result.error } },
      { status: 400 },
    );
  }

  return NextResponse.json({
    data: { props: result.props, provider: result.provider },
  });
}
