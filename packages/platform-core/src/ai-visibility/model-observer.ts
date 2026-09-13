import { randomUUID } from "node:crypto";

import { llmChat } from "../ai/llm";
import {
  getOrganisationBusinessProfile,
  listAiVisibilityCompetitors,
  listAiVisibilityPrompts,
  recordAiVisibilityObservation,
} from "./index";

function normalise(value: string) {
  return value.toLocaleLowerCase("en-AU").replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ").trim();
}

function containsName(answer: string, name: string | null | undefined) {
  const needle = normalise(name ?? "");
  if (!needle || needle.length < 2) return false;
  return normalise(answer).includes(needle);
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

  const businessName = (profile?.tradingName || profile?.businessName || "").trim();
  if (!businessName) {
    throw new Error("Complete the Business Profile business name before running AI Visibility observations");
  }

  const prompts = promptRows.filter((item) => item.status === "active").slice(0, maxPrompts);
  if (!prompts.length) {
    throw new Error("Add at least one active AI Visibility prompt before running observations");
  }
  const competitors = competitorRows.filter((item) => item.status === "active");

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
      mentioned: containsName(result.text, competitor.name),
      recommended: false,
      answerRank: null,
      context: null,
    }));
    const brandMentioned = containsName(result.text, businessName);
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
        competitorCaptureMethod: competitors.length ? "literal_name_match" : "not_configured",
      },
      competitorMentions,
      citations: [],
    });

    observations.push({
      ...persisted,
      provider: result.provider,
      model: result.model,
      brandMentioned,
      competitorMentions: competitorMentions.filter((item) => item.mentioned).length,
    });
  }

  return {
    source: "model_api",
    observedBusiness: businessName,
    observations,
    limitations: [
      "These are API-model observations, not consumer ChatGPT, Gemini, Copilot or Perplexity UI rankings.",
      "Citation capture is unavailable for this runner and is therefore excluded from Citation Strength.",
      "Recommendation position is not inferred; only explicit literal brand and configured competitor mentions are captured.",
    ],
  };
}
