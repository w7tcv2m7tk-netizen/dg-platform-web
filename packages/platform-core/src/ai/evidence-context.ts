import type { BusinessContext } from "../org/business-context";

export type AidaEvidenceFreshness = "live" | "snapshot" | "configured" | "unavailable";

export type AidaEvidenceItem = {
  id: string;
  domain: "business" | "crm" | "commercial" | "analytics" | "advertising" | "seo" | "ai_visibility" | "reputation" | "connectors" | "websites" | "apps" | "automation";
  label: string;
  value: string | number | null;
  source: string;
  observedAt: string;
  freshness: AidaEvidenceFreshness;
  available: boolean;
};

export type AidaEvidenceContext = {
  organisationId: string;
  organisationName: string;
  capturedAt: string;
  items: AidaEvidenceItem[];
};

function item(input: Omit<AidaEvidenceItem, "available">): AidaEvidenceItem {
  return { ...input, available: input.value !== null };
}

/**
 * Canonical, tenant-scoped evidence projection for Aida.
 *
 * This deliberately projects from BusinessContext rather than querying providers
 * itself. Callers remain responsible for building BusinessContext from the
 * organisation-authorised Digital Twin and connected-service evidence.
 */
export function buildAidaEvidenceContext(context: BusinessContext): AidaEvidenceContext {
  const t = context.twin;
  const at = context.capturedAt;
  const snapshot = (id:string, domain:AidaEvidenceItem["domain"], label:string, value:string|number|null, source:string) =>
    item({ id, domain, label, value, source, observedAt: at, freshness: value == null ? "unavailable" : "snapshot" });
  const configured = (id:string, domain:AidaEvidenceItem["domain"], label:string, value:string|number|null, source:string) =>
    item({ id, domain, label, value, source, observedAt: at, freshness: value == null ? "unavailable" : "configured" });

  return {
    organisationId: context.organisationId,
    organisationName: context.identity.businessName || context.organisationName,
    capturedAt: at,
    items: [
      configured("business.name","business","Business name",context.identity.businessName || null,"Business Profile"),
      configured("business.industry","business","Industry",context.identity.industry || null,"Business Profile"),
      snapshot("crm.contacts","crm","CRM contacts",t.contactCount ?? null,"Digital Twin / CRM"),
      snapshot("crm.active_leads","crm","Active leads",t.activeLeads ?? null,"Digital Twin / CRM"),
      snapshot("commercial.pipeline","commercial","Pipeline value",t.pipelineValue ?? null,"Digital Twin / CRM"),
      snapshot("business.health","business","Business Health score",t.businessHealth ?? null,"Digital Twin"),
      snapshot("commercial.revenue_mtd","commercial","Revenue MTD",t.revenueMtdCents ?? null,"Digital Twin / Commerce"),
      snapshot("commercial.mrr","commercial","MRR",t.mrrCents ?? null,"Commerce subscription ledger"),
      snapshot("reputation.score","reputation","Reputation score",t.reputation ?? null,"Digital Twin / Reputation"),
      snapshot("reputation.review_count","reputation","Review count",t.reputationReviewCount ?? null,"Digital Twin / Reputation"),
      snapshot("analytics.sessions_30d","analytics","GA4 sessions (30d)",t.webSessions30d ?? null,"Google Analytics / Digital Twin"),
      snapshot("analytics.active_users_30d","analytics","GA4 active users (30d)",t.webActiveUsers30d ?? null,"Google Analytics / Digital Twin"),
      snapshot("analytics.search_clicks_30d","analytics","Search clicks (30d)",t.searchClicks30d ?? null,"Search Console / Digital Twin"),
      snapshot("analytics.search_impressions_30d","analytics","Search impressions (30d)",t.searchImpressions30d ?? null,"Search Console / Digital Twin"),
      snapshot("analytics.search_ctr_30d","analytics","Search CTR (30d)",t.searchCtr30d ?? null,"Search Console / Digital Twin"),
      snapshot("analytics.search_position_30d","analytics","Search average position (30d)",t.searchPosition30d ?? null,"Search Console / Digital Twin"),
      snapshot("advertising.spend_30d","advertising","Advertising spend (30d)",t.advertisingSpend30d ?? null,"Advertising evidence / Digital Twin"),
      snapshot("advertising.impressions_30d","advertising","Advertising impressions (30d)",t.advertisingImpressions30d ?? null,"Advertising evidence / Digital Twin"),
      snapshot("advertising.clicks_30d","advertising","Advertising clicks (30d)",t.advertisingClicks30d ?? null,"Advertising evidence / Digital Twin"),
      snapshot("advertising.conversions_30d","advertising","Advertising conversions (30d)",t.advertisingConversions30d ?? null,"Advertising evidence / Digital Twin"),
      snapshot("advertising.conversion_value_30d","advertising","Advertising conversion value (30d)",t.advertisingConversionValue30d ?? null,"Advertising evidence / Digital Twin"),
      snapshot("advertising.campaigns_30d","advertising","Advertising campaigns (30d)",t.advertisingCampaignCount30d ?? null,"Advertising evidence / Digital Twin"),
      snapshot("seo.score","seo","SEO score",t.seo ?? null,"Digital Twin"),
      snapshot("ai_visibility.score","ai_visibility","AI Visibility score",t.aiVisibility ?? null,"Digital Twin"),
      configured("connectors.connected","connectors","Connected systems",t.connectedSystems.length ? t.connectedSystems.join(", ") : null,"Connector Engine"),
      configured("websites.connected","websites","Websites",t.websites.length ? t.websites.join(", ") : null,"Digital Twin / Websites"),
      configured("apps.enabled","apps","Enabled apps",context.enabledAppIds.length ? context.enabledAppIds.join(", ") : null,"App Registry"),
      item({
        id: "automation.recent_runs",
        domain: "automation",
        label: "Observed automation executions (recent activity window)",
        value: t.automationRecentRunCount ?? null,
        source: "Organisation Activity / Automation Engine",
        observedAt: t.automationLastRunAt ?? at,
        freshness: t.automationRecentRunCount == null ? "unavailable" : "live",
      }),
      item({
        id: "automation.last_status",
        domain: "automation",
        label: "Latest observed automation execution status",
        value: t.automationLastRunStatus ?? null,
        source: "Organisation Activity / Automation Engine",
        observedAt: t.automationLastRunAt ?? at,
        freshness: t.automationLastRunStatus == null ? "unavailable" : "live",
      }),
    ],
  };
}

export function formatAidaEvidencePrompt(evidence: AidaEvidenceContext): string {
  const available = evidence.items.filter((e) => e.available);
  const unavailable = evidence.items.filter((e) => !e.available);
  const lines = [
    "## Authoritative organisation evidence",
    `Organisation: ${evidence.organisationName}`,
    `Evidence captured: ${evidence.capturedAt}`,
    "Use only evidence available to this organisation. Never infer a missing metric as zero.",
  ];
  for (const e of available) lines.push(`- ${e.label}: ${e.value} [source: ${e.source}; freshness: ${e.freshness}; observed: ${e.observedAt}]`);
  if (unavailable.length) {
    lines.push("", "## Evidence currently unavailable");
    for (const e of unavailable) lines.push(`- ${e.label} [source: ${e.source}]`);
  }
  return lines.join("\n");
}
