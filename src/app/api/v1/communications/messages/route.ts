import {
  communicationsHealthCheck,
  sendMessage,
  type CommsChannel,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, rejectDemoLiveAction, requirePlatformAuth } from "@/lib/platform-api";

const CHANNELS = new Set<CommsChannel>(["email", "sms", "voice", "chat"]);

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const health = await communicationsHealthCheck(session.organisationId);
  return NextResponse.json({ data: health });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const blocked = await rejectDemoLiveAction(session);
  if (blocked) return blocked;

  const body = await req.json().catch(() => null);
  const channel = body?.channel as CommsChannel | undefined;
  const to = body?.to as string | undefined;
  const messageBody = body?.body as string | undefined;

  if (!channel || !CHANNELS.has(channel) || !to?.trim() || !messageBody?.trim()) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "channel, to, and body are required",
        },
      },
      { status: 422 },
    );
  }

  const result = await sendMessage({
    organisationId: session.organisationId,
    channel,
    contactId: body?.contactId,
    to: to.trim(),
    subject: body?.subject,
    body: messageBody.trim(),
    metadata: {
      ...(body?.metadata && typeof body.metadata === "object" ? body.metadata : {}),
      sentBy: session.clerkUserId,
      source:
        typeof body?.metadata?.source === "string" ? body.metadata.source : "manual",
    },
  });

  return NextResponse.json({ data: result }, { status: 202 });
}
