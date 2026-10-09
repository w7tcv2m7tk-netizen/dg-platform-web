/** Serializable presentation contract. Internal source references never contain raw records. */
export type BriefingScope = { organisationId: string; businessId: string };
export type BriefingSource = {
  id: string; label: string; kind: "external" | "internal";
  reference: string; url?: string; observedAt: string;
};
export type BusinessBriefing = BriefingScope & {
  version: 1; id: string; industry: string; geography: string;
  headline: string; generatedAt: string; expiresAt: string;
  insights: Array<{
    id: string; category: "industry" | "performance" | "opportunity" | "action";
    title: string; whyItMatters: string; nextAction: string;
    uncertainty: string; sourceIds: string[];
  }>;
  sources: BriefingSource[];
};
export type BriefingState =
  | { status: "disabled" | "forbidden" | "loading" | "empty" | "error" }
  | { status: "ready"; briefing: BusinessBriefing };
export function briefingEnabled(value: string | undefined): boolean { return value === "true"; }
export function safeSourceUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined; }
  catch { return undefined; }
}
