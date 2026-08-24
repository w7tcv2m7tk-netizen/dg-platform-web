/**
 * AI usage / action ledger — recommendation → approval → tool → result.
 * Persists via Activity + AuditLog (no separate table required for slice v0).
 * @see docs/ai/AI-ARCHITECTURE.md
 */

import type { Prisma } from "@dg/database";

import { createActivity } from "../activities";
import { writeAuditLog } from "../audit";

export type AiLedgerEventType =
  | "ai.recommendation"
  | "ai.approved"
  | "ai.rejected"
  | "ai.tool_executed"
  | "ai.tool_failed"
  | "ai.assist_generated";

export type RecordAiLedgerEventInput = {
  organisationId: string;
  actorId?: string;
  eventType: AiLedgerEventType;
  title: string;
  body?: string;
  /** Recommendation / assist / tool correlation id */
  correlationId: string;
  toolId?: string;
  recommendationId?: string;
  provider?: string | null;
  model?: string | null;
  latencyMs?: number | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
  result?: Record<string, unknown>;
  error?: string;
};

export async function recordAiLedgerEvent(input: RecordAiLedgerEventInput) {
  const metadata = {
    eventType: input.eventType,
    correlationId: input.correlationId,
    toolId: input.toolId ?? null,
    recommendationId: input.recommendationId ?? null,
    provider: input.provider ?? null,
    model: input.model ?? null,
    latencyMs: input.latencyMs ?? null,
    tokensIn: input.tokensIn ?? null,
    tokensOut: input.tokensOut ?? null,
    result: input.result ?? null,
    error: input.error ?? null,
  };

  const activity = await createActivity({
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "AiInteraction",
    entityId: input.correlationId,
    activityType: input.eventType,
    title: input.title,
    body: input.body,
    sourceApp: "ai",
    metadata,
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    actorType: "user",
    action: input.eventType.includes("failed") || input.eventType.includes("rejected")
      ? "update"
      : "create",
    entityType: "AiInteraction",
    entityId: input.correlationId,
    changes: metadata as Prisma.InputJsonValue,
  });

  return activity;
}
