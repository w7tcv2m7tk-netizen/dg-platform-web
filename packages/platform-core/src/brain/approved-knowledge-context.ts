import { listApprovedKnowledge, type KnowledgeItem } from "../knowledge";

export type ApprovedKnowledgeContext = {
  items: KnowledgeItem[];
  promptContext: string;
};

/**
 * Governed organisational memory for Business Brain / Advisor reasoning.
 * Only current APPROVED knowledge is returned by the repository; proposed,
 * rejected, archived and superseded history never enters normal reasoning.
 */
export async function getApprovedKnowledgeContext(input: {
  organisationId: string;
  limit?: number;
}): Promise<ApprovedKnowledgeContext> {
  const items = await listApprovedKnowledge({
    organisationId: input.organisationId,
    limit: input.limit ?? 100,
  });

  if (items.length === 0) {
    return { items, promptContext: "" };
  }

  const lines = [
    "## Approved organisational knowledge",
    "Treat the following as current, human-approved business context. Prefer it over older ungoverned notes when they conflict.",
    "",
  ];

  for (const item of items) {
    const scope = item.scope.length ? ` [${item.scope.join(", ")}]` : "";
    lines.push(`- ${item.title}${scope}: ${item.statement}`);
  }

  return { items, promptContext: lines.join("\n") };
}
