/**
 * AI usage / action ledger — recommendation → approval → tool → result → outcome.
 * Persists via Activity + AuditLog so quality signals stay organisation-scoped
 * without introducing a parallel analytics authority.
 * @see docs/ai/AI-ARCHITECTURE.md
 */

import type { Prisma } from "@dg/database";

import { createActivity } from "../activities";
import { writeAuditLog } from "../audit";

export type AiLedgerEventType =
  | "ai.recommendation"
  | "ai.recommendation_viewed"
  | "ai.approved"
  | "ai.rejected"
  | "ai.feedback_useful"
  | "ai.feedback_not_useful"
  | "ai.tool_executed"
  | "ai.tool_failed"
  | "ai.action_completed"
  | "ai.outcome_observed"
  | "ai.assist_generated";

export type RecordAiLedgerEventInput = {
  organisationId: string;
  actorId?: string;
  actorType?: "user" | "system" | "connector";
  eventType: AiLedgerEventType;
  title: string;
  body?: string;
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
    ...(input.actorType ? { actorType: input.actorType } : {}),
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
    actorType: input.actorType ?? (input.actorId ? "user" : "system"),
    action:
      input.eventType.includes("failed") ||
      input.eventType.includes("rejected") ||
      input.eventType.includes("feedback") ||
      input.eventType.includes("completed") ||
      input.eventType.includes("outcome")
        ? "update"
        : "create",
    entityType: "AiInteraction",
    entityId: input.correlationId,
    changes: metadata as Prisma.InputJsonValue,
  });

  return activity;
}

/** Idempotently writes durable local inference outbox events into the existing tenant activity/audit ledger. */
export async function deliverAiAccountingOutbox(limit = 50) {
  if (!process.env.DATABASE_URL) return { delivered: 0, retried: 0 };
  const { prisma } = await import("@dg/database");
  const due = await prisma.aiAccountingOutbox.findMany({ where: { deliveredAt: null,
    OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] }, orderBy: { createdAt: "asc" }, take: Math.min(Math.max(limit, 1), 100), select: { id: true } });
  let delivered = 0;
  let retried = 0;
  for (const candidate of due) {
    try {
      const didDeliver = await prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: string; job_id: string; organisation_id: string; event_type: string; event_key: string; payload: Record<string, unknown>; delivery_attempts: number }>>`
          SELECT "id", "job_id", "organisation_id", "event_type", "event_key", "payload", "delivery_attempts"
          FROM "ai_accounting_outbox" WHERE "id" = ${candidate.id} AND "delivered_at" IS NULL
            AND ("next_attempt_at" IS NULL OR "next_attempt_at" <= (NOW() AT TIME ZONE 'UTC')) FOR UPDATE SKIP LOCKED`;
        const event = locked[0];
        if (!event) return false;
        const payload = event.payload ?? {};
        const correlationId = event.event_key;
        const metadata = { eventType: event.event_type, actorType: "system", correlationId, toolId: null, recommendationId: null,
          provider: "ollama", model: "dg-fast:latest", latencyMs: null, tokensIn: payload.tokensIn ?? null,
          tokensOut: payload.tokensOut ?? null, result: { ...payload, accountingEventKey: event.event_key }, error: null } as Prisma.InputJsonValue;
        await tx.activity.create({ data: { organisationId: event.organisation_id, entityType: "AiInteraction", entityId: correlationId,
          activityType: event.event_type, title: "AI Gateway local draft", sourceApp: "ai", metadata } });
        await tx.auditLog.create({ data: { organisationId: event.organisation_id, actorType: "system", action: "create",
          entityType: "AiInteraction", entityId: correlationId, changes: metadata } });
        await tx.aiAccountingOutbox.update({ where: { id: event.id }, data: { deliveredAt: new Date(),
          deliveryAttempts: { increment: 1 }, nextAttemptAt: null } });
        return true;
      });
      if (didDeliver) delivered += 1;
    } catch {
      const row = await prisma.aiAccountingOutbox.findUnique({ where: { id: candidate.id }, select: { deliveryAttempts: true } });
      const attempts = Math.min((row?.deliveryAttempts ?? 0) + 1, 30);
      const delayMs = Math.min(60 * 60_000, 2 ** attempts * 1_000);
      await prisma.$executeRaw`UPDATE "ai_accounting_outbox" SET "delivery_attempts" = LEAST("delivery_attempts" + 1, 2147483647),
        "next_attempt_at" = ${new Date(Date.now() + delayMs)} WHERE "id" = ${candidate.id} AND "delivered_at" IS NULL`;
      retried += 1;
    }
  }
  return { delivered, retried };
}

