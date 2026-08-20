import { processElevenLabsToolCall, verifyAgentToolRequest } from "@dg/platform-core";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (!verifyAgentToolRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const result = await processElevenLabsToolCall(payload);
  return NextResponse.json({ data: result });
}
