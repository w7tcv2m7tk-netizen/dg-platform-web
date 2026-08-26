import { NextResponse } from "next/server";
import { assertEntitlement, executeAiTool, getAiTool } from "@dg/platform-core";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

/**
 * POST /api/v1/ai/tools/execute
 * Human-approved AI tool execution — DigitalGate owns the write, not the model.
 */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const gate = await assertEntitlement(session.organisationId, "useAi");
  if (!gate.ok) {
    return NextResponse.json(
      {
        error: {
          code: gate.code,
          message: gate.message,
          entitlement: gate.entitlement.level,
        },
      },
      { status: 403 },
    );
  }

  let body: {
    toolId?: string;
    confirmed?: boolean;
    recommendationId?: string;
    correlationId?: string;
    params?: {
      title?: string;
      description?: string;
      priority?: string;
      dueAt?: string | null;
      entityType?: string;
      entityId?: string;
    };
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const toolId = body.toolId?.trim();
  if (!toolId) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "toolId is required" } },
      { status: 422 },
    );
  }

  if (!getAiTool(toolId)) {
    return NextResponse.json(
      { error: { code: "unknown_tool", message: `Unknown tool: ${toolId}` } },
      { status: 404 },
    );
  }

  const result = await executeAiTool({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    toolId,
    confirmed: body.confirmed === true,
    recommendationId: body.recommendationId,
    correlationId: body.correlationId,
    params: body.params,
  });

  if (!result.ok) {
    const status =
      result.code === "approval_required"
        ? 409
        : result.code === "forbidden"
          ? 403
          : result.code === "unknown_tool"
            ? 404
            : result.code === "validation_error"
              ? 422
              : 500;
    return NextResponse.json(
      {
        error: {
          code: result.code,
          message: result.message,
          toolId: result.tool?.id,
          correlationId: result.correlationId,
        },
      },
      { status },
    );
  }

  return NextResponse.json({
    data: {
      toolId: result.tool.id,
      correlationId: result.correlationId,
      result: result.result,
    },
  });
}
