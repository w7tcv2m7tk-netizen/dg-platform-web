import {
  deleteWebsite,
  getWebsite,
  normaliseWebsiteChromePatch,
  organisationHasWebsitesBuilder,
  patchWebsiteChrome,
  regenerateWebsitePages,
  updateWebsite,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

type Ctx = { params: Promise<{ id: string }> };

function forbidden(action: string) {
  return NextResponse.json(
    { error: { code: "forbidden", message: `Insufficient permissions for websites.${action}` } },
    { status: 403 },
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function GET(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (!canAccessWebsiteStudio(session, "view")) return forbidden("view");

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
  if (!canAccessWebsiteStudio(session, "edit")) return forbidden("edit");

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
    slug?: string;
    regenerate?: boolean;
    template?: "generic" | "real_estate" | "accommodation" | "marketplace" | "auto";
    theme?: Record<string, unknown>;
    seo?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  } | null;

  if (body?.regenerate) {
    const result = await regenerateWebsitePages({
      organisationId: session.organisationId,
      websiteId: id,
      actorId: session.clerkUserId,
      brief: body.brief,
      template: body.template,
    });
    if (!result) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Website not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: result });
  }

  // Backwards-compatible protection for Website Studio's current individual
  // Header / Footer / CSS buttons. The browser historically sent the whole
  // chrome object from its local snapshot. If that snapshot is stale, replaying
  // it would overwrite a newer unrelated field. Detect chrome-only writes,
  // isolate a single changed field against current Neon state, and reject a
  // multi-field stale replay rather than silently destroying newer content.
  const metadata = asRecord(body?.metadata);
  const incomingChrome = normaliseWebsiteChromePatch(metadata?.chrome);
  const isChromeOnlyMetadataWrite =
    Boolean(incomingChrome) &&
    metadata !== null &&
    Object.keys(metadata).length === 1;

  if (incomingChrome && isChromeOnlyMetadataWrite) {
    const current = await getWebsite(session.organisationId, id);
    if (!current) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Website not found" } },
        { status: 404 },
      );
    }

    const currentMetadata = asRecord(current.metadata);
    const currentChrome = asRecord(currentMetadata?.chrome) ?? {};
    const changed = Object.entries(incomingChrome).filter(
      ([key, value]) => currentChrome[key] !== value,
    );

    if (changed.length > 1) {
      return NextResponse.json(
        {
          error: {
            code: "write_conflict",
            message:
              "Website chrome changed since this editor loaded. Refresh before saving so newer header, footer, or CSS changes are not overwritten.",
          },
        },
        { status: 409 },
      );
    }

    if (changed.length === 0) {
      return NextResponse.json({ data: current });
    }

    const [key, value] = changed[0];
    const updatedChrome = await patchWebsiteChrome({
      organisationId: session.organisationId,
      websiteId: id,
      actorId: session.clerkUserId,
      patch: { [key]: value },
    });
    if (!updatedChrome) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Website not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: updatedChrome });
  }

  const updated = await updateWebsite({
    organisationId: session.organisationId,
    websiteId: id,
    actorId: session.clerkUserId,
    name: body?.name,
    slug: body?.slug,
    brief: body?.brief,
    status: body?.status,
    theme: body?.theme as never,
    seo: body?.seo as never,
    metadata: body?.metadata,
  });

  if (!updated) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Website not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: updated });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (!canAccessWebsiteStudio(session, "delete")) return forbidden("delete");

  const { id } = await ctx.params;
  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "feature_disabled", message: "Website Builder disabled" } },
      { status: 403 },
    );
  }

  const result = await deleteWebsite({
    organisationId: session.organisationId,
    websiteId: id,
    actorId: session.clerkUserId,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: result.code === "not_found" ? 404 : 400 },
    );
  }
  return NextResponse.json({ data: { deleted: true } });
}
