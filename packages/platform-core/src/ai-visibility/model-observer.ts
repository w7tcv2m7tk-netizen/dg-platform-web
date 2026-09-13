import { randomUUID } from "node:crypto";

import { llmChat } from "../ai/llm";
import { getOrganisationBusinessProfile } from "../org/onboarding-profile";
import {
  listAiVisibilityCompetitors,
  listAiVisibilityPrompts,
  recordAiVisibilityObservation,
} from "./index";

function normaliseForEntityMatch(value: string) {
  return value
    .toLocaleLowerCase("en-AU")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsEntityName(answer: string, name: string | null | undefined) {
  const needle = normaliseForEntityMatch(name ?? "");
  if (!needle || needle.length < 2) return false;
  const haystack = normaliseForEntityMatch(answer);
  return ` ${haystack} `.includes(` ${needle} `);
}

function engineFromResult(provider: string, model: string) {
  if (provider === "gateway" && model.includes("/")) {
    return `model-api:${model.split("/", 1)[0]}`;
  }
  return `model-api:${provider}`;
}

export async function runAiVisibilityModelObservations(input: {
  organisationId: string;
  actorId?: string | null;
  maxPrompts?: number;
}) {
  const maxPrompts = Math.max(1, Math.min(10, Math.floor(input.maxPrompts ?? 3)));
  const [profile, promptRows, competitorRows] = await Promise.all([
    getOrganisationBusinessProfile(input.organisationId),
    listAiVisibilityPrompts(input.organisationId),
    listAiVisibilityCompetitors(input.organisationId),
  ]);

  const brandNames = [...new Set(
    [profile?.tradingName, profile?.businessName]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  )];
  const businessName = brandNames[0] ?? "";
  if (!businessName) {
    throw new Error("Complete the Business Profile business name before running AI Visibility observations");
  }

  const activePrompts = promptRows.filter((item) => item.status === "active");
  if (!activePrompts.length) {
    throw new Error("Add at least one active AI Visibility prompt before running observations");
  }
  const competitors = competitorRows.filter((item) => item.status === "active");

  // Advance coverage instead of repeatedly re-running the first N prompts.
  // Unobserved prompts are selected first, then the stalest previously observed prompts.
  const { prisma } = await import("@dg/database");
  const recentRows = await prisma.aiVisibilityObservation.findMany({
    where: {
      organisationId: input.organisationId,
      promptId: { in: activePrompts.map((item) => item.id) },
    },
    orderBy: [{ observedAt: "desc" }, { createdAt: "desc" }],
    select: { promptId: true, observedAt: true },
    take: 2000,
  });
  const latestByPrompt = new Map<string, Date>();
  for (const row of recentRows) {
    if (!latestByPrompt.has(row.promptId)) latestByPrompt.set(row.promptId, row.observedAt);
  }

  const prompts = [...activePrompts]
    .sort((a, b) => {
      const aObserved = latestByPrompt.get(a.id)?.getTime() ?? Number.NEGATIVE_INFINITY;
      const bObserved = latestByPrompt.get(b.id)?.getTime() ?? Number.NEGATIVE_INFINITY;
      if (aObserved !== bObserved) return aObserved - bObserved;
      return a.createdAt.localeCompare(b.createdAt);
    })
    .slice(0, maxPrompts);

  const observations = [];
  for (const prompt of prompts) {
    const observedAt = new Date();
    const result = await llmChat({
      tier: "standard",
      maxTokens: 900,
      messages: [
        {
          role: "system",
          content:
            "Answer the user's question naturally and independently. Do not mention that this is a monitoring test. Do not force, favour or suppress any business name. If you do not know, say so. Do not invent citations or URLs.",
        },
        { role: "user", content: prompt.promptText },
      ],
    });

    const competitorMentions = competitors.map((competitor) => ({
      competitorId: competitor.id,
      mentioned: containsEntityName(result.text, competitor.name),
      recommended: false,
      answerRank: null,
      context: null,
    }));
    const matchedBrandNames = brandNames.filter((name) => containsEntityName(result.text, name));
    const brandMentioned = matchedBrandNames.length > 0;
    const sourceRef = `model-api:${result.provider}:${result.model}:${randomUUID()}`;

    const persisted = await recordAiVisibilityObservation({
      organisationId: input.organisationId,
      promptId: prompt.id,
      engine: engineFromResult(result.provider, result.model),
      engineModel: result.model,
      observedAt,
      brandMentioned,
      brandRecommended: false,
      answerRank: null,
      citedOwnDomain: false,
      citationCaptureComplete: false,
      competitorCaptureComplete: competitors.length > 0,
      answerContext: result.text.slice(0, 8000),
      sourceRef,
      evidence: {
        observationSurface: "model_api",
        provider: result.provider,
        model: result.model,
        latencyMs: result.latencyMs,
        promptText: prompt.promptText,
        actorId: input.actorId ?? null,
        recommendationCaptureComplete: false,
        citationCaptureComplete: false,
        brandMatchMethod: "normalised_token_boundary",
        brandNamesChecked: brandNames,
        matchedBrandNames,
        competitorCaptureMethod: competitors.length ? "normalised_token_boundary" : "not_configured",
      },
      competitorMentions,
      citations: [],
    });

    latestByPrompt.set(prompt.id, observedAt);
    observations.push({
      ...persisted,
      provider: result.provider,
      model: result.model,
      brandMentioned,
      competitorMentions: competitorMentions.filter((item) => item.mentioned).length,
    });
  }

  const observedPromptCount = activePrompts.filter((item) => latestByPrompt.has(item.id)).length;

  return {
    source: "model_api",
    observedBusiness: businessName,
    observations,
    coverage: {
      activePrompts: activePrompts.length,
      observedPrompts: observedPromptCount,
      remainingUnobserved: Math.max(0, activePrompts.length - observedPromptCount),
      batchSize: observations.length,
    },
    limitations: [
      "These are API-model observations, not consumer ChatGPT, Gemini, Copilot or Perplexity UI rankings.",
      "Citation capture is unavailable for this runner and is therefore excluded from Citation Strength.",
      "Recommendation position is not inferred; explicit business and configured competitor mentions are captured using normalised token-boundary matching.",
    ],
  };
}
