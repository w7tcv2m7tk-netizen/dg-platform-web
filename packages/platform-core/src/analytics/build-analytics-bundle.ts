import type { OrganisationBusinessProfile } from "../org/business-profile-types";
import type { OverviewConnectorProbes } from "../overview/connector-probes";
import type { OverviewLiveMetrics } from "../overview/gather-live-metrics";
import type { OrgScoresResult } from "../scoring/calculate-scores";
import { getScoreValue } from "../scoring/calculate-scores";
import type {
  AnalyticsBundle,
  AnalyticsDataSource,
  AnalyticsEvidenceMetric,
  AnalyticsKeyMetric,
  AnalyticsMetricStatus,
  AnalyticsTrendPoint,
} from "./types";

export type BuildAnalyticsBundleInput = {
  organisationName: string;
  metrics?: OverviewLiveMetrics | null;
  connectors?: OverviewConnectorProbes;
  scores?: OrgScoresResult | null;
  reputationScore?: number | null;
  profile?: OrganisationBusinessProfile | null;
};

function formatAud(cents: number) {
  if (cents <= 0) return "$0";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function monthLabels(count = 8): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleDateString("en-AU", { month: "short" }));
  }
  return labels;
}

function buildKeyMetrics(metrics: OverviewLiveMetrics | null | undefined): AnalyticsKeyMetric[] {
  if (!metrics) {
    return [
      { id: "leads", label: "Leads", value: "—", context: "Connect CRM to track leads", status: "unavailable" },
      { id: "pipeline", label: "Pipeline", value: "—", context: "Connect CRM for pipeline value", status: "unavailable" },
      { id: "revenue", label: "Revenue", value: "—", context: "Connect commerce for revenue", status: "unavailable" },
      { id: "contacts", label: "Contacts", value: "—", context: "Import contacts to begin", status: "unavailable" },
      { id: "tasks", label: "Tasks", value: "—", context: "Tasks appear from CRM activity", status: "unavailable" },
      { id: "conversion", label: "Conversion", value: "—", context: "Insufficient data", status: "insufficient" },
    ];
  }

  const totalLeads = metrics.vendorLeadCount + metrics.buyerLeadCount;
  const leadContext =
    metrics.newLeadsThisWeek > 0
      ? `+${metrics.newLeadsThisWeek} this week`
      : metrics.newLeadsThisWeek === 0
        ? "No new leads this week"
        : "Active in CRM";

  const pipelineContext =
    metrics.openOpportunityCount > 0
      ? `${metrics.openOpportunityCount} open opportunit${metrics.openOpportunityCount === 1 ? "y" : "ies"}`
      : metrics.pipelineValueCents > 0
        ? "Pipeline value from CRM"
        : "Add opportunities to model pipeline";

  const contactContext =
    metrics.openLeadCount > 0
      ? `${metrics.openLeadCount} open enquir${metrics.openLeadCount === 1 ? "y" : "ies"}`
      : metrics.hasContacts
        ? "Contacts in CRM"
        : "Import contacts to begin";

  const taskContext =
    metrics.openTasksDue > 0
      ? `${metrics.openTasksDue} due today`
      : "No tasks due today";

  let conversionValue = "—";
  let conversionContext = "Insufficient data";
  let conversionStatus: AnalyticsMetricStatus = "insufficient";
  if (totalLeads > 0 && metrics.openOpportunityCount > 0) {
    const rate = Math.round((metrics.openOpportunityCount / totalLeads) * 100);
    conversionValue = `${rate}%`;
    conversionContext = `${metrics.openOpportunityCount} of ${totalLeads} leads in opportunities`;
    conversionStatus = "live";
  }

  return [
    {
      id: "leads",
      label: "Leads",
      value: String(totalLeads),
      context: leadContext,
      href: "/apps/crm/leads",
      status: "live",
    },
    {
      id: "pipeline",
      label: "Pipeline",
      value: formatAud(metrics.pipelineValueCents),
      context: pipelineContext,
      href: "/apps/crm/opportunities",
      status: metrics.pipelineValueCents > 0 || metrics.openOpportunityCount > 0 ? "live" : "insufficient",
    },
    {
      id: "revenue",
      label: "Revenue",
      value: formatAud(metrics.revenueMtdCents),
      context: "MTD",
      href: "/apps/commerce/invoices",
      status: metrics.revenueMtdCents > 0 ? "live" : "insufficient",
    },
    {
      id: "contacts",
      label: "Contacts",
      value: String(metrics.contactCount),
      context: contactContext,
      href: "/apps/crm/contacts",
      status: metrics.contactCount > 0 ? "live" : "insufficient",
    },
    {
      id: "tasks",
      label: "Tasks",
      value: String(metrics.openTasksDue),
      context: taskContext,
      href: "/apps/crm/tasks",
      status: "live",
    },
    {
      id: "conversion",
      label: "Conversion",
      value: conversionValue,
      context: conversionContext,
      href: "/apps/crm/opportunities",
      status: conversionStatus,
    },
  ];
}

