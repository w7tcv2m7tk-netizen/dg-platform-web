import {
  createWebsite,
  listWebsites,
  organisationHasWebsitesBuilder,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) {
    return NextResponse.json(
      {
        error: {
          code: "feature_disabled",
          message:
            "Website Builder is off for this organisation. Enable websites.builder in Command Centre → Flags (or set DG_WEBSITES_BUILDER=1).",
        },
      },
      { status: 403 },
    );
  }

  const items = await listWebsites(session.organisationId);
  return NextResponse.json({ data: items });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) {
    return NextResponse.json(
      {
        error: {
          code: "feature_disabled",
          message:
            "Website Builder is off for this organisation. Enable websites.builder in Command Centre → Flags.",
        },
      },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    brief?: string;
    generate?: boolean;
  } | null;

  const result = await createWebsite({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    actorId: session.clerkUserId,
    name: body?.name,
    brief: body?.brief,
    generate: body?.generate !== false,
  });

  return NextResponse.json({ data: result }, { status: 201 });
}
