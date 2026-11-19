import type { BusinessModelAssessment } from "./business-model";
import type { ReportPriority } from "./report-presentation";

export type GrowthBlueprintItem = {
  objective: string;
  evidence: string;
  evidenceType: "verified_finding" | "strategic_hypothesis";
  capability: string;
  action: string;
  benefit: string;
  measure: string;
};

function capabilityFor(priority: ReportPriority, model: BusinessModelAssessment): string {
  const text = `${priority.title} ${priority.meaning} ${priority.action}`.toLowerCase();
  if (/booking|event|appointment|enquir|form|conversion path|quote/.test(text)) return "DigitalGate CRM & Automation";
  if (/schema|structured|artist identity|ai visibility|discover/.test(text)) return "AI Visibility™ + Website Manager";
  if (/analytics|tracking|measure/.test(text)) return "DigitalGate Analytics";
  if (/reputation|review|local/.test(text)) return "Reputation & Local Visibility";
  if (/real estate|appraisal|listing/.test(text)) return "DigitalGate Real Estate App";
  if (/accommodation|booking|guest/.test(text)) return "DigitalGate Accommodation App";
  if (/commerce|product|purchase|retail/.test(text)) return "DigitalGate Commerce";
  if (/seo|search/.test(text)) return "SEO App";
  return model.type === "music_artist" ? "Website Manager + AI Visibility™" : "DigitalGate Growth";
}

function objectiveFor(priority: ReportPriority, model: BusinessModelAssessment): string {
  const text = `${priority.title} ${priority.meaning}`.toLowerCase();
  if (/booking|event|appointment/.test(text)) return "Make it easier for a promoter, guest or customer to start a booking conversation.";
  if (/enquir|form|conversion path|cta/.test(text)) return "Turn existing interest into a measurable enquiry and follow-up path.";
  if (/schema|structured|artist identity/.test(text)) return "Make the business and its offer easier for search and AI systems to understand.";
  if (/analytics|tracking|measurement/.test(text)) return "Make commercial activity and enquiry outcomes measurable.";
  if (/reputation|review/.test(text)) return "Strengthen verifiable trust at the point of decision.";
  return `Support ${model.successIndicators[0]?.toLowerCase() || "a measurable commercial next step"}.`;
}

export function buildGrowthBlueprint(input: {
  model: BusinessModelAssessment;
  priorities: ReportPriority[];
}): GrowthBlueprintItem[] {
  return input.priorities.slice(0, 3).map((priority, index) => ({
    objective: objectiveFor(priority, input.model),
    evidence: priority.framework ? "Strategic hypothesis — framework guidance, not a confirmed finding." : `${priority.evidenceLabel}: ${priority.meaning}`,
    evidenceType: priority.framework ? "strategic_hypothesis" : "verified_finding",
    capability: capabilityFor(priority, input.model),
    action: priority.action,
    benefit: input.model.successIndicators[index] || input.model.successIndicators[0] || "A clearer, measurable path from interest to a commercial conversation.",
    measure: input.model.successIndicators[index] || input.model.successIndicators[0] || "A defined enquiry or conversion outcome, measured after implementation.",
  }));
}
