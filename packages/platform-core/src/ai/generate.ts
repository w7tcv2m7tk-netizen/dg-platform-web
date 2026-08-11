import {
  buildAiSystemPrompt,
  generateFromBusinessContext,
  type AiGenerateAction,
  type BusinessContext,
  type CrmAssistEntity,
} from "../org/business-context";
import { llmChat, llmConfigured, type LlmGenerateResult } from "./llm";
import { templateListingDescriptionFromFacts } from "./listing-description";

export type AiAssistResult = {
  output: string;
  source: "llm" | "template";
  provider?: string;
  model?: string;
  latencyMs?: number;
  error?: string;
};

function userPromptForAction(
  action: AiGenerateAction,
  entity?: CrmAssistEntity | null,
): string {
  const entityBlock = entity
    ? entity.kind === "property"
      ? [
          `Entity type: property listing`,
          entity.title ? `Title: ${entity.title}` : "",
          entity.propertyAddress ? `Property: ${entity.propertyAddress}` : "",
          entity.description ? `Existing description:\n${entity.description}` : "",
          entity.notes?.length
            ? `Facts (Cotality + listing fields — use only these):\n${entity.notes.join("\n")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : [
          `Entity type: ${entity.kind}`,
          entity.title ? `Title: ${entity.title}` : "",
          entity.status ? `Status: ${entity.status}` : "",
          entity.stage ? `Stage: ${entity.stage}` : "",
          entity.source ? `Source: ${entity.source}` : "",
          entity.propertyAddress ? `Property: ${entity.propertyAddress}` : "",
          entity.contactName ? `Contact: ${entity.contactName}` : "",
          entity.contactEmail ? `Email: ${entity.contactEmail}` : "",
          entity.contactPhone ? `Phone: ${entity.contactPhone}` : "",
          entity.valueCents != null
            ? `Value cents: ${entity.valueCents} ${entity.currency || "AUD"}`
            : "",
          entity.description ? `Description: ${entity.description}` : "",
          entity.notes?.length
            ? `Recent activity:\n${entity.notes.map((n) => `- ${n}`).join("\n")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
    : "No CRM entity attached.";

  const tasks: Record<AiGenerateAction, string> = {
    social_post:
      "Write a short social media post (under 120 words) for this business. Include 2–4 relevant hashtags. Match the brand voice. Do not invent awards or claims.",
    email_draft:
      "Draft a professional follow-up email. Include Subject: line first. Keep it concise. Use the contact first name when known.",
    briefing:
      "Write a short daily briefing (5–8 bullet lines) for the business owner based on Twin / CRM context. End with one recommended focus for today.",
    lead_follow_up:
      "Draft a follow-up email for this lead. Include Subject: line. Personalise to property/contact if present. Ask for a clear next step.",
    lead_summary:
      "Summarise this lead for an agent: status, contact, property, recent activity, and one suggested next step.",
    opportunity_follow_up:
      "Draft a follow-up email for this opportunity. Include Subject: line. Reference stage and value when useful.",
    opportunity_summary:
      "Summarise this opportunity: stage, value, contact, linked context, and one suggested next step.",
    contact_follow_up:
      "Draft a follow-up email to this contact. Include Subject: line. Keep it warm and concise.",
    contact_summary:
      "Summarise this contact: who they are, recent activity, and one suggested next step.",
    listing_description:
      "Write an Australian real-estate listing description (2–4 short paragraphs) from the facts only. Match brand voice. Do not invent features, schools, renovations, views, or prices. Do not present prior sales or AVM as a current guide price or valuation. If an existing description is present, improve/update it using the facts. Clearly write marketing copy an agent can edit — this is an AI draft from Cotality/listing facts, not a valuation.",
  };

  return [
    tasks[action],
    "",
    "CRM / entity context:",
    entityBlock,
    "",
    "Output plain text only — no markdown fences.",
  ].join("\n");
}

/**
 * Generate assist text via configured LLM, falling back to deterministic templates.
 */
export async function generateAiAssist(input: {
  context: BusinessContext;
  action: AiGenerateAction;
  entity?: CrmAssistEntity | null;
}): Promise<AiAssistResult> {
  const template =
    input.action === "listing_description" && input.entity?.notes?.length
      ? templateListingDescriptionFromFacts(input.entity.notes)
      : generateFromBusinessContext(input.context, input.action, input.entity);

  if (!llmConfigured()) {
    return { output: template, source: "template" };
  }

  try {
    const system = [
      buildAiSystemPrompt(input.context),
      "",
      "You are DigitalGate AI Assist. Follow the business brand voice.",
      "Never invent facts, prices, or commitments not present in context.",
      "Australian English spelling when the org locale is en-AU.",
    ].join("\n");

    const result: LlmGenerateResult = await llmChat({
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: userPromptForAction(input.action, input.entity),
        },
      ],
      maxTokens: 1200,
    });

    return {
      output: result.text,
      source: "llm",
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "LLM request failed";
    console.warn("[ai] LLM failed — using template fallback", message);
    return {
      output: template,
      source: "template",
      error: message,
    };
  }
}
