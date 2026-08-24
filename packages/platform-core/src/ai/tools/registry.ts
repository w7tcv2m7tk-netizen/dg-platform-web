/**
 * AI Tool Registry — controlled actions DigitalGate executes on behalf of AI recommendations.
 * Models never write business data; tools do, under the acting user's permissions.
 * @see docs/ai/AI-ARCHITECTURE.md
 */

export type AiToolRisk = "read" | "write" | "external";

export type AiToolDefinition = {
  id: string;
  label: string;
  description: string;
  /** Manifest feature required (e.g. crm.contacts.write). Empty = any signed-in org member. */
  requiredFeatures: string[];
  risk: AiToolRisk;
  /** When true, API requires confirmed: true before execute. */
  requiresApproval: boolean;
};

/** First vertical-slice tools — expand deliberately after dogfood. */
export const AI_TOOL_REGISTRY: Record<string, AiToolDefinition> = {
  "crm.create_follow_up_task": {
    id: "crm.create_follow_up_task",
    label: "Create follow-up task",
    description:
      "Creates an open CRM task from an Advisor recommendation (e.g. respond to overdue enquiries).",
    requiredFeatures: [],
    risk: "write",
    requiresApproval: true,
  },
};

export function getAiTool(toolId: string): AiToolDefinition | null {
  return AI_TOOL_REGISTRY[toolId] ?? null;
}

export function listAiTools(): AiToolDefinition[] {
  return Object.values(AI_TOOL_REGISTRY);
}
