import type { BusinessContext } from "../org/business-context";
import type { PlatformSetupStatus } from "../org/setup-status";
import type { OrgScoresResult } from "../scoring/calculate-scores";
import { BUSINESS_BRAIN_CONNECTED_SOURCES } from "./knowledge-layers";
import { buildBusinessBrain } from "./build";
import type {
  BusinessBrainDashboardBundle,
  BusinessBrainIntelligenceSurface,
  BusinessBrainPriorityGap,
} from "./dashboard-types";

export type BuildBusinessBrainDashboardInput = {
  context: BusinessContext;
  setup?: PlatformSetupStatus | null;
  connectorCount?: number;
  scores?: OrgScoresResult | null;
  twinCompleteness?: number | null;
  metricsLive?: boolean;
};

function buildUnderstandingSummary(context: BusinessContext): string[] {
  const { identity, brandVoice, contact, goals } = context;
  return [
    identity.industry ? `Industry: ${identity.industry.replace(/_/g, " ")}` : null,
    brandVoice.services ? `Offers: ${brandVoice.services}` : null,
    brandVoice.targetAudience ? `Audience: ${brandVoice.targetAudience}` : null,
    brandVoice.tone ? `Brand voice: ${brandVoice.tone}` : null,
    identity.locations[0]?.formatted ? `Location: ${identity.locations[0].formatted}` : null,
    goals.length ? `Goals: ${goals.length} active` : null,
    contact.businessEmail ? `Contact: ${contact.businessEmail}` : null,
    context.twin.connectedSystems.length
      ? `Connected systems: ${context.twin.connectedSystems.length}`
      : null,
  ].filter(Boolean) as string[];
}

function buildPriorityGaps(
  brain: ReturnType<typeof buildBusinessBrain>,
): BusinessBrainPriorityGap[] {
  return brain.dimensions
    .flatMap((dimension) =>
      dimension.fields
        .filter((field) => field.status !== "ready")
        .map((field) => ({
          id: `${dimension.id}-${field.id}`,
          label: field.label,
          dimension: dimension.name,
          href: field.href,
          status: field.status === "partial" ? ("partial" as const) : ("missing" as const),
        })),
    )
    .slice(0, 8);
}

const INTELLIGENCE_SURFACES: BusinessBrainIntelligenceSurface[] = [
  {
    label: "Digital Twin",
    href: "/dashboard/twin",
    description: "Live operating state — what is happening right now",
  },
  {
    label: "Business Health",
    href: "/dashboard/health",
    description: "Vital signs interpreted from Twin data and Brain context",
  },
  {
    label: "Benchmarks",
    href: "/dashboard/benchmarks",
    description: "How you compare — external context for Brain-backed decisions",
  },
  {
    label: "Insights",
    href: "/dashboard/insights",
    description: "What DigitalGate is noticing from connected business activity",
  },
  {
    label: "AI Advisor",
    href: "/dashboard/advisor",
    description: "What to do — recommendations grounded in Brain understanding",
  },
  {
    label: "Analytics",
    href: "/apps/analytics",
    description: "The underlying numbers and evidence behind Brain interpretation",
  },
  {
    label: "Command Centre",
    href: "/dashboard",
    description: "What needs to happen next — Brain-backed priorities",
  },
];

/** Build tenant Business Brain Intelligence workspace bundle. */
export function buildBusinessBrainDashboard(
  input: BuildBusinessBrainDashboardInput,
): BusinessBrainDashboardBundle {
  const brain = buildBusinessBrain({
    context: input.context,
    setup: input.setup,
    connectorCount: input.connectorCount,
  });

  const enabled = new Set(input.context.enabledAppIds);
  const connectedSources = BUSINESS_BRAIN_CONNECTED_SOURCES.filter((source) => {
    if (source.id === "connectors") return true;
    if (source.id === "analytics") return enabled.has("analytics");
    return enabled.has(source.id);
  }).map((source) => ({ ...source }));

  return {
    generatedAt: new Date().toISOString(),
    scoresLive: Boolean(input.metricsLive),
    organisationName: brain.organisationName,
    completeness: brain.percent,
    readyCount: brain.readyCount,
    totalCount: brain.totalCount,
    twinCompleteness: input.twinCompleteness ?? null,
    businessHealth: input.scores?.businessHealth ?? null,
    understandingSummary: buildUnderstandingSummary(input.context),
    priorityGaps: buildPriorityGaps(brain),
    brain,
    connectedSources,
    intelligenceSurfaces: INTELLIGENCE_SURFACES,
  };
}
