/**
 * Customer AI Advisor — free-text ask against Business Brain + Twin context.
 * Model interprets; DigitalGate owns data. Never invents CRM facts.
 * @see docs/ai/AI-ARCHITECTURE.md
 */

import { buildAiSystemPrompt, type BusinessContext } from "../org/business-context";
import {
  describeLlmTransportPlan,
  LlmChatError,
  llmChat,
  llmConfigured,
  llmConfiguredTransports,
  type LlmProvider,
  type LlmTransportAttempt,
  type LlmTransportPlanEntry,
} from "../ai/llm";
import { recordAiLedgerEvent } from "../ai/usage";
import type { AdvisorRecommendation, BusinessAdvisorBundle } from "./types";

export type AskAdvisorInput = {
  organisationId: string;
  actorId?: string;
  question: string;
  contextLabel?: string;
  businessContext: BusinessContext;
  /** Pre-built briefing for evidence + fallback */
  briefing: Pick<
    BusinessAdvisorBundle,
    "todaySummary" | "topRecommendations" | "brainCompleteness" | "businessHealth"
  >;
};

export type AskAdvisorResult = {
  question: string;
  answer: string;
  source: "llm" | "briefing" | "no_llm" | "llm_error";
  provider?: string | null;
  model?: string | null;
  latencyMs?: number | null;
  recommendations: AdvisorRecommendation[];
  correlationId: string;
  /** Which Model Router transports are keyed (no secrets). */
  transportsAvailable?: LlmProvider[];
  /** Ordered failover plan for this ask (provider + model). */
  transportPlan?: LlmTransportPlanEntry[];
  /** First transport that would be / was selected. */
  transportSelected?: string | null;
  /** Per-transport attempt results when the call failed. */
  transportAttempts?: LlmTransportAttempt[];
  /** Set when source is llm_error — last provider error message. */
  llmError?: string;
};

