import {
  normaliseWebsiteChromePatch,
  organisationHasWebsitesBuilder,
  patchWebsiteChrome,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (!canAccessWebsiteStudio(session, "edit")) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Insufficient permissions for websites.edit" } },
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

  const body = await req.json().catch(() => null);
  const patch = normaliseWebsiteChromePatch(body);
  if (!patch) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "Provide at least one valid headerHtml, footerHtml, or customCss field",
        },
      },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  try {
    const updated = await patchWebsiteChrome({
      organisationId: session.organisationId,
      websiteId: id,
      actorId: session.clerkUserId,
      patch,
    });
    if (!updated) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Website not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[website-studio] chrome patch failed", error);
    return NextResponse.json(
      {
        error: {
          code: "write_conflict",
          message:
            error instanceof Error
              ? error.message
              : "Website chrome changed concurrently; retry the save",
        },
      },
      { status: 409 },
    );
  }
}
