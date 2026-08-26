import type { BusinessBrainSnapshot } from "../brain/types";
import { hasAdvancedCommsEntitlement } from "../communications/entitlements";
import type { BusinessContext } from "../org/business-context";
import type { OverviewConnectorProbes } from "../overview/connector-probes";
import type { OverviewLiveMetrics } from "../overview/gather-live-metrics";
import type { PlatformSetupStatus } from "../org/setup-status";
import type { ReputationScoreBreakdown } from "../reviews";
import type { OrgScoresResult } from "../scoring/calculate-scores";
import { getScoreValue } from "../scoring/calculate-scores";
import type {
  DigitalTwinDashboardBundle,
  TwinConnectedSystem,
  TwinLayer,
  TwinLayerId,
  TwinSignal,
} from "./dashboard-types";
import type { DigitalTwinSnapshot } from "./types";

const SYSTEM_LABELS: Record<string, string> = {
  website: "Website",
  websites: "Design Studio",
  wordpress: "WordPress",
  stripe: "Stripe",
  crm: "CRM",
  "real-estate": "Real Estate",
  accommodation: "Accommodation",
  commerce: "Commerce",
  automation: "Automation",
  reviews: "Reviews",
  "ai-communications": "Communications",
  communications: "Communications",
};

const APP_LABELS: Record<string, string> = {
  ...SYSTEM_LABELS,
  seo: "SEO",
  marketing: "Marketing",
  "ai-visibility": "AI Visibility",
};

export type BuildDigitalTwinDashboardInput = {
  context: BusinessContext;
  snapshot?: DigitalTwinSnapshot | null;
  metrics?: OverviewLiveMetrics | null;
  connectors?: OverviewConnectorProbes;
  scores?: OrgScoresResult | null;
  brain?: BusinessBrainSnapshot | null;
  setupStatus?: PlatformSetupStatus | null;
  reputation?: ReputationScoreBreakdown | null;
  activities?: Array<{ id: string; title: string; body?: string | null; createdAt: string }>;
  timezone?: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.round(Math.max(min, Math.min(max, value)));
}

