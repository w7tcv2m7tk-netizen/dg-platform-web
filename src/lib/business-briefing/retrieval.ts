import type { BriefingScope, BriefingState, BusinessBriefing } from "./contract";
import { safeSourceUrl } from "./contract";

/** Internal repository seam; never pass a client-supplied scope or permission decision. */
export async function retrieveBriefing(input: {
  enabled: boolean; authorisedScope: BriefingScope | null; canView: boolean;
  read: (scope: BriefingScope) => Promise<BusinessBriefing | null>;
  now?: number;
}): Promise<BriefingState> {
  if (!input.enabled) return { status: "disabled" };
  if (!input.authorisedScope || !input.canView) return { status: "forbidden" };
  try {
    const b = await input.read({ ...input.authorisedScope });
    if (!b) return { status: "empty" };
    const now = input.now ?? Date.now();
    if (b.organisationId !== input.authorisedScope.organisationId || b.businessId !== input.authorisedScope.businessId)
      return { status: "error" };
    if (b.version !== 1 || !b.headline.trim() || !b.industry.trim() || !b.geography.trim() ||
      !Number.isFinite(Date.parse(b.generatedAt)) || Date.parse(b.generatedAt) > now ||
      !Number.isFinite(Date.parse(b.expiresAt)) || Date.parse(b.expiresAt) <= now)
      return { status: "empty" };
    const ids = new Set(b.sources.map(s => s.id));
    if (ids.size !== b.sources.length || b.insights.length < 3 || b.insights.length > 5 ||
      b.sources.some(s => !s.id || !s.label.trim() || !s.reference.trim() || !Number.isFinite(Date.parse(s.observedAt)) ||
        Date.parse(s.observedAt) > now || !["external", "internal"].includes(s.kind) ||
        (s.kind === "external" && !safeSourceUrl(s.url))) ||
      b.insights.some(i => !i.title.trim() || !i.whyItMatters.trim() || !i.nextAction.trim() || !i.uncertainty.trim() ||
        !i.sourceIds.length || i.sourceIds.some(id => !ids.has(id)))) return { status: "error" };
    return { status: "ready", briefing: b };
  } catch { return { status: "error" }; }
}
