import {
  createAiVisibilityCompetitor,
  listAiVisibilityCompetitors,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePermission, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requirePermission(session, {
    module: "growth",
    action: "view",
    scope: "organisation",
  });
  if (denied) return denied;

  const items = await listAiVisibilityCompetitors(session.organisationId);
  return NextResponse.json({ data: { items } });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requirePermission(session, {
    module: "growth",
    action: "create",
    scope: "organisation",
  });
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: { code: "validation", message: "name is required" } },
      { status: 422 },
    );
  }

  try {
    const item = await createAiVisibilityCompetitor({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      name,
      domain: typeof body.domain === "string" ? body.domain : null,
      source: "manual",
      rationale: typeof body.rationale === "string" ? body.rationale : null,
    });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "validation",
          message: error instanceof Error ? error.message : "Could not create competitor",
        },
      },
      { status: 422 },
    );
  }
}
