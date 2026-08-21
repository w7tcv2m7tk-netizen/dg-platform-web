/**
 * Sales Intelligence — structured Opportunity Intelligence from voice (and later chat) conversations.
 *
 * Flow: Conversation → extract → Opportunity Engine score → CRM Opportunity metadata
 * → Call Centre / Command Centre / human next step.
 *
 * Spec: docs/ai/VOICE-AGENT-ARCHITECTURE.md · docs/foundations/OPPORTUNITY-ENGINE.md
 */

export type IntelligenceLevel = "high" | "medium" | "low" | "unknown";

/** Structured post-call commercial intelligence attached to CRM Opportunities. */
export type OpportunityIntelligence = {
  fit: IntelligenceLevel;
  need: IntelligenceLevel;
  urgency: IntelligenceLevel;
  commercialPotential: IntelligenceLevel;
  decisionMaker: "identified" | "not_identified" | "unknown";
  currentSolution: string | null;
  primaryProblem: string | null;
  desiredOutcome: string | null;
  recommendedNextStep: string | null;
  /** 0–100 Opportunity Engine score for this sales conversation */
  opportunityScore: number;
  recommendation: string;
  source: "voice_post_call" | "manual" | "rules";
  agentType?: string | null;
  sessionId?: string | null;
  generatedAt: string;
};

const HIGH = /high|strong|excellent|perfect fit|exactly what|ready to|asap|urgent|decision.?maker|budget|demo|platform demonstration|consultation|proceed|buy|purchase|sign/i;
const MED = /medium|considering|looking into|exploring|sometime|next (month|quarter)|interested|evaluate|compare/i;
const LOW = /low|not sure|maybe later|just browsing|no rush|information only|curious|early stage/i;

function levelFromText(text: string, positive: RegExp, weak: RegExp = LOW): IntelligenceLevel {
  if (positive.test(text)) return "high";
  if (MED.test(text)) return "medium";
  if (weak.test(text)) return "low";
  return "unknown";
}

function extractSnippet(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim().slice(0, 160);
  }
  return null;
}

