/**
 * Optional LLM overlay on the rule-based Founding implementation plan.
 * Submit always keeps the deterministic plan if the model fails.
 */

import { llmChat, llmConfigured } from "../ai/llm";
import type { FoundingImplementationRecord, FoundingOnboardingAnswers } from "./types";

type LlmPlanOverlay = {
  analysis?: string;
  firstAutomation?: string;
  ninetyDayPriorities?: string[];
  recommendedCore?: string[];
  recommendedGrowth?: string[];
  recommendedIndustry?: string[];
  connectors?: string[];
};

function stringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, max);
}

function parseOverlay(text: string): LlmPlanOverlay | null {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const json = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const analysis = typeof json.analysis === "string" ? json.analysis.trim() : "";
    const firstAutomation =
      typeof json.firstAutomation === "string" ? json.firstAutomation.trim() : "";
    return {
      analysis: analysis || undefined,
      firstAutomation: firstAutomation || undefined,
      ninetyDayPriorities: stringList(json.ninetyDayPriorities, 5),
      recommendedCore: stringList(json.recommendedCore, 8),
      recommendedGrowth: stringList(json.recommendedGrowth, 8),
      recommendedIndustry: stringList(json.recommendedIndustry, 4),
      connectors: stringList(json.connectors, 8),
    };
  } catch {
    return null;
  }
}

export async function enrichImplementationPlanWithLlm(input: {
  plan: FoundingImplementationRecord;
  answers: FoundingOnboardingAnswers;
}): Promise<FoundingImplementationRecord> {
  if (!llmConfigured()) return input.plan;

  try {
    const result = await llmChat({
      tier: "reasoning",
      maxTokens: 1600,
      signal: AbortSignal.timeout(12_000),
      messages: [
        {
          role: "system",
          content: [
            "You are DigitalGate implementation analysis for Founding 10 customers.",
            "Australian English. Be concrete. Do not invent products they did not mention.",
            "Recommend from DigitalGate capabilities: CRM, Contacts, Opportunities, Tasks, Calendar,",
            "Real Estate, Accommodation, Websites, Commerce, SEO, AI Visibility, Automation,",
            "Marketing, Reviews, Infrastructure.",
            "Respond with JSON only:",
            '{"analysis":"2-4 short paragraphs","firstAutomation":"one workflow sentence","ninetyDayPriorities":["..."],"recommendedCore":["..."],"recommendedGrowth":["..."],"recommendedIndustry":["..."],"connectors":["..."]}',
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            "Produce a DigitalGate Implementation Recommendation from this onboarding.",
            "Rule-based draft (do not ignore; refine where the answers justify it):",
            JSON.stringify(
              {
                recommendedCore: input.plan.recommendedCore,
                recommendedGrowth: input.plan.recommendedGrowth,
                recommendedIndustry: input.plan.recommendedIndustry,
                connectors: input.plan.connectors,
                priorities: input.plan.priorities,
                goals: input.plan.goals,
                risks: input.plan.risks,
              },
              null,
              2,
            ),
            "",
            "Onboarding answers:",
            JSON.stringify(input.answers, null, 2),
          ].join("\n"),
        },
      ],
    });

    const overlay = parseOverlay(result.text);
    if (!overlay) return input.plan;

    const ninety = overlay.ninetyDayPriorities?.length
      ? overlay.ninetyDayPriorities
      : input.plan.priorities;
    const recommendedCore = overlay.recommendedCore?.length
      ? overlay.recommendedCore
      : input.plan.recommendedCore;
    const recommendedGrowth = overlay.recommendedGrowth?.length
      ? overlay.recommendedGrowth
      : input.plan.recommendedGrowth;
    const recommendedIndustry = overlay.recommendedIndustry?.length
      ? overlay.recommendedIndustry
      : input.plan.recommendedIndustry;
    const connectors = overlay.connectors?.length ? overlay.connectors : input.plan.connectors;

    return {
      ...input.plan,
      recommendedCore,
      recommendedGrowth,
      recommendedIndustry,
      connectors,
      priorities: ninety.slice(0, 5),
      apps: [
        ...recommendedCore,
        ...recommendedGrowth,
        ...recommendedIndustry,
        ...(input.answers.infraApps ?? []),
      ].slice(0, 24),
      analysis: overlay.analysis,
      firstAutomation: overlay.firstAutomation,
      analysisSource: "llm",
      analysisProvider: result.provider,
      analysisModel: result.model,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "LLM request failed";
    console.warn("[founding] implementation analysis failed — keeping rule-based plan", message);
    return input.plan;
  }
}
