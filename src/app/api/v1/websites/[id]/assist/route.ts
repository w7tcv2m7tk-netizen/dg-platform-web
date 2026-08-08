import {
  applyWebsiteAssistPrompt,
  organisationHasWebsitesBuilder,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

type Ctx = { params: Promise<{ id: string }> };

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

  const body = (await req.json().catch(() => null)) as { prompt?: string } | null;
  if (!body?.prompt?.trim()) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "prompt is required" } },
      { status: 422 },
    );
  }

  const result = await applyWebsiteAssistPrompt({
    organisationId: session.organisationId,
    websiteId: id,
    actorId: session.clerkUserId,
    prompt: body.prompt,
  });

  if (!result) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Website not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: result });
}
