import {
  getAiVisibilityIntelligenceSnapshot,
  listAiVisibilityCompetitors,
  listAiVisibilityPrompts,
  recordAiVisibilityObservation,
} from "./index";

export type AiVisibilityMonitoringObservation = {
  promptId: string;
  engine: string;
  engineModel?: string | null;
  observedAt?: string | Date;
  brandMentioned: boolean;
  brandRecommended?: boolean;
  answerRank?: number | null;
  citedOwnDomain?: boolean;
  citationCaptureComplete?: boolean | null;
  competitorCaptureComplete?: boolean | null;
  answerContext?: string | null;
  sourceRef: string;
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
};

export type AiVisibilityMonitoringBatch = {
  source: string;
  capturedAt?: string | Date;
  observations: AiVisibilityMonitoringObservation[];
};

export async function getAiVisibilityMonitoringPlan(organisationId: string) {
  const [prompts, competitors, snapshot] = await Promise.all([
    listAiVisibilityPrompts(organisationId),
    listAiVisibilityCompetitors(organisationId),
    getAiVisibilityIntelligenceSnapshot(organisationId),
  ]);

  return {
    prompts: prompts.filter((item) => item.status === "active"),
    competitors: competitors.filter((item) => item.status === "active"),
    evidenceCoverage: snapshot.evidenceCoverage,
    lastObservedAt: snapshot.lastObservedAt,
    contract: {
      evidenceOnly: true,
      sourceRefRequired: true,
      missingEvidenceIsUnavailable: true,
      citationCompletenessMustBeExplicit: true,
      competitorCompletenessMustBeExplicit: true,
    },
  };
}

export async function ingestAiVisibilityMonitoringBatch(input: {
  organisationId: string;
  batch: AiVisibilityMonitoringBatch;
}) {
  const source = input.batch.source.trim();
  if (!source) throw new Error("Monitoring source is required");
  if (!input.batch.observations.length) throw new Error("At least one monitoring observation is required");
  if (input.batch.observations.length > 100) throw new Error("Monitoring batch exceeds 100 observations");

  const plan = await getAiVisibilityMonitoringPlan(input.organisationId);
  const promptIds = new Set(plan.prompts.map((item) => item.id));
  const competitorIds = new Set(plan.competitors.map((item) => item.id));
  const capturedAt = input.batch.capturedAt ? new Date(input.batch.capturedAt) : new Date();
  if (Number.isNaN(capturedAt.getTime())) throw new Error("capturedAt is invalid");

  for (const observation of input.batch.observations) {
    if (!promptIds.has(observation.promptId)) {
      throw new Error("Monitoring observation references a prompt that is not active for this organisation");
    }
    if (!observation.sourceRef?.trim()) {
      throw new Error("Every monitoring observation requires a sourceRef for provenance");
    }
    for (const mention of observation.competitorMentions ?? []) {
      if (!competitorIds.has(mention.competitorId)) {
        throw new Error("Monitoring observation references a competitor that is not active for this organisation");
      }
    }
    for (const citation of observation.citations ?? []) {
      if (!citation.citedUrl?.trim()) throw new Error("Captured citations require citedUrl");
      if (citation.competitorId && !competitorIds.has(citation.competitorId)) {
        throw new Error("Monitoring citation references a competitor that is not active for this organisation");
      }
    }
  }

  const results = [];
  for (const observation of input.batch.observations) {
    const observedAt = observation.observedAt ? new Date(observation.observedAt) : capturedAt;
    if (Number.isNaN(observedAt.getTime())) throw new Error("observedAt is invalid");

    results.push(
      await recordAiVisibilityObservation({
        organisationId: input.organisationId,
        promptId: observation.promptId,
        engine: observation.engine,
        engineModel: observation.engineModel,
        observedAt,
        brandMentioned: observation.brandMentioned,
        brandRecommended: observation.brandRecommended,
        answerRank: observation.answerRank,
        citedOwnDomain: observation.citedOwnDomain,
        citationCaptureComplete: observation.citationCaptureComplete,
        competitorCaptureComplete: observation.competitorCaptureComplete,
        answerContext: observation.answerContext,
        sourceRef: observation.sourceRef,
        evidence: {
          ...observation.evidence,
          monitoringSource: source,
          capturedAt: capturedAt.toISOString(),
        },
        competitorMentions: observation.competitorMentions,
        citations: observation.citations,
      }),
    );
  }

  return {
    source,
    accepted: results.length,
    observationIds: results.map((item) => item.id),
    snapshot: await getAiVisibilityIntelligenceSnapshot(input.organisationId),
  };
}