function buildEvidenceMetrics(
  metrics: OverviewLiveMetrics | null | undefined,
  scores: OrgScoresResult | null | undefined,
  reputationScore: number | null | undefined,
): AnalyticsEvidenceMetric[] {
  const seo = getScoreValue(scores?.scores ?? [], "seo");
  const aiVis = getScoreValue(scores?.scores ?? [], "ai_visibility");
  const website = getScoreValue(scores?.scores ?? [], "website_health");
  const reputation = reputationScore ?? 0;

  const scoreMetric = (
    id: string,
    label: string,
    value: number,
    href: string,
    connectHref: string,
    connectBody: string,
  ): AnalyticsEvidenceMetric => {
    if (value > 0) {
      return { id, label, value: `${value}/100`, status: "live", href };
    }
    return {
      id,
      label,
      value: null,
      status: "insufficient",
      unavailableTitle: "Not enough connected data",
      unavailableBody: connectBody,
      connectHref,
      connectLabel: "Connect →",
    };
  };

  return [
    scoreMetric(
      "seo",
      "SEO",
      seo,
      "/apps/seo",
      "/apps/seo",
      "Connect SEO monitoring to measure search performance.",
    ),
    scoreMetric(
      "ai_visibility",
      "AI Visibility",
      aiVis,
      "/apps/ai-visibility",
      "/apps/ai-visibility",
      "Enable AI Visibility to track how AI systems see your business.",
    ),
    scoreMetric(
      "website_health",
      "Website",
      website,
      "/apps/websites/health",
      "/apps/websites/health",
      "Connect website health monitoring to measure digital presence.",
    ),
    reputation > 0
      ? {
          id: "reputation",
          label: "Reputation",
          value: `${reputation}/100`,
          status: "live",
          href: "/apps/reviews",
        }
      : {
          id: "reputation",
          label: "Reputation",
          value: null,
          status: "insufficient",
          unavailableTitle: "Not enough connected data",
          unavailableBody: "Connect your review sources to start measuring reputation.",
          connectHref: "/apps/reviews",
          connectLabel: "Connect →",
        },
    metrics
      ? {
          id: "leads_evidence",
          label: "Leads",
          value: String(metrics.vendorLeadCount + metrics.buyerLeadCount),
          status: "live",
          href: "/apps/crm/leads",
        }
      : {
          id: "leads_evidence",
          label: "Leads",
          value: null,
          status: "unavailable",
          unavailableTitle: "No CRM data",
          unavailableBody: "Connect CRM to inspect lead volume and sources.",
          connectHref: "/apps/crm",
          connectLabel: "Open CRM →",
        },
  ];
}

function buildLeadTrend(metrics: OverviewLiveMetrics | null | undefined): {
  points: AnalyticsTrendPoint[];
  note: string;
} {
  const labels = monthLabels(8);
  if (!metrics) {
    return {
      points: labels.map((label) => ({ label, value: null })),
      note: "Lead trend appears when CRM data is connected.",
    };
  }

  const currentTotal = metrics.vendorLeadCount + metrics.buyerLeadCount;
  const points = labels.map((label, index) => ({
    label,
    value: index === labels.length - 1 ? currentTotal : null,
  }));

  return {
    points,
    note:
      currentTotal > 0
        ? "Current month shows active leads in CRM. Historical months fill in as activity is recorded."
        : "Add leads in CRM to begin building a trend.",
  };
}

