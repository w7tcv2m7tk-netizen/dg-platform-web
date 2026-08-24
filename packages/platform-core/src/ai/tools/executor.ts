/**
 * AI Tool Executor — DigitalGate executes; the model only proposes.
 * @see docs/ai/AI-ARCHITECTURE.md
 */

import { createTask } from "../tasks";
import { getAiTool, type AiToolDefinition } from "./registry";
import { recordAiLedgerEvent } from "../usage";

export type AiToolExecuteInput = {
  organisationId: string;
  actorId?: string;
  toolId: string;
  /** Must be true when tool.requiresApproval */
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

export type AiToolExecuteResult =
  | {
      ok: true;
      tool: AiToolDefinition;
      correlationId: string;
      result: Record<string, unknown>;
    }
  | {
      ok: false;
      code:
        | "unknown_tool"
        | "approval_required"
        | "forbidden"
        | "validation_error"
        | "execution_error";
      message: string;
      tool?: AiToolDefinition;
      correlationId?: string;
    };

function newCorrelationId() {
  return `ai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function executeAiTool(
  input: AiToolExecuteInput,
): Promise<AiToolExecuteResult> {
  const tool = getAiTool(input.toolId);
  if (!tool) {
    return {
      ok: false,
      code: "unknown_tool",
      message: `Unknown AI tool: ${input.toolId}`,
    };
  }

  const correlationId = input.correlationId?.trim() || newCorrelationId();

  if (tool.requiresApproval && input.confirmed !== true) {
    await recordAiLedgerEvent({
      organisationId: input.organisationId,
      actorId: input.actorId,
      eventType: "ai.recommendation",
      title: `AI proposed: ${tool.label}`,
      body: "Awaiting human approval before DigitalGate executes.",
      correlationId,
      toolId: tool.id,
      recommendationId: input.recommendationId,
      result: { params: input.params ?? {} },
    });
    return {
      ok: false,
      code: "approval_required",
      message: "Confirm this action to let DigitalGate execute it.",
      tool,
      correlationId,
    };
  }

  if (tool.requiresApproval && input.confirmed === true) {
    await recordAiLedgerEvent({
      organisationId: input.organisationId,
      actorId: input.actorId,
      eventType: "ai.approved",
      title: `AI action approved: ${tool.label}`,
      correlationId,
      toolId: tool.id,
      recommendationId: input.recommendationId,
    });
  }

  try {
    let result: Record<string, unknown>;

    if (tool.id === "crm.create_follow_up_task") {
      const title =
        input.params?.title?.trim() ||
        "Follow up on overdue enquiries (AI Advisor)";
      if (!title) {
        return {
          ok: false,
          code: "validation_error",
          message: "Task title is required.",
          tool,
          correlationId,
        };
      }
      const task = await createTask({
        organisationId: input.organisationId,
        actorId: input.actorId,
        title,
        description:
          input.params?.description?.trim() ||
          "Created from AI Advisor recommendation. DigitalGate executed this tool after your approval.",
        priority: input.params?.priority?.trim() || "high",
        dueAt: input.params?.dueAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
        entityType: input.params?.entityType,
        entityId: input.params?.entityId,
        sourceApp: "ai",
        metadata: {
          aiToolId: tool.id,
          recommendationId: input.recommendationId ?? null,
          correlationId,
        },
      });
      result = { taskId: task.id, title: task.title, status: task.status };
    } else {
      return {
        ok: false,
        code: "unknown_tool",
        message: `Tool registered but not implemented: ${tool.id}`,
        tool,
        correlationId,
      };
    }

    await recordAiLedgerEvent({
      organisationId: input.organisationId,
      actorId: input.actorId,
      eventType: "ai.tool_executed",
      title: `AI tool executed: ${tool.label}`,
      body: typeof result.title === "string" ? String(result.title) : undefined,
      correlationId,
      toolId: tool.id,
      recommendationId: input.recommendationId,
      result,
    });

    return { ok: true, tool, correlationId, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool execution failed";
    await recordAiLedgerEvent({
      organisationId: input.organisationId,
      actorId: input.actorId,
      eventType: "ai.tool_failed",
      title: `AI tool failed: ${tool.label}`,
      body: message,
      correlationId,
      toolId: tool.id,
      recommendationId: input.recommendationId,
      error: message,
    });
    return {
      ok: false,
      code: "execution_error",
      message,
      tool,
      correlationId,
    };
  }
}
