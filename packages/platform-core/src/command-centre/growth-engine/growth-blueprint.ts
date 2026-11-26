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
  const title = priority.title.toLowerCase();
  const text = `${priority.title} ${priority.meaning} ${priority.action}`.toLowerCase();
  // The title carries the commercial intent; body copy often mentions multiple
  // channels (for example analytics copy mentioning enquiries and bookings).
  if (/reputation|review|proof|credential/.test(title)) return "Review & Trust";
  if (/schema|structured/.test(title)) return "AI Visibility™";
  if (/artist identity|artist positioning|artist profile/.test(title)) return "Website Manager + Artist Profile";
  if (/booking|event|appointment/.test(title)) return "DigitalGate CRM & Automation";
  if (/local|suburb/.test(title)) return "Local Visibility";
  if (/ai visibility|llms|discover/.test(title)) return "AI Visibility™";
  if (/analytics|tracking|measurement/.test(title)) return "DigitalGate Analytics";
  if (/real estate|appraisal|listing/.test(title)) return "DigitalGate Real Estate App";
  if (/accommodation|guest/.test(title)) return "DigitalGate Accommodation App";
  if (/commerce|product|purchase|retail/.test(title)) return "DigitalGate Commerce";
  if (/seo|search/.test(title)) return "SEO App";
  if (/reputation|review|proof|credential/.test(text)) return "Review & Trust";
  if (/schema|structured/.test(text)) return "AI Visibility™";
  if (/artist identity|artist positioning|artist profile/.test(text)) return "Website Manager + Artist Profile";
  if (/booking|event|appointment/.test(text)) return "DigitalGate CRM & Automation";
  if (/local|suburb/.test(text)) return "Local Visibility";
  if (/ai visibility|llms|discover/.test(text)) return "AI Visibility™";
  if (/analytics|tracking|measurement/.test(text)) return "DigitalGate Analytics";
  if (/\benquir|\bforms?\b|conversion path|\bquote\b/.test(text)) return "DigitalGate CRM & Automation";
  if (/real estate|appraisal|listing/.test(text)) return "DigitalGate Real Estate App";
  if (/accommodation|guest/.test(text)) return "DigitalGate Accommodation App";
  if (/commerce|product|purchase|retail/.test(text)) return "DigitalGate Commerce";
  if (/seo|search/.test(text)) return "SEO App";
  return model.type === "music_artist" ? "Website Manager + AI Visibility™" : "DigitalGate Growth";
}

function objectiveFor(priority: ReportPriority, model: BusinessModelAssessment): string {
  const text = `${priority.title} ${priority.meaning}`.toLowerCase();
  if (/reputation|review/.test(text)) return "Strengthen verifiable trust at the point of decision.";
  if (/proof|credential/.test(text)) return "Make relevant proof and trust evidence easy to verify.";
  if (/schema|structured/.test(text)) return "Make the business and its offer easier for search and AI systems to understand.";
  if (/ai visibility|\bllms\b|ai assistants?|answer engine/.test(text)) return "Make the business easier for AI assistants and search systems to understand.";
  if (/artist identity|artist positioning|artist profile/.test(text)) return "Clarify the artist identity, genre and offer so promoters can decide whether to engage.";
  if (/booking|event|appointment/.test(text)) return "Make it easier for a promoter, guest or customer to start a booking conversation.";
  if (/local|suburb/.test(text)) return "Make the business's local coverage and proof easier to verify.";
  if (/\benquir|\bforms?\b|conversion path|\bcta\b/.test(text)) return "Turn existing interest into a measurable enquiry and follow-up path.";
  if (/analytics|tracking|measurement/.test(text)) return "Make commercial activity and enquiry outcomes measurable.";
  return `Support ${model.successIndicators[0]?.toLowerCase() || "a measurable commercial next step"}.`;
}

function detailFor(capability: string, model: BusinessModelAssessment, index: number) {
  if (/Artist Profile/.test(capability)) return {
    benefit: "A coherent artist identity and booking path that promoters and collaborators can understand quickly.",
    measure: "Artist positioning, EPK/profile evidence and booking page checked against a documented completeness criteria.",
  };
  if (/Local Visibility/.test(capability)) return {
    benefit: "Clearer local proof so buyers, sellers and AI systems can verify where the business operates.",
    measure: "Verified service-area and local-proof pages published and checked against a documented coverage set.",
  };
  if (/Review & Trust/.test(capability)) return {
    benefit: "More verifiable trust evidence at the point of decision.",
    measure: "Verified review or trust sources displayed and linked to relevant conversion paths.",
  };
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
  const out: GrowthBlueprintItem[] = [];
  const seen = new Set<string>();
  for (const [index, priority] of input.priorities.entries()) {
    const capability = capabilityFor(priority, input.model);
    const objective = objectiveFor(priority, input.model);
    const key = `${capability}|${objective}`.toLowerCase();
    if (seen.has(key)) continue;
    const detail = detailFor(capability, input.model, index);
    seen.add(key);
    out.push({
      objective,
      evidence: priority.framework ? "Strategic hypothesis — framework guidance, not a confirmed finding." : `${priority.evidenceLabel}: ${priority.meaning}`,
      evidenceType: priority.framework ? "strategic_hypothesis" as const : "verified_finding" as const,
      capability,
      action: priority.action,
      benefit: detail.benefit,
      measure: detail.measure,
    });
    if (out.length >= 3) break;
  }
  return out;
}

export function shortCapability(capability: string): string {
  if (/AI Visibility/i.test(capability)) return "AI visibility";
  if (/Analytics/i.test(capability)) return "Analytics";
  if (/Artist Profile/i.test(capability)) return "Artist identity";
  if (/Local Visibility/i.test(capability)) return "Local visibility";
  if (/Review & Trust/i.test(capability)) return "Review proof";
  if (/Real Estate App/i.test(capability)) return "Real estate";
  if (/Accommodation App/i.test(capability)) return "Accommodation";
  if (/Commerce/i.test(capability)) return "Commerce";
  if (/CRM/i.test(capability)) return "CRM & follow-up";
  if (/Website/i.test(capability)) return "Website";
  if (/SEO/i.test(capability)) return "Search";
  if (/Reputation/i.test(capability)) return "Reputation";
  if (/Growth/i.test(capability)) return "Growth";
  return capability.slice(0, 16);
}