function buildDataSources(
  metrics: OverviewLiveMetrics | null | undefined,
  connectors: OverviewConnectorProbes | undefined,
  profile: OrganisationBusinessProfile | null | undefined,
): AnalyticsDataSource[] {
  const rows: AnalyticsDataSource[] = [];

  if (metrics?.hasContacts || metrics?.contactCount) {
    rows.push({
      id: "crm",
      label: "CRM",
      status: "connected",
      statusLabel: "Connected",
      updatedLabel: metrics.hasTimelineActivity ? "Updated recently" : "Live",
      detail: "Contacts, leads, opportunities, tasks and activity",
      href: "/apps/crm",
    });
  } else {
    rows.push({
      id: "crm",
      label: "CRM",
      status: "partial",
      statusLabel: "Partial",
      updatedLabel: "Awaiting data",
      detail: "Import contacts and leads to unlock CRM metrics",
      href: "/apps/crm",
    });
  }

  rows.push({
    id: "stripe",
    label: "Stripe",
    status: connectors?.stripeOk ? "connected" : "not_connected",
    statusLabel: connectors?.stripeOk ? "Connected" : "Not connected",
    updatedLabel: connectors?.stripeOk ? "Configured" : "Not connected",
    detail: connectors?.stripeOk
      ? `Commerce revenue${connectors.stripeMode ? ` · ${connectors.stripeMode} mode` : ""}`
      : "Connect Stripe to unlock revenue and subscription metrics",
    href: "/dashboard/settings/connectors",
  });

  rows.push({
    id: "website",
    label: "Website",
    status: connectors?.website?.ok ? "connected" : "not_connected",
    statusLabel: connectors?.website?.ok ? "Connected" : "Not connected",
    updatedLabel: connectors?.website?.ok ? "Updated today" : "Not connected",
    detail: connectors?.website?.ok
      ? `Health score ${connectors.website.score ?? "—"}/100${connectors.website.siteLabel ? ` · ${connectors.website.siteLabel}` : ""}`
      : "Connect website health monitoring for digital presence metrics",
    href: "/apps/websites/health",
  });

  if (profile?.social?.googleBusiness) {
    rows.push({
      id: "gbp",
      label: "Google Business Profile",
      status: "connected",
      statusLabel: "Connected",
      updatedLabel: "On profile",
      detail: "Listed on Business Profile",
      href: "/dashboard/business",
    });
  }

  rows.push({
    id: "reviews",
    label: "Reviews",
    status: connectors?.wordpress?.ok ? "partial" : "not_connected",
    statusLabel: connectors?.wordpress?.ok ? "Partial" : "Not connected",
    updatedLabel: connectors?.wordpress?.lastSyncAt
      ? `Updated ${new Date(connectors.wordpress.lastSyncAt).toLocaleDateString("en-AU")}`
      : "Not connected",
    detail: "Connect review feeds for reputation metrics",
    href: "/apps/reviews",
  });

  rows.push({
    id: "meta",
    label: "Meta Ads",
    status: "not_connected",
    statusLabel: "Not connected",
    updatedLabel: "Not connected",
    detail: "Connect Meta Ads to unlock campaign, spend and lead performance",
    href: "/apps/analytics/connectors",
  });

  rows.push({
    id: "ga",
    label: "Google Analytics",
    status: "not_connected",
    statusLabel: "Not connected",
    updatedLabel: "Not connected",
    detail: "Connect Google Analytics to unlock traffic and conversion metrics",
    href: "/apps/analytics/connectors",
  });

  return rows;
}

