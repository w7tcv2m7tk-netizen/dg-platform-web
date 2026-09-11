import {
  createFunnelWebsite,
  createWebsite,
  isFunnelTemplateId,
  listWebsites,
  organisationHasWebsitesBuilder,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

function forbidden(action: string) {
  return NextResponse.json(
    {
      error: {
        code: "forbidden",
        message: `Insufficient permissions for websites.${action}`,
      },
    },
    { status: 403 },
  );
}

function featureDisabled() {
  return NextResponse.json(
    {
      error: {
        code: "feature_disabled",
        message: "Design Studio isn't enabled for this business yet.",
      },
    },
    { status: 403 },
  );
}

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (!canAccessWebsiteStudio(session, "view")) return forbidden("view");

  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) return featureDisabled();

  const items = await listWebsites(session.organisationId);
  return NextResponse.json({ data: items });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (!canAccessWebsiteStudio(session, "create")) return forbidden("create");

  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) return featureDisabled();

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    brief?: string;
    generate?: boolean;
    template?: "generic" | "real_estate" | "accommodation" | "marketplace" | "auto";
    kind?: "site" | "funnel";
    funnelTemplate?: string;
    offer?: string;
  } | null;

  if (body?.kind === "funnel") {
    if (!isFunnelTemplateId(body.funnelTemplate)) {
      return NextResponse.json(
        {
          error: {
            code: "validation_error",
            message: "Choose a valid funnel template and try again.",
          },
        },
        { status: 400 },
      );
    }
    const result = await createFunnelWebsite({
      organisationId: session.organisationId,
      organisationName: session.organisationName,
      actorId: session.clerkUserId,
      template: body.funnelTemplate,
      name: body.name,
      brief: body.brief,
      offer: body.offer,
    });
    return NextResponse.json({ data: result }, { status: 201 });
  }

  const result = await createWebsite({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    actorId: session.clerkUserId,
    name: body?.name,
    brief: body?.brief,
    generate: body?.generate !== false,
    template: body?.template,
  });

  return NextResponse.json({ data: result }, { status: 201 });
}
