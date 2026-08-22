import { NextResponse } from "next/server";

import { fetchSupportConversationFromSession } from "@/lib/support-chat";
import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function GET() {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const result = await fetchSupportConversationFromSession(session);

  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: result.code === "not_linked" ? 403 : 422 },
    );
  }

  return NextResponse.json({
    data: {
      conversationId: result.conversationId,
      messages: result.messages,
    },
  });
}
