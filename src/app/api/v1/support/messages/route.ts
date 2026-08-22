import { NextResponse } from "next/server";

import {
  fetchSupportMessagesFromSession,
  postSupportMessageFromSession,
} from "@/lib/support-chat";
import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const after = Number(new URL(req.url).searchParams.get("after") ?? 0);
  const result = await fetchSupportMessagesFromSession(session, after);

  return NextResponse.json({
    data: { messages: result.messages },
  });
}

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Message is required" } },
      { status: 422 },
    );
  }

  const result = await postSupportMessageFromSession(session, message);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: "send_failed", message: result.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: { messages: result.messages } });
}
