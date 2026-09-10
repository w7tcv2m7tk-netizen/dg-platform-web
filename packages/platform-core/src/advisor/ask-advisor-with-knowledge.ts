import { getApprovedKnowledgeContext } from "../brain/approved-knowledge-context";
import {
  askBusinessAdvisor as askBusinessAdvisorBase,
  type AskAdvisorInput,
  type AskAdvisorResult,
} from "./ask-advisor";

export type { AskAdvisorInput, AskAdvisorResult } from "./ask-advisor";

/**
 * Customer Advisor boundary: enrich the existing Twin/Brain/Health briefing with
 * current, human-approved organisational knowledge before model reasoning.
 * Proposed, rejected, archived and superseded knowledge remains excluded by
 * getApprovedKnowledgeContext(). Knowledge retrieval fails soft so Advisor can
 * still answer from its existing governed business signals.
 */
export async function askBusinessAdvisor(
  input: AskAdvisorInput,
): Promise<AskAdvisorResult> {
  const approvedKnowledge = await getApprovedKnowledgeContext({
    organisationId: input.organisationId,
  }).catch(() => ({ items: [], promptContext: "" }));

  if (!approvedKnowledge.promptContext) {
    return askBusinessAdvisorBase(input);
  }

  return askBusinessAdvisorBase({
    ...input,
    briefing: {
      ...input.briefing,
      todaySummary: [input.briefing.todaySummary, approvedKnowledge.promptContext].join("\n\n"),
    },
  });
}
