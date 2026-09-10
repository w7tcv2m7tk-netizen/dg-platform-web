import { NextResponse } from "next/server";
import { assertEntitlement, executeAiTool, getAiTool, taskLinkPairError } from "@dg/platform-core";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";
import { validateTaskTarget } from "@/lib/task-target-authority";

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

  const tool = getAiTool(toolId);
  if (!tool) {
    return NextResponse.json(
      { error: { code: "unknown_tool", message: `Unknown tool: ${toolId}` } },
      { status: 404 },
    );
  }

  for (const featureId of tool.requiredFeatures) {
    const denied = requireFeature(session, featureId);
    if (denied) return denied;
  }

  if (tool.id === "crm.create_follow_up_task") {
    const entityType =
      typeof body.params?.entityType === "string" ? body.params.entityType : undefined;
    const entityId =
      typeof body.params?.entityId === "string" ? body.params.entityId : undefined;
    const pairError = taskLinkPairError(entityType, entityId);
    if (pairError) {
      return NextResponse.json(
        { error: { code: pairError.code, message: pairError.message } },
        { status: 422 },
      );
    }
    if (entityType && entityId) {
      const targetDenied = await validateTaskTarget({
        session,
        entityType,
        entityId,
        requireTargetWrite: true,
      });
      if (targetDenied) return targetDenied;
    }
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
            : result.code === "validation_error" ||
                result.code === "unsupported_entity_type" ||
                result.code === "linked_contact_not_found" ||
                result.code === "linked_company_not_found" ||
                result.code === "linked_opportunity_not_found" ||
                result.code === "linked_job_not_found"
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