function scoreFromLevels(input: {
  fit: IntelligenceLevel;
  need: IntelligenceLevel;
  urgency: IntelligenceLevel;
  commercialPotential: IntelligenceLevel;
  decisionMaker: OpportunityIntelligence["decisionMaker"];
  hasProblem: boolean;
  hasOutcome: boolean;
}): number {
  const map: Record<IntelligenceLevel, number> = {
    high: 22,
    medium: 14,
    low: 6,
    unknown: 8,
  };
  let score =
    map[input.fit] +
    map[input.need] +
    map[input.urgency] +
    map[input.commercialPotential];
  if (input.decisionMaker === "identified") score += 10;
  else if (input.decisionMaker === "not_identified") score += 2;
  if (input.hasProblem) score += 6;
  if (input.hasOutcome) score += 6;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildRecommendation(intel: Omit<OpportunityIntelligence, "recommendation" | "generatedAt" | "source">): string {
  if (intel.opportunityScore >= 75) {
    return `This appears to be a strong-fit opportunity. The prospect${
      intel.primaryProblem ? " has identified a current operational problem" : " shows clear interest"
    }${intel.desiredOutcome ? ", is actively considering alternatives and has a defined desired outcome" : ""}. Recommend progressing to ${
      intel.recommendedNextStep?.toLowerCase() || "a consultation"
    }.`;
  }
  if (intel.opportunityScore >= 50) {
    return `This is a moderate-fit opportunity worth nurturing. Capture remaining qualification gaps and recommend a structured follow-up${
      intel.recommendedNextStep ? ` (${intel.recommendedNextStep})` : ""
    }.`;
  }
  return "This enquiry needs more qualification before sales progression. Confirm need, urgency and decision process, then create a light follow-up task.";
}

/**
 * Rules-based Opportunity Intelligence from transcript/summary.
 * LLM enrichment can replace this later without changing the contract.
 */
export function buildOpportunityIntelligenceFromConversation(input: {
  transcript?: string | null;
  summary?: string | null;
  agentType?: string | null;
  sessionId?: string | null;
}): OpportunityIntelligence {
  const text = `${input.summary ?? ""}\n${input.transcript ?? ""}`.trim();
  const lower = text.toLowerCase();

  const fit = levelFromText(
    text,
    /fit|right (platform|solution)|exactly|perfect|ideal|matches|aligned|looking for (a |an )?(platform|system|crm|digitalgate)/i,
  );
  const need = levelFromText(
    text,
    /need|problem|pain|struggling|disconnected|manual|wasting time|losing (leads|deals)|broken|fragmented/i,
  );
  const urgency = levelFromText(
    text,
    /urgent|asap|this (week|month)|ready now|moving (fast|quickly)|deadline|soon as possible/i,
    /no rush|sometime|next year|just looking|browsing/i,
  );
  const commercialPotential = levelFromText(
    text,
    /budget|commercial|paid|subscription|platform|enterprise|agency|multiple (sites|locations|users)|growth|scale/i,
  );

  const decisionMaker: OpportunityIntelligence["decisionMaker"] = /decision.?maker|i (own|run|manage) (the )?business|i('m| am) the (owner|director|ceo|gm)|i decide|final say/i.test(
    text,
  )
    ? "identified"
    : /need to (check|speak|ask|talk)|with (my |the )?(partner|boss|team|board)/i.test(text)
      ? "not_identified"
      : "unknown";

  const currentSolution =
    extractSnippet(text, [
      /current(?:ly)? (?:using|on|with)\s+([A-Za-z0-9][^.!?\n]{1,60}?)(?:\.|,|$)/i,
      /existing (crm|system|platform|software)/i,
      /\b(salesforce|hubspot|pipedrive|monday|service ?m8|xero|excel|spreadsheets?)\b/i,
    ]) ||
    (/crm|spreadsheet|excel|manual/i.test(lower) ? "Existing CRM / manual process" : null);

  const primaryProblem =
    extractSnippet(text, [
      /(?:problem|issue|challenge|pain)(?: is|:)?\s*([^.!?\n]{5,100}?)(?:\.|$)/i,
      /\b(disconnected systems|too many tools|manual processes|losing leads|no follow-?ups?)\b/i,
    ]) ||
    (/disconnect|silo|manual|too many tools/i.test(lower) ? "Disconnected systems" : null);

  const desiredOutcome =
    extractSnippet(text, [
      /(?:want|looking for|need|goal is|outcome is)\s+([^.!?\n]{5,100}?)(?:\.|$)/i,
      /\b(one integrated platform|single platform|everything (?:connected|in one place)|automate(?:d)? workflows?)\b/i,
    ]) ||
    (/integrat|one platform|connected|digitalgate/i.test(lower)
      ? "One integrated platform"
      : null);

  const recommendedNextStep =
    extractSnippet(text, [
      /\b(platform demonstration|discovery call|consultation|demo|proposal|qualified follow-?up)\b/i,
    ]) ||
    (need === "high" || fit === "high" ? "Platform demonstration" : "Qualified follow-up");

  const opportunityScore = scoreFromLevels({
    fit,
    need,
    urgency,
    commercialPotential,
    decisionMaker,
    hasProblem: Boolean(primaryProblem),
    hasOutcome: Boolean(desiredOutcome),
  });

  const base = {
    fit,
    need,
    urgency,
    commercialPotential,
    decisionMaker,
    currentSolution,
    primaryProblem,
    desiredOutcome,
    recommendedNextStep,
    opportunityScore,
    agentType: input.agentType ?? null,
    sessionId: input.sessionId ?? null,
  };

  return {
    ...base,
    recommendation: buildRecommendation(base),
    source: "rules",
    generatedAt: new Date().toISOString(),
  };
}

export function formatOpportunityIntelligenceBlock(intel: OpportunityIntelligence): string {
  const dm =
    intel.decisionMaker === "identified"
      ? "Identified"
      : intel.decisionMaker === "not_identified"
        ? "Not identified"
        : "Unknown";
  return [
    "Opportunity Intelligence",
    `Fit: ${cap(intel.fit)}`,
    `Need: ${cap(intel.need)}`,
    `Urgency: ${cap(intel.urgency)}`,
    `Commercial potential: ${cap(intel.commercialPotential)}`,
    `Decision-maker: ${dm}`,
    `Current solution: ${intel.currentSolution ?? "—"}`,
    `Primary problem: ${intel.primaryProblem ?? "—"}`,
    `Desired outcome: ${intel.desiredOutcome ?? "—"}`,
    `Recommended next step: ${intel.recommendedNextStep ?? "—"}`,
    `Opportunity score: ${intel.opportunityScore}/100`,
    "",
    `AI recommendation: ${intel.recommendation}`,
  ].join("\n");
}

function cap(level: IntelligenceLevel): string {
  if (level === "unknown") return "Unknown";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function shouldGenerateSalesIntelligence(input: {
  agentType?: string | null;
  outcome?: string | null;
  transcript?: string | null;
  summary?: string | null;
}): boolean {
  const type = (input.agentType ?? "").toLowerCase();
  if (type === "sales" || type === "qualification") return true;
  if (input.outcome === "lead") return true;
  const text = `${input.summary ?? ""}\n${input.transcript ?? ""}`.toLowerCase();
  return /qualif|opportunit|demo|platform|crm|buy|purchase|budget|sales/.test(text);
}
