import { getAiLearningContext } from "../ai/usage";
import { getApprovedKnowledgeContext } from "../brain/approved-knowledge-context";
import {
  askBusinessAdvisor as askBusinessAdvisorBase,
  type AskAdvisorInput,
  type AskAdvisorResult,
} from "./ask-advisor";

export type { AskAdvisorInput, AskAdvisorResult } from "./ask-advisor";

/**
 * Customer Advisor boundary: enrich the existing Twin/Brain/Health briefing with
 * current, human-approved organisational knowledge and persisted outcomes from
 * previously approved Aida actions before model reasoning.
 * Proposed, rejected, archived and superseded knowledge remains excluded by
 * getApprovedKnowledgeContext(). Enrichment fails soft so Advisor can still
 * answer from its existing governed business signals.
 */
export async function askBusinessAdvisor(
  input: AskAdvisorInput,
): Promise<AskAdvisorResult> {
  const [approvedKnowledge, learningContext] = await Promise.all([
    getApprovedKnowledgeContext({
      organisationId: input.organisationId,
    }).catch(() => ({ items: [], promptContext: "" })),
    getAiLearningContext({ organisationId: input.organisationId }).catch(() => ""),
  ]);

  const enrichment = [approvedKnowledge.promptContext, learningContext].filter(Boolean);
  if (enrichment.length === 0) {
    return askBusinessAdvisorBase(input);
  }

  return askBusinessAdvisorBase({
    ...input,
    briefing: {
      ...input.briefing,
      todaySummary: [input.briefing.todaySummary, ...enrichment].join("\n\n"),
    },
  });
}
