export type AiVisibilityObservationEvidence = {
  id: string;
  observedAt: string;
  engine: string;
  engineModel: string | null;
  sourceRef: string | null;
  brandMentioned: boolean;
  brandRecommended: boolean;
  answerRank: number | null;
  citedOwnDomain: boolean;
  citationCaptureComplete: boolean | null;
  competitorCaptureComplete: boolean | null;
  answerContext: string | null;
  observationSurface: string | null;
  provider: string | null;
  prompt: {
    id: string;
    promptClass: string;
    promptText: string;
    topic: string | null;
    locale: string;
    market: string;
    status: string;
  };
  competitorMentions: Array<{
    competitorId: string;
    name: string;
    domain: string | null;
    mentioned: boolean;
    recommended: boolean;
    answerRank: number | null;
  }>;
  citations: Array<{
    id: string;
    sourceDomain: string;
    citedUrl: string;
    sourceType: string;
    opportunityClass: string | null;
  }>;
};

function evidenceString(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

export async function listAiVisibilityObservationEvidence(input: {
  organisationId: string;
  limit?: number;
}): Promise<AiVisibilityObservationEvidence[]> {
  const { prisma } = await import("@dg/database");
  const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 25)));

  const rows = await prisma.aiVisibilityObservation.findMany({
    where: { organisationId: input.organisationId },
    orderBy: { observedAt: "desc" },
    take: limit,
    include: {
      prompt: {
        select: {
          id: true,
          promptClass: true,
          promptText: true,
          topic: true,
          locale: true,
          market: true,
          status: true,
        },
      },
      competitorMentions: {
        include: {
          competitor: {
            select: { id: true, name: true, domain: true },
          },
        },
      },
      citations: {
        select: {
          id: true,
          sourceDomain: true,
          citedUrl: true,
          sourceType: true,
          opportunityClass: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    observedAt: row.observedAt.toISOString(),
    engine: row.engine,
    engineModel: row.engineModel,
    sourceRef: row.sourceRef,
    brandMentioned: row.brandMentioned,
    brandRecommended: row.brandRecommended,
    answerRank: row.answerRank,
    citedOwnDomain: row.citedOwnDomain,
    citationCaptureComplete: row.citationCaptureComplete,
    competitorCaptureComplete: row.competitorCaptureComplete,
    answerContext: row.answerContext,
    observationSurface: evidenceString(row.evidence, "observationSurface"),
    provider: evidenceString(row.evidence, "provider"),
    prompt: row.prompt,
    competitorMentions: row.competitorMentions.map((mention) => ({
      competitorId: mention.competitor.id,
      name: mention.competitor.name,
      domain: mention.competitor.domain,
      mentioned: mention.mentioned,
      recommended: mention.recommended,
      answerRank: mention.answerRank,
    })),
    citations: row.citations,
  }));
}
