import { Prisma, prisma } from "@dg/database";

export const AI_RECOMMENDATION_STAGES = ["shown", "started", "completed"] as const;
export type AiRecommendationStage = (typeof AI_RECOMMENDATION_STAGES)[number];

export type AiRecommendationTelemetryInput = {
  organisationId: string;
  actorId?: string | null;
  recommendationId: string;
  stage: AiRecommendationStage;
  label?: string | null;
  impact?: string | null;
  href?: string | null;
  source?: string;
  metadata?: Record<string, unknown>;
};

function actionFor(stage: AiRecommendationStage) {
  return `ai.recommendation.${stage}`;
}

function dedupeWindowMs(stage: AiRecommendationStage) {
  if (stage === "shown") return 12 * 60 * 60 * 1000;
  if (stage === "started") return 5 * 60 * 1000;
  return 30 * 24 * 60 * 60 * 1000;
}

/**
 * Durable, organisation-scoped AI recommendation telemetry.
 * It records engagement only; it never invents business impact or completion.
 */
export async function recordAiRecommendationTelemetry(input: AiRecommendationTelemetryInput) {
  const recommendationId = input.recommendationId.trim();
  if (!recommendationId) throw new Error("recommendationId is required");

  const action = actionFor(input.stage);
  const since = new Date(Date.now() - dedupeWindowMs(input.stage));
  const existing = await prisma.auditLog.findFirst({
    where: {
      organisationId: input.organisationId,
      actorId: input.actorId ?? null,
      action,
      entityType: "ai_recommendation",
      entityId: recommendationId,
      occurredAt: { gte: since },
    },
    orderBy: { occurredAt: "desc" },
  });
  if (existing) return existing;

  return prisma.auditLog.create({
    data: {
      organisationId: input.organisationId,
      actorId: input.actorId ?? null,
      actorType: input.actorId ? "user" : "system",
      action,
      entityType: "ai_recommendation",
      entityId: recommendationId,
      changes: {
        label: input.label ?? null,
        impact: input.impact ?? null,
        href: input.href ?? null,
        source: input.source ?? "business_overview",
        ...(input.metadata ?? {}),
      } as Prisma.InputJsonValue,
    },
  });
}

export type AiRecommendationOutcomeEvidence = {
  overdueFollowUps?: number;
  overdueArCents?: number;
  activeGoalIds?: string[];
  completedGoalIds?: string[];
  aiVisibilityScore?: number | null;
  businessHealthEvidenceCoverage?: number | null;
  websiteIssueCount?: number | null;
};

function recommendationResolved(
  recommendationId: string,
  evidence: AiRecommendationOutcomeEvidence,
): boolean {
  if (recommendationId === "overdue-leads") {
    return evidence.overdueFollowUps === 0;
  }
  if (recommendationId === "overdue-ar") {
    return evidence.overdueArCents === 0;
  }
  if (recommendationId === "set-goals") {
    return Boolean(evidence.activeGoalIds?.length);
  }
  if (recommendationId.startsWith("goal-")) {
    return Boolean(evidence.completedGoalIds?.includes(recommendationId.slice(5)));
  }
  if (recommendationId === "ai-vis") {
    return typeof evidence.aiVisibilityScore === "number" && evidence.aiVisibilityScore >= 60;
  }
  if (recommendationId === "connectors") {
    return typeof evidence.businessHealthEvidenceCoverage === "number" && evidence.businessHealthEvidenceCoverage >= 80;
  }
  if (recommendationId === "website-health") {
    return evidence.websiteIssueCount === 0;
  }
  // new-leads cannot be truthfully inferred as complete from the count falling to zero;
  // the weekly window may simply have rolled over.
  return false;
}

/**
 * Reconcile started recommendations against current measured evidence.
 * A completion event is emitted only where the platform can prove resolution.
 */
export async function reconcileAiRecommendationOutcomes(input: {
  organisationId: string;
  evidence: AiRecommendationOutcomeEvidence;
}) {
  const started = await prisma.auditLog.findMany({
    where: {
      organisationId: input.organisationId,
      action: "ai.recommendation.started",
      entityType: "ai_recommendation",
      occurredAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { occurredAt: "desc" },
    take: 250,
  });

  const latestByRecommendation = new Map<string, (typeof started)[number]>();
  for (const event of started) {
    if (!latestByRecommendation.has(event.entityId)) {
      latestByRecommendation.set(event.entityId, event);
    }
  }

  let completed = 0;
  for (const [recommendationId, event] of latestByRecommendation) {
    if (!recommendationResolved(recommendationId, input.evidence)) continue;
    const alreadyCompleted = await prisma.auditLog.findFirst({
      where: {
        organisationId: input.organisationId,
        action: "ai.recommendation.completed",
        entityType: "ai_recommendation",
        entityId: recommendationId,
        occurredAt: { gte: event.occurredAt },
      },
      select: { id: true },
    });
    if (alreadyCompleted) continue;

    await recordAiRecommendationTelemetry({
      organisationId: input.organisationId,
      actorId: null,
      recommendationId,
      stage: "completed",
      source: "evidence_reconciliation",
      metadata: {
        startedAt: event.occurredAt.toISOString(),
        completionBasis: "measured_state_resolved",
      },
    });
    completed += 1;
  }
  return completed;
}

export async function getAiRecommendationTelemetrySummary(input: {
  organisationId: string;
  days?: number;
}) {
  const days = Math.max(1, Math.min(input.days ?? 30, 365));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.auditLog.groupBy({
    by: ["action"],
    where: {
      organisationId: input.organisationId,
      entityType: "ai_recommendation",
      action: { in: AI_RECOMMENDATION_STAGES.map(actionFor) },
      occurredAt: { gte: since },
    },
    _count: { _all: true },
  });
  const counts = new Map(rows.map((row) => [row.action, row._count._all]));
  const shown = counts.get("ai.recommendation.shown") ?? 0;
  const started = counts.get("ai.recommendation.started") ?? 0;
  const completed = counts.get("ai.recommendation.completed") ?? 0;

  return {
    days,
    shown,
    started,
    completed,
    startRate: shown > 0 ? Math.round((started / shown) * 100) : null,
    completionRate: started > 0 ? Math.round((completed / started) * 100) : null,
    note: "Completion is counted only when current platform evidence proves the recommended state was resolved.",
  };
}
