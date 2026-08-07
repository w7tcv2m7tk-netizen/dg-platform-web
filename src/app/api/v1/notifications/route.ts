import { NextResponse } from "next/server";
import {
  listNotifications,
  markNotificationsRead,
} from "@dg/platform-core";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "1";
  const limit = Number(searchParams.get("limit") ?? "30");

  const result = await listNotifications({
    organisationId: session.organisationId,
    recipientUserId: session.clerkUserId,
    unreadOnly,
    limit: Number.isFinite(limit) ? limit : 30,
  });

  return NextResponse.json({ data: result });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;

  if (action === "mark_read") {
    const result = await markNotificationsRead({
      organisationId: session.organisationId,
      recipientUserId: session.clerkUserId,
      ids: Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : undefined,
      all: body.all === true,
    });
    return NextResponse.json({ data: result });
  }

  return NextResponse.json(
    { error: { code: "invalid_action", message: "Unknown action" } },
    { status: 400 },
  );
}
