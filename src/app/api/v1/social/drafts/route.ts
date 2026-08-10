import { createActivity, listOrganisationActivities } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit")
    ? Number.parseInt(searchParams.get("limit")!, 10)
    : undefined;

  const result = await listOrganisationActivities({
    organisationId: session.organisationId,
    sourceApp: "social",
    limit,
  });

  return NextResponse.json({ data: result.items, meta: result.meta });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    body?: string;
  } | null;
  const title = body?.title?.trim();
  const noteBody = body?.body?.trim();

  if (!title) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "title is required",
        },
      },
      { status: 422 },
    );
  }

  const activity = await createActivity({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    entityType: "Organisation",
    entityId: session.organisationId,
    activityType: "social.draft",
    title,
    body: noteBody,
    sourceApp: "social",
  });

  return NextResponse.json({ data: activity }, { status: 201 });
}
