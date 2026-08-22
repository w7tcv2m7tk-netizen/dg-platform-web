import {
  getSupportConversation,
  getSupportMessages,
  postSupportClientMessage,
  type SupportChatMessage,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export type { SupportChatMessage };

export async function fetchSupportConversationFromSession(
  session: Awaited<ReturnType<typeof requirePlatformSession>>,
) {
  if (isNextResponse(session)) {
    return {
      ok: false as const,
      code: "unauthorized" as const,
      message: "Sign in required",
    };
  }
  return getSupportConversation(session);
}

export async function fetchSupportMessagesFromSession(
  session: Awaited<ReturnType<typeof requirePlatformSession>>,
  after: number,
) {
  if (isNextResponse(session)) return { ok: false as const, messages: [] as SupportChatMessage[] };
  const messages = await getSupportMessages(session, after);
  return { ok: true as const, messages };
}

export async function postSupportMessageFromSession(
  session: Awaited<ReturnType<typeof requirePlatformSession>>,
  message: string,
) {
  if (isNextResponse(session)) {
    return { ok: false as const, message: "Sign in required" };
  }
  const result = await postSupportClientMessage(session, message);
  if (!result.ok) return { ok: false as const, message: result.message };
  return { ok: true as const, messages: result.messages };
}