function newCorrelationId() {
  return `adv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatTransportSelected(plan: LlmTransportPlanEntry[]): string | null {
  const first = plan[0];
  if (!first) return null;
  return `${first.provider} · ${first.model}`;
}

function evidenceBlock(briefing: AskAdvisorInput["briefing"]): string {
  const recs = briefing.topRecommendations
    .slice(0, 5)
    .map(
      (r, i) =>
        `${i + 1}. [${r.category}] ${r.title}\n   See: ${r.whatISee}\n   Recommend: ${r.whatIRecommend}`,
    )
    .join("\n");
  return [
    `Today summary: ${briefing.todaySummary}`,
    `Business Brain completeness: ${briefing.brainCompleteness}%`,
    briefing.businessHealth != null
      ? `Business Health: ${briefing.businessHealth}/100`
      : "Business Health: not yet scored",
    "",
    "Prioritised recommendations (from live Twin / Brain / Health — treat as evidence):",
    recs || "(none yet — say so honestly)",
  ].join("\n");
}

function pickRecommendationsForQuestion(
  question: string,
  recs: AdvisorRecommendation[],
): AdvisorRecommendation[] {
  const lower = question.trim().toLowerCase();
  let picked = recs.slice(0, 3);

  if (lower.includes("automat")) {
    picked = recs.filter((r) =>
      /automation|automate|follow-up|follow up|workflow|reminder/i.test(
        `${r.id} ${r.category} ${r.title} ${r.whatIRecommend}`,
      ),
    );
  } else if (lower.includes("lead") || lower.includes("enquir")) {
    picked = recs.filter((r) => /follow|lead|enquir|sales/i.test(r.id + r.category + r.title));
  } else if (lower.includes("health")) {
    picked = recs.filter((r) => /health|brain/i.test(r.id + r.category));
  } else if (lower.includes("focus") || lower.includes("today")) {
    picked = recs.slice(0, 3);
  }

  return picked.length ? picked : recs.slice(0, 3);
}

function briefingFallback(
  input: AskAdvisorInput,
  reason: "no_llm" | "llm_error",
  errorMessage?: string,
  attempts?: LlmTransportAttempt[],
): AskAdvisorResult {
  const q = input.question.trim();
  const picked = pickRecommendationsForQuestion(q, input.briefing.topRecommendations);
  const transports = llmConfiguredTransports();
  const transportPlan = describeLlmTransportPlan("reasoning");
  const transportSelected = formatTransportSelected(transportPlan);

  const focusLine = picked.length
    ? `Based on connected signals, focus on: ${picked.map((r) => r.title).join("; ")}.`
    : "I don't yet have enough live CRM / website / finance signals to give a specific answer. Connect systems under Settings → Connectors, then ask again.";

  const planLine = transportSelected
    ? `Transport selected: ${transportSelected}${
        transportPlan.length > 1
          ? ` (failover: ${transportPlan.map((t) => t.provider).join(" → ")})`
          : ""
      }`
    : "Transport selected: none";

  const footer =
    reason === "no_llm"
      ? transports.length
        ? `(Model Router transports are keyed but unavailable in this runtime — this answer uses your Business Brain briefing only.)\n${planLine}`
        : "(Model Router is not configured — set AI_GATEWAY_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY on Vercel. This answer uses your Business Brain briefing only.)"
      : `(Model Router could not complete this answer${errorMessage ? `: ${errorMessage}` : ""}. Showing briefing evidence below.)\n${planLine}`;

  const answer = [input.briefing.todaySummary, "", focusLine, "", footer].join("\n");

  return {
    question: q,
    answer,
    source: reason,
    recommendations: picked,
    correlationId: newCorrelationId(),
    transportsAvailable: transports,
    transportPlan,
    transportSelected,
    transportAttempts: attempts,
    llmError: reason === "llm_error" ? errorMessage : undefined,
  };
}

/**
 * Answer a free-text Advisor question from org context.
 * Hallucination rule: only use provided context + briefing evidence.
 */
export async function askBusinessAdvisor(
  input: AskAdvisorInput,
): Promise<AskAdvisorResult> {
  const question = input.question.trim();
  const transports = llmConfiguredTransports();
  const transportPlan = describeLlmTransportPlan("reasoning");
  const transportSelected = formatTransportSelected(transportPlan);

  if (!question) {
    return {
      question: "",
      answer: "Ask a question about your business — for example, “What should I do today?”",
      source: "briefing",
      recommendations: input.briefing.topRecommendations.slice(0, 3),
      correlationId: newCorrelationId(),
      transportsAvailable: transports,
      transportPlan,
      transportSelected,
    };
  }

  const correlationId = newCorrelationId();
  const evidence = evidenceBlock(input.briefing);

  if (!llmConfigured()) {
    const fallback = briefingFallback(input, "no_llm");
    await recordAiLedgerEvent({
      organisationId: input.organisationId,
      actorId: input.actorId,
      eventType: "ai.assist_generated",
      title: "AI Advisor answer (briefing fallback)",
      body: question.slice(0, 200),
      correlationId: fallback.correlationId,
      result: {
        source: fallback.source,
        question,
        transports,
        transportPlan,
      },
    });
    return fallback;
  }

  const system = [
    buildAiSystemPrompt(input.businessContext),
    "",
    "You are DigitalGate AI Advisor for this organisation.",
    "Answer ONLY from the business context and evidence below.",
    "Never invent contacts, leads, revenue, connectors, or scores not present in evidence.",
    "If evidence is thin, say what is missing and what to connect next.",
    "Australian English. Be concise and actionable.",
    "Structure the answer as:",
    "1) Direct answer (2–4 sentences)",
    "2) Why it matters (1–2 sentences)",
    "3) What to do next (up to 3 numbered actions, referencing the evidence recommendations when relevant)",
  ].join("\n");

  const user = [
    input.contextLabel ? `Ask about: ${input.contextLabel}` : "Ask about: Entire Business",
    `Question: ${question}`,
    "",
    "Evidence from DigitalGate (Twin / Brain / Health):",
    evidence,
  ].join("\n");

  try {
    const result = await llmChat({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      maxTokens: 900,
      tier: "reasoning",
    });

    const answer =
      result.text.trim() ||
      briefingFallback(input, "llm_error", "empty model response").answer;

    await recordAiLedgerEvent({
      organisationId: input.organisationId,
      actorId: input.actorId,
      eventType: "ai.assist_generated",
      title: "AI Advisor answer",
      body: question.slice(0, 200),
      correlationId,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      result: { source: "llm", question, transportPlan },
    });

    return {
      question,
      answer,
      source: "llm",
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      recommendations: input.briefing.topRecommendations.slice(0, 3),
      correlationId,
      transportsAvailable: transports,
      transportPlan,
      transportSelected: `${result.provider} · ${result.model}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Model request failed";
    const attempts = err instanceof LlmChatError ? err.attempts : undefined;
    const fallback = briefingFallback(input, "llm_error", message, attempts);
    await recordAiLedgerEvent({
      organisationId: input.organisationId,
      actorId: input.actorId,
      eventType: "ai.tool_failed",
      title: "AI Advisor model failed — briefing fallback",
      body: message,
      correlationId,
      error: message,
      result: { question, transports, transportPlan, attempts },
    });
    return { ...fallback, correlationId };
  }
}
