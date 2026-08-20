import { processElevenLabsToolCall, verifyAgentToolRequest } from "@dg/platform-core";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (!verifyAgentToolRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const agentId = url.searchParams.get("agentId") || url.searchParams.get("agent_id");
  const tool = url.searchParams.get("tool") || url.searchParams.get("tool_name");

  const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const result = await processElevenLabsToolCall(payload, { agentId, tool });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "tool failed", tool: result.tool, data: result },
      { status: 400 },
    );
  }
  // ElevenLabs expects a JSON body the LLM can read as the tool result
  return NextResponse.json({
    ok: true,
    tool: result.tool,
    result: result.result ?? null,
  });
}
