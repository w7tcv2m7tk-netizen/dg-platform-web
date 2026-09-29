import { NextResponse } from "next/server";
import { listOpenSupportConversations } from "@dg/platform-core";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

export async function GET() {
  try {
    await requirePlatformOperatorContext();
  } catch {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Platform operator access required" } },
      { status: 403 },
    );
  }
  const conversations = await listOpenSupportConversations({ status: "open", limit: 200 });
  return NextResponse.json({ data: { count: conversations.length } });
}