export type AiFeedbackRating = "useful" | "not_useful";

export async function recordAiFeedback(input: {
  organisationId: string;
  actorId?: string;
  correlationId: string;
  recommendationId?: string;
  rating: AiFeedbackRating;
  note?: string;
}) {
  return recordAiLedgerEvent({
    organisationId: input.organisationId,
    actorId: input.actorId,
    correlationId: input.correlationId,
    recommendationId: input.recommendationId,
    eventType: input.rating === "useful" ? "ai.feedback_useful" : "ai.feedback_not_useful",
    title: input.rating === "useful" ? "AI recommendation marked useful" : "AI recommendation marked not useful",
    body: input.note?.trim() || undefined,
    result: { rating: input.rating },
  });
}

export type AiQualityMetrics = {
  windowDays: number;
  recommendations: number;
  approved: number;
  rejected: number;
  toolExecuted: number;
  toolFailed: number;
  assistsGenerated: number;
  usefulFeedback: number;
  notUsefulFeedback: number;
  openAiTasks: number;
  completedAiTasks: number;
  acceptanceRate: number | null;
  executionSuccessRate: number | null;
  completionRate: number | null;
  usefulnessRate: number | null;
};

function rate(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 100);
}

export async function getAiQualityMetrics(input: {
  organisationId: string;
  windowDays?: number;
}): Promise<AiQualityMetrics> {
  const { prisma } = await import("@dg/database");
  const windowDays = Math.min(Math.max(input.windowDays ?? 30, 1), 365);
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [activities, tasks] = await Promise.all([
    prisma.activity.findMany({
      where: {
        organisationId: input.organisationId,
        sourceApp: "ai",
        createdAt: { gte: since },
      },
      select: { activityType: true },
    }),
    prisma.task.findMany({
      where: {
        organisationId: input.organisationId,
        sourceApp: "ai",
        createdAt: { gte: since },
      },
      select: { status: true, completedAt: true },
    }),
  ]);

  const count = (eventType: AiLedgerEventType) =>
    activities.filter((activity) => activity.activityType === eventType).length;

  const recommendations = count("ai.recommendation");
  const approved = count("ai.approved");
  const rejected = count("ai.rejected");
  const toolExecuted = count("ai.tool_executed");
  const toolFailed = count("ai.tool_failed");
  const assistsGenerated = count("ai.assist_generated");
  const usefulFeedback = count("ai.feedback_useful");
  const notUsefulFeedback = count("ai.feedback_not_useful");
  const completedAiTasks = tasks.filter(
    (task) => Boolean(task.completedAt) || task.status === "completed",
  ).length;
  const openAiTasks = tasks.filter((task) => task.status === "open").length;

  return {
    windowDays,
    recommendations,
    approved,
    rejected,
    toolExecuted,
    toolFailed,
    assistsGenerated,
    usefulFeedback,
    notUsefulFeedback,
    openAiTasks,
    completedAiTasks,
    acceptanceRate: rate(approved, approved + rejected),
    executionSuccessRate: rate(toolExecuted, toolExecuted + toolFailed),
    completionRate: rate(completedAiTasks, openAiTasks + completedAiTasks),
    usefulnessRate: rate(usefulFeedback, usefulFeedback + notUsefulFeedback),
  };
}

export async function getAiLearningContext(input: {
  organisationId: string;
  limit?: number;
}): Promise<string> {
  const { prisma } = await import("@dg/database");
  const tasks = await prisma.task.findMany({
    where: {
      organisationId: input.organisationId,
      sourceApp: "ai",
    },
    orderBy: { updatedAt: "desc" },
    take: Math.min(Math.max(input.limit ?? 12, 1), 25),
    select: {
      title: true,
      status: true,
      priority: true,
      dueAt: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (tasks.length === 0) return "";

  const lines = tasks.map((task, index) => {
    const completed = task.completedAt
      ? `completed ${task.completedAt.toISOString()}`
      : task.status === "open" && task.dueAt
        ? `open; due ${task.dueAt.toISOString()}`
        : task.status;
    return `${index + 1}. ${task.title} — ${completed}${task.priority ? `; priority ${task.priority}` : ""}`;
  });

  return [
    "RECENT AIDA ACTION OUTCOMES",
    "Use these persisted outcomes when deciding what to recommend next. Do not describe completed work as still pending unless current business evidence independently shows the issue remains.",
    ...lines,
  ].join("\n");
}
