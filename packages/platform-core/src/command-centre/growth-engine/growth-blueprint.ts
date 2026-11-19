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
  if (/schema|structured|artist identity|ai visibility|discover/.test(text)) return "AI Visibility™ + Website Manager";
  if (/analytics|tracking|measurement/.test(text)) return "DigitalGate Analytics";
  if (/booking|event|appointment|enquir|form|conversion path|quote/.test(text)) return "DigitalGate CRM & Automation";
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
  if (/schema|structured|artist identity/.test(text)) return "Make the business and its offer easier for search and AI systems to understand.";
  if (/booking|event|appointment/.test(text)) return "Make it easier for a promoter, guest or customer to start a booking conversation.";
  if (/enquir|form|conversion path|cta/.test(text)) return "Turn existing interest into a measurable enquiry and follow-up path.";
  if (/analytics|tracking|measurement/.test(text)) return "Make commercial activity and enquiry outcomes measurable.";
  if (/reputation|review/.test(text)) return "Strengthen verifiable trust at the point of decision.";
  return `Support ${model.successIndicators[0]?.toLowerCase() || "a measurable commercial next step"}.`;
}

function detailFor(capability: string, model: BusinessModelAssessment, index: number) {
  if (/AI Visibility|Website Manager/.test(capability)) return {
    benefit: "A clearer, machine-readable identity and a more consistent path from discovery to interest.",
    measure: "Structured entity and profile information verified; key discovery pages correctly understood in a follow-up audit.",
  };
  if (/CRM & Automation/.test(capability)) return {
    benefit: "Every enquiry has an owner, a next action and a measurable follow-up state.",
    measure: model.successIndicators[index] || "Qualified enquiries logged and followed up within an agreed response window.",
  };
  if (/Analytics/.test(capability)) return {
    benefit: "A verified measurement baseline rather than assuming analytics are absent.",
    measure: "Analytics/tracking presence confirmed and key enquiry or conversion events recorded.",
  };
  if (/SEO/.test(capability)) return {
    benefit: "Stronger technical and content foundations for relevant discovery.",
    measure: "Priority pages indexed and technically valid; search visibility reviewed against a documented baseline.",
  };
  if (/Reputation/.test(capability)) return {
    benefit: "More verifiable trust evidence at the point of decision.",
    measure: "Verified review or trust sources displayed and linked to relevant conversion paths.",
  };
  return {
    benefit: model.successIndicators[index] || "A clearer, measurable path from interest to a commercial conversation.",
    measure: model.successIndicators[index] || "A defined enquiry or conversion outcome, measured after implementation.",
  };
}

export function buildGrowthBlueprint(input: {
  model: BusinessModelAssessment;
  priorities: ReportPriority[];
}): GrowthBlueprintItem[] {
  return input.priorities.slice(0, 3).map((priority, index) => {
    const capability = capabilityFor(priority, input.model);
    const detail = detailFor(capability, input.model, index);
    return {
      objective: objectiveFor(priority, input.model),
      evidence: priority.framework ? "Strategic hypothesis — framework guidance, not a confirmed finding." : `${priority.evidenceLabel}: ${priority.meaning}`,
      evidenceType: priority.framework ? "strategic_hypothesis" as const : "verified_finding" as const,
      capability,
      action: priority.action,
      benefit: detail.benefit,
      measure: detail.measure,
    };
  });
}