function buildReportCommentary(
  metrics: OverviewLiveMetrics | null | undefined,
  businessHealth: number | null,
): string {
  if (!metrics) {
    return "Connect your business systems to generate performance commentary from live data.";
  }

  const parts: string[] = [];
  if (metrics.revenueMtdCents > 0) {
    parts.push(`Revenue this month is ${formatAud(metrics.revenueMtdCents)}.`);
  }
  if (metrics.newLeadsThisWeek > 0) {
    parts.push(
      `${metrics.newLeadsThisWeek} new enquir${metrics.newLeadsThisWeek === 1 ? "y" : "ies"} arrived this week.`,
    );
  } else if (metrics.vendorLeadCount + metrics.buyerLeadCount > 0) {
    parts.push("Lead volume is stable with no new enquiries recorded this week.");
  }
  if (metrics.overdueFollowUps > 0) {
    parts.push(
      `${metrics.overdueFollowUps} overdue follow-up${metrics.overdueFollowUps === 1 ? "" : "s"} may be affecting conversion.`,
    );
  }
  if (metrics.openOpportunityCount > 0) {
    parts.push(
      `${metrics.openOpportunityCount} open opportunit${metrics.openOpportunityCount === 1 ? "y is" : "ies are"} in the pipeline.`,
    );
  }
  if (businessHealth != null) {
    parts.push(`Business Health is tracking at ${businessHealth}/100.`);
  }
  if (parts.length === 0) {
    return "Activity is limited in connected systems. Connect CRM, commerce, and marketing sources to enrich this report.";
  }
  return parts.join(" ");
}

/** Build customer-facing Analytics bundle — evidence layer, not Intelligence interpretation. */
export function buildAnalyticsBundle(input: BuildAnalyticsBundleInput): AnalyticsBundle {
  const metrics = input.metrics;
  const businessHealth = input.scores?.businessHealth ?? null;
  const leadTrend = buildLeadTrend(metrics);
  const dataSources = buildDataSources(metrics, input.connectors, input.profile ?? null);
  const connectedSourceCount = dataSources.filter((s) => s.status === "connected").length;
  const periodLabel = new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric" });

  return {
    generatedAt: new Date().toISOString(),
    organisationName: input.organisationName,
    scoresLive: Boolean(metrics && input.scores),
    keyMetrics: buildKeyMetrics(metrics),
    businessHealth,
    evidenceMetrics: buildEvidenceMetrics(metrics, input.scores, input.reputationScore),
    leadTrend: leadTrend.points,
    leadTrendNote: leadTrend.note,
    dataSources,
    connectedSourceCount,
    predefinedDashboards: [
      {
        id: "executive",
        label: "Executive",
        description: "Revenue, leads, pipeline, conversion, health and growth",
        metrics: ["Revenue", "Leads", "Pipeline", "Conversion", "Business Health", "Growth"],
        href: "/apps/analytics/dashboard?dashboard=executive",
      },
      {
        id: "sales",
        label: "Sales",
        description: "Leads, opportunities, pipeline value, velocity and activity",
        metrics: ["Leads", "Opportunities", "Pipeline value", "Conversion", "Follow-ups"],
        href: "/apps/analytics/dashboard?dashboard=sales",
      },
      {
        id: "marketing",
        label: "Marketing",
        description: "Leads, sources, website, SEO, AI Visibility and campaigns",
        metrics: ["Leads", "Website", "SEO", "AI Visibility", "Reputation"],
        href: "/apps/analytics/dashboard?dashboard=marketing",
      },
      {
        id: "operations",
        label: "Operations",
        description: "Tasks, customers, response times, automation and activity",
        metrics: ["Tasks", "Contacts", "Follow-ups", "Automation", "Activity"],
        href: "/apps/analytics/dashboard?dashboard=operations",
      },
    ],
    reportTemplates: [
      {
        id: "business_performance",
        title: "Business Performance Report",
        periodLabel,
        sections: [
          "Executive summary",
          "Revenue",
          "Pipeline",
          "Lead generation",
          "Customer activity",
          "Marketing",
          "Digital presence",
          "Operations",
          "Recommendations",
        ],
        commentary: buildReportCommentary(metrics, businessHealth),
        href: "/apps/analytics/reports",
      },
    ],
  };
}

export { formatAud as formatAnalyticsAud };
