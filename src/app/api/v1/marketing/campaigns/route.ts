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
    sourceApp: "marketing",
    limit,
  });

  const campaigns = result.items.filter((a) => a.activityType === "marketing.campaign_brief");

  return NextResponse.json({
    data: campaigns,
    meta: { ...result.meta, total: campaigns.length },
  });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    goal?: string;
  } | null;
  const title = body?.title?.trim();
  const goal = body?.goal?.trim();

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
    activityType: "marketing.campaign_brief",
    title,
    body: goal,
    sourceApp: "marketing",
  });

  return NextResponse.json({ data: activity }, { status: 201 });
}
