import {
  organisationHasWebsitesBuilder,
  deleteWebsitePage,
  patchWebsitePageComponent,
  patchWebsitePageComponentSnapshot,
  patchWebsitePageSeo,
  updateWebsitePage,
  type WebsiteSeo,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

type Ctx = { params: Promise<{ id: string; pageId: string }> };

function forbidden(action: string) {
  return NextResponse.json(
    { error: { code: "forbidden", message: `Insufficient permissions for websites.${action}` } },
    { status: 403 },
  );
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(_req);
  if (isNextResponse(session)) return session;
  if (!canAccessWebsiteStudio(session, "delete")) return forbidden("delete");

  const { id, pageId } = await ctx.params;
  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "feature_disabled", message: "Website Builder disabled" } },
      { status: 403 },
    );
  }

  const result = await deleteWebsitePage({
    organisationId: session.organisationId,
    websiteId: id,
    pageId,
    actorId: session.clerkUserId,
  });

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 400;
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status },
    );
  }

  return NextResponse.json({ data: { deleted: true } });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (!canAccessWebsiteStudio(session, "edit")) return forbidden("edit");

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
    componentPatch?: {
      componentId?: string;
      props?: Record<string, unknown>;
    };
    seoPatch?: Partial<WebsiteSeo>;
  } | null;

  try {
    if (body?.componentPatch) {
      const componentId = body.componentPatch.componentId?.trim();
      const props = body.componentPatch.props;
      if (!componentId || !props || typeof props !== "object" || Array.isArray(props)) {
        return NextResponse.json(
          { error: { code: "validation_error", message: "componentPatch requires componentId and props" } },
          { status: 400 },
        );
      }
      const updated = await patchWebsitePageComponent({
        organisationId: session.organisationId,
        websiteId: id,
        pageId,
        actorId: session.clerkUserId,
        componentId,
        props,
      });
      if (!updated) {
        return NextResponse.json(
          { error: { code: "not_found", message: "Page or component not found" } },
          { status: 404 },
        );
      }
      return NextResponse.json({ data: updated });
    }

    if (body?.seoPatch) {
      const updated = await patchWebsitePageSeo({
        organisationId: session.organisationId,
        websiteId: id,
        pageId,
        actorId: session.clerkUserId,
        patch: body.seoPatch,
      });
      if (!updated) {
        return NextResponse.json(
          { error: { code: "not_found", message: "Page not found" } },
          { status: 404 },
        );
      }
      return NextResponse.json({ data: updated });
    }

    // Backwards-compatible protection for the current Studio component editor.
    // It historically posts the whole component snapshot even when one card is
    // edited. Isolate that single component server-side; if multiple components
    // differ from Neon, fail closed instead of replaying stale page content.
    const componentsOnly =
      Array.isArray(body?.components) &&
      body?.title === undefined &&
      body?.slug === undefined &&
      body?.seo === undefined &&
      body?.status === undefined;
    if (componentsOnly) {
      const updated = await patchWebsitePageComponentSnapshot({
        organisationId: session.organisationId,
        websiteId: id,
        pageId,
        actorId: session.clerkUserId,
        components: body.components as never,
      });
      if (!updated) {
        return NextResponse.json(
          { error: { code: "not_found", message: "Page not found" } },
          { status: 404 },
        );
      }
      return NextResponse.json({ data: updated });
    }

    // The existing page chrome controls post the whole page SEO snapshot even
    // though they only own showHeader/showFooter. Ignore any stale unrelated SEO
    // fields and merge only those two chrome keys against current Neon state.
    const seoOnly =
      body?.seo &&
      body?.title === undefined &&
      body?.slug === undefined &&
      body?.components === undefined &&
      body?.status === undefined;
    if (seoOnly) {
      const patch: Partial<WebsiteSeo> = {};
      if (typeof body.seo?.showHeader === "boolean") patch.showHeader = body.seo.showHeader;
      if (typeof body.seo?.showFooter === "boolean") patch.showFooter = body.seo.showFooter;
      if (Object.keys(patch).length > 0) {
        const updated = await patchWebsitePageSeo({
          organisationId: session.organisationId,
          websiteId: id,
          pageId,
          actorId: session.clerkUserId,
          patch,
        });
        if (!updated) {
          return NextResponse.json(
            { error: { code: "not_found", message: "Page not found" } },
            { status: 404 },
          );
        }
        return NextResponse.json({ data: updated });
      }
    }

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
    const message = err instanceof Error ? err.message : "Update failed";
    const conflict =
      message.toLowerCase().includes("concurrent") ||
      message.toLowerCase().includes("changed since this editor loaded");
    return NextResponse.json(
      {
        error: {
          code: conflict ? "write_conflict" : "validation_error",
          message,
        },
      },
      { status: conflict ? 409 : 400 },
    );
  }
}