function money(cents?: number | null, currency = "AUD") {
  if (cents == null || cents <= 0) return null;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function appLabel(id: string) {
  return APP_LABELS[id] ?? id.replace(/-/g, " ");
}

function layer(
  id: TwinLayerId,
  label: string,
  icon: string,
  completeness: number,
  summary: string,
  signals: TwinSignal[],
  gaps: string[],
): TwinLayer {
  return { id, label, icon, completeness: clamp(completeness), summary, signals, gaps };
}

function buildIdentityLayer(input: BuildDigitalTwinDashboardInput): TwinLayer {
  const { identity, brandVoice, contact } = input.context;
  let score = 20;
  const gaps: string[] = [];
  const signals: TwinSignal[] = [];

  if (identity.businessName) {
    score += 15;
    signals.push({ label: "Business", value: identity.businessName });
  } else gaps.push("Add business name to Business Profile");

  if (identity.industry) {
    score += 10;
    signals.push({ label: "Industry", value: identity.industry.replace(/_/g, " ") });
  } else gaps.push("Set industry vertical");

  if (brandVoice.services) {
    score += 15;
    signals.push({ label: "Services", value: brandVoice.services.slice(0, 60) });
  } else gaps.push("Describe products and services");

  if (identity.website) {
    score += 10;
    signals.push({ label: "Website", value: identity.website, href: identity.website });
  } else gaps.push("Add website URL");

  if (identity.locations.length) {
    score += 10;
    signals.push({ label: "Location", value: identity.locations[0]?.formatted ?? "Set" });
  }

  if (Object.keys(contact.social).length >= 2) score += 10;
  else if (Object.keys(contact.social).length === 1) score += 5;
  else gaps.push("Add social / Google Business links");

  if (brandVoice.targetAudience) score += 10;
  if (identity.logoUrl || identity.iconUrl) score += 10;

  return layer(
    "identity",
    "Identity",
    "🪪",
    score,
    "Who the business is — profile, brand, market and public identity.",
    signals,
    gaps,
  );
}

function buildCommercialLayer(input: BuildDigitalTwinDashboardInput): TwinLayer {
  const metrics = input.metrics;
  const snapshot = input.snapshot;
  const currency = input.context.currency;
  let score = 15;
  const gaps: string[] = [];
  const signals: TwinSignal[] = [];

  const revenue = money(metrics?.revenueMtdCents, currency);
  if (revenue) {
    score += 25;
    signals.push({ label: "Revenue MTD", value: revenue, href: "/apps/commerce" });
  } else gaps.push("Connect commerce or accounting for revenue signals");

  const pipeline = snapshot?.metrics.pipelineValue;
  if (pipeline && pipeline > 0) {
    score += 20;
    signals.push({
      label: "Pipeline",
      value: money(Math.round(pipeline * 100), currency) ?? String(pipeline),
      href: "/apps/crm/opportunities",
    });
  } else if ((metrics?.openOpportunityCount ?? 0) > 0) {
    score += 15;
    signals.push({
      label: "Open opportunities",
      value: String(metrics?.openOpportunityCount),
      href: "/apps/crm/opportunities",
    });
  } else gaps.push("Add CRM opportunities to model commercial momentum");

  if ((metrics?.overdueArCents ?? 0) > 0) {
    signals.push({
      label: "Overdue AR",
      value: money(metrics?.overdueArCents, currency) ?? "—",
      href: "/apps/commerce/invoices",
    });
    score += 5;
  }

  if ((metrics?.activeSubscriptions ?? 0) > 0) score += 10;

  return layer(
    "commercial",
    "Commercial",
    "💰",
    score,
    "Revenue, pipeline, subscriptions and receivables from connected finance and CRM.",
    signals,
    gaps,
  );
}

function buildOperationsLayer(input: BuildDigitalTwinDashboardInput): TwinLayer {
  const metrics = input.metrics;
  let score = 20;
  const gaps: string[] = [];
  const signals: TwinSignal[] = [];

  if ((metrics?.contactCount ?? 0) > 0) {
    score += 20;
    signals.push({
      label: "Contacts",
      value: String(metrics?.contactCount),
      href: "/apps/crm/contacts",
    });
  } else gaps.push("Import CRM contacts");

  if ((metrics?.openLeadCount ?? 0) + (metrics?.openOpportunityCount ?? 0) > 0) {
    score += 15;
    signals.push({
      label: "Active enquiries",
      value: String((metrics?.openLeadCount ?? 0) + (metrics?.openOpportunityCount ?? 0)),
      href: "/apps/crm/leads",
    });
  }

  if ((metrics?.newLeadsThisWeek ?? 0) > 0) {
    score += 10;
    signals.push({ label: "New this week", value: String(metrics?.newLeadsThisWeek) });
  }

  if ((metrics?.consultationCount ?? 0) > 0) {
    score += 10;
    signals.push({
      label: "Consultations",
      value: String(metrics?.consultationCount),
      href: "/apps/crm/consultations",
    });
  }

  if ((metrics?.openTasksDue ?? 0) >= 0) {
    score += 10;
    signals.push({
      label: "Tasks due",
      value: String(metrics?.openTasksDue ?? 0),
      href: "/apps/crm/tasks",
    });
  }

  if (metrics?.hasTimelineActivity) score += 15;
  else gaps.push("Generate CRM or platform activity for operating signals");

  if ((metrics?.overdueFollowUps ?? 0) > 0) {
    gaps.push(`${metrics?.overdueFollowUps} overdue follow-up${metrics!.overdueFollowUps === 1 ? "" : "s"}`);
  }

  return layer(
    "operations",
    "Operations",
    "⚙️",
    score,
    "Customers, enquiries, tasks and day-to-day operating activity.",
    signals,
    gaps,
  );
}

function buildDigitalLayer(input: BuildDigitalTwinDashboardInput): TwinLayer {
  const scores = input.scores;
  const connectors = input.connectors;
  const reputation = input.reputation;
  let score = 10;
  const gaps: string[] = [];
  const signals: TwinSignal[] = [];

  const website = getScoreValue(scores?.scores ?? [], "website_health");
  if (website > 0) {
    score += 20;
    signals.push({ label: "Website health", value: `${website}/100`, href: "/apps/websites/health" });
  } else if (connectors?.website?.ok) {
    score += 15;
    signals.push({ label: "Website probe", value: "Connected", href: "/apps/websites/health" });
  } else gaps.push("Connect website health monitoring");

  const seo = getScoreValue(scores?.scores ?? [], "seo");
  if (seo > 0) {
    score += 15;
    signals.push({ label: "SEO", value: `${seo}/100`, href: "/apps/seo" });
  }

  const aiVis = getScoreValue(scores?.scores ?? [], "ai_visibility");
  if (aiVis > 0) {
    score += 15;
    signals.push({ label: "AI Visibility", value: `${aiVis}/100`, href: "/apps/ai-visibility" });
  }

  if (reputation?.score != null) {
    score += 15;
    signals.push({
      label: "Reputation",
      value: `${reputation.score}/100`,
      href: "/apps/reviews",
    });
  } else gaps.push("Connect review feeds for reputation signals");

  if ((input.snapshot?.metrics.connectedConnectors ?? 0) > 0) {
    score += Math.min(20, (input.snapshot?.metrics.connectedConnectors ?? 0) * 5);
    signals.push({
      label: "Connectors",
      value: String(input.snapshot?.metrics.connectedConnectors ?? 0),
      href: "/dashboard/settings/connectors",
    });
  } else gaps.push("Connect WordPress, Stripe, Google, or other systems");

  return layer(
    "digital",
    "Digital presence",
    "🌐",
    score,
    "Website, search, AI visibility, reviews and connected digital systems.",
    signals,
    gaps,
  );
}

function buildIntelligenceLayer(input: BuildDigitalTwinDashboardInput): TwinLayer {
  const scores = input.scores;
  const brain = input.brain;
  let score = 15;
  const gaps: string[] = [];
  const signals: TwinSignal[] = [];

  if (scores?.businessHealth) {
    score += 25;
    signals.push({
      label: "Business Health",
      value: `${scores.businessHealth}/100`,
      href: "/dashboard/health",
    });
  } else gaps.push("Connect live data to calculate Business Health");

  if (brain && brain.percent > 0) {
    score += 20;
    signals.push({
      label: "Business Brain",
      value: `${brain.percent}% complete`,
      href: "/dashboard/brain",
    });
  }

  if (input.context.goals.length > 0) {
    score += 15;
    signals.push({
      label: "Goals",
      value: `${input.context.goals.length} active`,
      href: "/dashboard/goals",
    });
  } else gaps.push("Set business goals for Advisor prioritisation");

  const automation = getScoreValue(scores?.scores ?? [], "automation");
  if (automation > 0) {
    score += 10;
    signals.push({ label: "Automation", value: `${automation}/100`, href: "/apps/automation" });
  }

  return layer(
    "intelligence",
    "Intelligence",
    "🧠",
    score,
    "Scores, Brain completeness, goals and interpreted signals that power Advisor and Health.",
    signals,
    gaps,
  );
}

function buildConnectedSystems(input: BuildDigitalTwinDashboardInput): TwinConnectedSystem[] {
  const connectors = input.connectors;
  const enabled = new Set(input.context.enabledAppIds);
  const rows: TwinConnectedSystem[] = [];

  const add = (id: string, label: string, status: TwinConnectedSystem["status"]) => {
    rows.push({ id, label, status });
  };

  if (connectors?.website?.ok) add("website", "Website health", "live");
  else if (enabled.has("websites")) add("website", "Website", "partial");

  if (connectors?.wordpress?.ok) add("wordpress", "WordPress", "live");
  if (connectors?.stripeOk) add("stripe", "Stripe", "live");
  if (connectors?.comms?.ok) add("communications", "Communications", "live");
  else if (
    hasAdvancedCommsEntitlement({ enabledAppIds: [...enabled] }) ||
    enabled.has("communications")
  ) {
    add("communications", "Communications", "partial");
  }

  if (enabled.has("crm")) add("crm", "CRM", input.metrics?.hasContacts ? "live" : "partial");
  if (enabled.has("commerce")) add("commerce", "Commerce", (input.metrics?.revenueMtdCents ?? 0) > 0 ? "live" : "partial");
  if (enabled.has("real-estate")) add("real-estate", "Real Estate", "live");
  if (enabled.has("accommodation")) add("accommodation", "Accommodation", "live");
  if (enabled.has("automation")) add("automation", "Automation", "partial");

  if (!rows.length) {
    add("connectors", "No live connectors", "offline");
  }

  return rows;
}

/** Build tenant Digital Twin dashboard from live snapshot and business context. */
export function buildDigitalTwinDashboard(
  input: BuildDigitalTwinDashboardInput,
): DigitalTwinDashboardBundle {
  const layers = [
    buildIdentityLayer(input),
    buildCommercialLayer(input),
    buildOperationsLayer(input),
    buildDigitalLayer(input),
    buildIntelligenceLayer(input),
  ];

  const overallCompleteness = clamp(
    layers.reduce((sum, item) => sum + item.completeness, 0) / layers.length,
  );

  const capturedAtLabel = input.snapshot
    ? new Date(input.snapshot.capturedAt).toLocaleString("en-AU", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: input.timezone || input.context.identity.timezone || "Australia/Brisbane",
      })
    : null;

  const { identity, brandVoice, contact } = input.context;
  const contextSummary = [
    identity.industry ? `Industry: ${identity.industry.replace(/_/g, " ")}` : null,
    brandVoice.services ? `Offers: ${brandVoice.services}` : null,
    brandVoice.targetAudience ? `Audience: ${brandVoice.targetAudience}` : null,
    identity.locations[0]?.formatted ? `Location: ${identity.locations[0].formatted}` : null,
    identity.website ? `Website: ${identity.website}` : null,
    contact.businessEmail ? `Email: ${contact.businessEmail}` : null,
  ].filter(Boolean) as string[];

  return {
    generatedAt: new Date().toISOString(),
    scoresLive: Boolean(input.metrics && input.scores),
    organisationName: identity.businessName,
    tagline: brandVoice.tagline ?? null,
    capturedAtLabel,
    overallCompleteness,
    businessHealth: input.scores?.businessHealth ?? input.snapshot?.scores.businessHealth ?? null,
    layers,
    connectedSystems: buildConnectedSystems(input),
    enabledApps: input.context.enabledAppIds.map((id) => ({ id, label: appLabel(id) })),
    intelligenceSurfaces: [
      {
        label: "Business Brain",
        href: "/dashboard/brain",
        description: "Interprets Twin signals into business understanding",
      },
      {
        label: "Business Health",
        href: "/dashboard/health",
        description: "Vital signs and predictive health from Twin data",
      },
      {
        label: "Benchmarks",
        href: "/dashboard/benchmarks",
        description: "External context — how you compare",
      },
      {
        label: "AI Advisor",
        href: "/dashboard/advisor",
        description: "Decisions and recommended actions from Twin + Brain",
      },
      {
        label: "Overview",
        href: "/dashboard",
        description: "Command Centre home — briefing and priorities",
      },
    ],
    contextSummary,
    recentActivity: (input.activities ?? []).slice(0, 8).map((item) => ({
      id: item.id,
      timeLabel: new Date(item.createdAt).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
      }),
      title: item.body ? `${item.title} — ${item.body}` : item.title,
    })),
    snapshot: input.snapshot ?? null,
  };
}

export { SYSTEM_LABELS, appLabel };
