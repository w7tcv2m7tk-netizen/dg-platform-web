import type { Prisma } from "@dg/database";

export const AI_VISIBILITY_PROMPT_CLASSES = [
  "branded",
  "category",
  "commercial_intent",
  "comparison",
  "recommendation",
  "local",
  "problem_solution",
  "informational",
] as const;

export type AiVisibilityPromptClass = (typeof AI_VISIBILITY_PROMPT_CLASSES)[number];

export type AiVisibilityEvidenceDimension = {
  id: "ai_presence" | "authority" | "citation_strength" | "competitive_share";
  label: string;
  value: number | null;
  available: boolean;
  evidenceCount: number;
  coverage: string;
  explanation: string;
  lastUpdated: string | null;
  evidenceSource: string;
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normaliseDomain(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return trimmed.toLowerCase().replace(/^www\./, "").replace(/\/$/, "") || null;
  }
}

function safePromptClass(value: string): AiVisibilityPromptClass {
  if ((AI_VISIBILITY_PROMPT_CLASSES as readonly string[]).includes(value)) {
    return value as AiVisibilityPromptClass;
  }
  throw new Error(`Unsupported AI Visibility prompt class: ${value}`);
}

export async function listAiVisibilityPrompts(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const rows = await prisma.aiVisibilityPrompt.findMany({
    where: { organisationId },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function createAiVisibilityPrompt(input: {
  organisationId: string;
  promptClass: AiVisibilityPromptClass | string;
  promptText: string;
  topic?: string | null;
  locale?: string;
  market?: string;
  source?: string;
  rationale?: string | null;
  metadata?: Record<string, unknown>;
  actorId?: string;
}) {
  const { prisma } = await import("@dg/database");
  const promptText = input.promptText.trim();
  if (!promptText) throw new Error("Prompt text is required");
  if (promptText.length > 1000) throw new Error("Prompt text is too long");

  const row = await prisma.aiVisibilityPrompt.create({
    data: {
      organisationId: input.organisationId,
      promptClass: safePromptClass(input.promptClass),
      promptText,
      topic: input.topic?.trim() || null,
      locale: input.locale?.trim() || "en-AU",
      market: input.market?.trim() || "AU",
      source: input.source?.trim() || "manual",
      rationale: input.rationale?.trim() || null,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      createdBy: input.actorId ?? null,
    },
  });

  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

export async function setAiVisibilityPromptStatus(input: {
  organisationId: string;
  promptId: string;
  status: "active" | "paused" | "archived";
}) {
  const { prisma } = await import("@dg/database");
  const updated = await prisma.aiVisibilityPrompt.updateMany({
    where: { id: input.promptId, organisationId: input.organisationId },
    data: { status: input.status },
  });
  if (updated.count !== 1) throw new Error("AI Visibility prompt not found");
}

export async function listAiVisibilityCompetitors(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const rows = await prisma.aiVisibilityCompetitor.findMany({
    where: { organisationId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function createAiVisibilityCompetitor(input: {
  organisationId: string;
  name: string;
  domain?: string | null;
  source?: string;
  rationale?: string | null;
  metadata?: Record<string, unknown>;
  actorId?: string;
}) {
  const { prisma } = await import("@dg/database");
  const name = input.name.trim();
  if (!name) throw new Error("Competitor name is required");

  const row = await prisma.aiVisibilityCompetitor.create({
    data: {
      organisationId: input.organisationId,
      name,
      domain: normaliseDomain(input.domain),
      source: input.source?.trim() || "manual",
      rationale: input.rationale?.trim() || null,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      createdBy: input.actorId ?? null,
    },
  });

  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

export async function setAiVisibilityCompetitorStatus(input: {
  organisationId: string;
  competitorId: string;
  status: "active" | "paused" | "archived";
}) {
  const { prisma } = await import("@dg/database");
  const updated = await prisma.aiVisibilityCompetitor.updateMany({
    where: { id: input.competitorId, organisationId: input.organisationId },
    data: { status: input.status },
  });
  if (updated.count !== 1) throw new Error("AI Visibility competitor not found");
}

export async function recordAiVisibilityObservation(input: {
  organisationId: string;
  promptId: string;
  engine: string;
  engineModel?: string | null;
  observedAt?: Date;
  brandMentioned: boolean;
  brandRecommended?: boolean;
  answerRank?: number | null;
  citedOwnDomain?: boolean;
  citationCaptureComplete?: boolean | null;
  competitorCaptureComplete?: boolean | null;
  answerContext?: string | null;
  sourceRef?: string | null;
  evidence?: Record<string, unknown>;
  competitorMentions?: Array<{
    competitorId: string;
    mentioned?: boolean;
    recommended?: boolean;
    answerRank?: number | null;
    context?: string | null;
  }>;
  citations?: Array<{
    citedUrl: string;
    sourceDomain?: string | null;
    sourceType?: "own" | "competitor" | "third_party" | "unknown";
    competitorId?: string | null;
    opportunityClass?: string | null;
  }>;
}) {
  const { prisma } = await import("@dg/database");
  const prompt = await prisma.aiVisibilityPrompt.findFirst({
    where: { id: input.promptId, organisationId: input.organisationId, status: { not: "archived" } },
    select: { id: true },
  });
  if (!prompt) throw new Error("AI Visibility prompt not found for organisation");

  const competitorIds = [
    ...(input.competitorMentions ?? []).map((item) => item.competitorId),
    ...(input.citations ?? []).flatMap((item) => (item.competitorId ? [item.competitorId] : [])),
  ];
  if (competitorIds.length) {
    const owned = await prisma.aiVisibilityCompetitor.count({
      where: { organisationId: input.organisationId, id: { in: [...new Set(competitorIds)] } },
    });
    if (owned !== new Set(competitorIds).size) {
      throw new Error("One or more competitors do not belong to this organisation");
    }
  }

  const observedAt = input.observedAt ?? new Date();
  const engine = input.engine.trim().toLowerCase();
  if (!engine) throw new Error("Observation engine is required");

  return prisma.$transaction(async (tx) => {
    const observation = await tx.aiVisibilityObservation.create({
      data: {
        organisationId: input.organisationId,
        promptId: input.promptId,
        engine,
        engineModel: input.engineModel?.trim() || null,
        observedAt,
        brandMentioned: input.brandMentioned,
        brandRecommended: Boolean(input.brandRecommended),
        answerRank: input.answerRank ?? null,
        citedOwnDomain: Boolean(input.citedOwnDomain),
        citationCaptureComplete: input.citationCaptureComplete ?? null,
        competitorCaptureComplete: input.competitorCaptureComplete ?? null,
        answerContext: input.answerContext?.trim() || null,
        sourceRef: input.sourceRef?.trim() || null,
        evidence: input.evidence as Prisma.InputJsonValue | undefined,
      },
    });

    if (input.competitorMentions?.length) {
      await tx.aiVisibilityCompetitorMention.createMany({
        data: input.competitorMentions.map((item) => ({
          organisationId: input.organisationId,
          observationId: observation.id,
          competitorId: item.competitorId,
          mentioned: item.mentioned ?? true,
          recommended: Boolean(item.recommended),
          answerRank: item.answerRank ?? null,
          context: item.context?.trim() || null,
        })),
      });
    }

    if (input.citations?.length) {
      await tx.aiVisibilityCitation.createMany({
        data: input.citations.map((item) => ({
          organisationId: input.organisationId,
          observationId: observation.id,
          competitorId: item.competitorId ?? null,
          sourceDomain: normaliseDomain(item.sourceDomain ?? item.citedUrl) ?? "unknown",
          citedUrl: item.citedUrl.trim(),
          sourceType: item.sourceType ?? "third_party",
          opportunityClass: item.opportunityClass?.trim() || null,
          firstSeenAt: observedAt,
          lastSeenAt: observedAt,
          frequency: 1,
        })),
      });
    }

    return {
      id: observation.id,
      promptId: observation.promptId,
      engine: observation.engine,
      observedAt: observation.observedAt.toISOString(),
    };
  });
}

export async function getAiVisibilityIntelligenceSnapshot(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const [prompts, competitors, observations] = await Promise.all([
    prisma.aiVisibilityPrompt.count({ where: { organisationId, status: "active" } }),
    prisma.aiVisibilityCompetitor.count({ where: { organisationId, status: "active" } }),
    prisma.aiVisibilityObservation.findMany({
      where: { organisationId },
      orderBy: { observedAt: "desc" },
      take: 500,
      include: { competitorMentions: true, citations: true },
    }),
  ]);

  const latest = observations[0]?.observedAt.toISOString() ?? null;
  const total = observations.length;
  const mentioned = observations.filter((row) => row.brandMentioned).length;
  const citationComplete = observations.filter((row) => row.citationCaptureComplete === true);
  const competitorComplete = observations.filter((row) => row.competitorCaptureComplete === true);
  const ownCitationObservations = citationComplete.filter((row) =>
    row.citations.some((citation) => citation.sourceType === "own"),
  ).length;
  const thirdPartyCitations = citationComplete.flatMap((row) =>
    row.citations.filter((citation) => citation.sourceType === "third_party"),
  );
  const competitorMentions = competitorComplete.flatMap((row) => row.competitorMentions);

  const presenceValue = total ? clamp((mentioned / total) * 100) : null;
  const citationValue = citationComplete.length
    ? clamp((ownCitationObservations / citationComplete.length) * 100)
    : null;
  const competitiveValue = competitorComplete.length
    ? clamp(
        (mentioned /
          Math.max(1, mentioned + competitorMentions.filter((row) => row.mentioned).length)) *
          100,
      )
    : null;
  const authorityValue = thirdPartyCitations.length
    ? clamp(
        (new Set(thirdPartyCitations.map((row) => row.sourceDomain)).size /
          thirdPartyCitations.length) *
          100,
      )
    : null;

  const dimensions: AiVisibilityEvidenceDimension[] = [
    {
      id: "ai_presence",
      label: "AI Presence",
      value: presenceValue,
      available: presenceValue != null,
      evidenceCount: total,
      coverage: total ? `${total} observed prompt response${total === 1 ? "" : "s"}` : "No monitored responses yet",
      explanation: total
        ? "Share of observed prompt responses where the organisation was explicitly mentioned."
        : "Requires real answer-engine observations before a score is available.",
      lastUpdated: latest,
      evidenceSource: "Persisted answer-engine observations",
    },
    {
      id: "authority",
      label: "Authority",
      value: authorityValue,
      available: authorityValue != null,
      evidenceCount: thirdPartyCitations.length,
      coverage: thirdPartyCitations.length
        ? `${thirdPartyCitations.length} observed third-party citation${thirdPartyCitations.length === 1 ? "" : "s"}`
        : "No verified third-party citation evidence yet",
      explanation: authorityValue != null
        ? "Evidence diversity across third-party domains cited in monitored answers."
        : "Unavailable until citation capture produces real third-party source evidence.",
      lastUpdated: latest,
      evidenceSource: "Persisted citation observations",
    },
    {
      id: "citation_strength",
      label: "Citation Strength",
      value: citationValue,
      available: citationValue != null,
      evidenceCount: citationComplete.length,
      coverage: citationComplete.length
        ? `${citationComplete.length} response${citationComplete.length === 1 ? "" : "s"} with complete citation capture`
        : "Citation capture not yet established",
      explanation: citationValue != null
        ? "Share of completely captured responses that cited the organisation's own domain."
        : "Unavailable until a monitoring source confirms citation capture completeness.",
      lastUpdated: latest,
      evidenceSource: "Persisted citation observations",
    },
    {
      id: "competitive_share",
      label: "Competitive Share",
      value: competitiveValue,
      available: competitiveValue != null,
      evidenceCount: competitorComplete.length,
      coverage: competitorComplete.length
        ? `${competitorComplete.length} response${competitorComplete.length === 1 ? "" : "s"} with complete competitor capture`
        : "Competitor capture not yet established",
      explanation: competitiveValue != null
        ? "Observed organisation mentions compared with monitored competitor mentions in responses with complete competitor capture."
        : "Unavailable until competitors are configured and monitoring confirms competitor capture completeness.",
      lastUpdated: latest,
      evidenceSource: "Persisted competitor observations",
    },
  ];

  const availableValues = dimensions.flatMap((dimension) =>
    dimension.value == null ? [] : [dimension.value],
  );

  return {
    overallScore: availableValues.length
      ? clamp(availableValues.reduce((sum, value) => sum + value, 0) / availableValues.length)
      : null,
    dimensions,
    evidenceCoverage: {
      activePrompts: prompts,
      activeCompetitors: competitors,
      observations: total,
      citationCompleteObservations: citationComplete.length,
      competitorCompleteObservations: competitorComplete.length,
    },
    lastObservedAt: latest,
  };
}

export function buildAiVisibilityPromptSuggestions(input: {
  businessName?: string | null;
  industry?: string | null;
  location?: string | null;
  services?: string[];
}): Array<{ promptClass: AiVisibilityPromptClass; promptText: string; rationale: string }> {
  const name = input.businessName?.trim();
  const industry = input.industry?.trim();
  const location = input.location?.trim();
  const service = input.services?.map((item) => item.trim()).find(Boolean);
  const suggestions: Array<{ promptClass: AiVisibilityPromptClass; promptText: string; rationale: string }> = [];

  if (name) {
    suggestions.push({
      promptClass: "branded",
      promptText: `What is ${name} and what does it offer?`,
      rationale: "Tests whether the organisation entity and offering are understood by answer engines.",
    });
  }
  if (industry) {
    suggestions.push({
      promptClass: "category",
      promptText: `Best ${industry} providers${location ? ` in ${location}` : ""}`,
      rationale: "Tests category discovery without forcing the organisation name into the prompt.",
    });
    suggestions.push({
      promptClass: "recommendation",
      promptText: `Which ${industry} provider would you recommend${location ? ` in ${location}` : ""}?`,
      rationale: "Tests recommendation visibility for a commercially meaningful category prompt.",
    });
  }
  if (service) {
    suggestions.push({
      promptClass: "commercial_intent",
      promptText: `${service}${location ? ` ${location}` : ""}`,
      rationale: "Tests a high-intent service discovery query grounded in Business Profile context.",
    });
  }

  return suggestions;
}
