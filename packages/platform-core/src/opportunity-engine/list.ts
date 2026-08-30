import {
  detectClientAttentionOpportunities,
  detectExpansionOpportunities,
  detectOverdueLeadOpportunities,
  detectOverdueTaskOpportunities,
  detectProspectOpportunities,
} from "./detect";
import {
  severityRank,
  type ListPlatformOpportunitiesInput,
  type PlatformOpportunitiesBundle,
  type PlatformOpportunity,
} from "./types";

function sortOpportunities(items: PlatformOpportunity[]): PlatformOpportunity[] {
  return [...items].sort((a, b) => {
    const sev = severityRank(a.severity) - severityRank(b.severity);
    if (sev !== 0) return sev;
    return b.score - a.score;
  });
}

function dedupe(items: PlatformOpportunity[]): PlatformOpportunity[] {
  const seen = new Set<string>();
  const out: PlatformOpportunity[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/**
 * DigitalGate Opportunity Engine™ — ranked opportunities for Command Centre (staff)
 * or a single org (Apps / tenant Overview — org scope filters by organisationId).
 */
export async function listPlatformOpportunities(
  input: ListPlatformOpportunitiesInput,
): Promise<PlatformOpportunitiesBundle> {
  const limit = Math.min(input.limit ?? 40, 80);

  if (input.scope === "org" && !input.organisationId) {
    return {
      generatedAt: new Date().toISOString(),
      engine: "DigitalGate Opportunity Engine™",
      attentionCount: 0,
      opportunityCount: 0,
      items: [],
      honestyNote:
        "Org scope requires organisationId. No invented MRR — catalogue $ labelled when present.",
    };
  }

  // Prospects are scoped at the query. The other four detectors stamp a truthful
  // organisationId on every item and are narrowed by the filter below, but
  // prospect rows carry no organisationId — so under org scope they were being
  // excluded only as a side effect of that field being absent. Anyone adding an
  // organisationId to prospect items, an obvious improvement, would silently
  // expose every tenant's prospects to every other tenant.
  const [leads, tasks, attention, expansion, prospects] = await Promise.all([
    detectOverdueLeadOpportunities(),
    detectOverdueTaskOpportunities(),
    detectClientAttentionOpportunities(),
    detectExpansionOpportunities(),
    detectProspectOpportunities(
      20,
      input.scope === "org" ? input.organisationId : undefined,
    ),
  ]);

  let merged = dedupe([
    ...leads,
    ...tasks,
    ...attention,
    ...expansion,
    ...prospects,
  ]);

  if (input.scope === "org" && input.organisationId) {
    merged = merged.filter((o) => o.organisationId === input.organisationId);
  }

  const items = sortOpportunities(merged).slice(0, limit);
  const attentionCount = items.filter(
    (i) =>
      i.kind === "attention" ||
      i.kind === "follow_up" ||
      i.severity === "critical" ||
      i.severity === "high",
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    engine: "DigitalGate Opportunity Engine™",
    attentionCount,
    opportunityCount: items.length,
    items,
    honestyNote:
      "Ranked from live leads, tasks, Success Score, catalogue expansion, and prospect signals. Catalogue dollars are list prices — not Stripe revenue or Growth MRR.",
  };
}
