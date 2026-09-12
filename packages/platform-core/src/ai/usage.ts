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
    actorType: input.actorId ? "user" : "system",
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

/**
 * Quality telemetry answers whether Aida's advice is accepted, executes, and
 * turns into completed business work — not merely whether the model responded.
 */
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
    (task) => Boolean(task.completedAt) || task.status === "completed" || task.status === "done",
  ).length;
  const openAiTasks = Math.max(0, tasks.length - completedAiTasks);

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
    completionRate: rate(completedAiTasks, tasks.length),
    usefulnessRate: rate(usefulFeedback, usefulFeedback + notUsefulFeedback),
  };
}

/**
 * Close the practical Learn loop for Advisor reasoning.
 * AI-created tasks are durable business outcomes: future Advisor turns can see
 * whether previously approved work is still open or was completed, rather than
 * repeatedly reasoning as though no action has happened.
 */
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
