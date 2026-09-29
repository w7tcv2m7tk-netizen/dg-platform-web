import { NextResponse } from "next/server";
import { listOpenSupportConversations } from "@dg/platform-core";
import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function GET() {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;
  if (!session.isPlatformOperator) {
    return NextResponse.json({ error: { code: "forbidden", message: "Platform operator access required" } }, { status: 403 });
  }
  const conversations = await listOpenSupportConversations({ status: "open", limit: 200 });
  return NextResponse.json({ data: { count: conversations.length } });
}
