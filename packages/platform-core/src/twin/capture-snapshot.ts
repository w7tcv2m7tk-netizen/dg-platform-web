import type { OverviewConnectorProbes } from "../overview/connector-probes";
import type { OverviewLiveMetrics } from "../overview/gather-live-metrics";
import { hasAdvancedCommsEntitlement } from "../communications/entitlements";
import type { DigitalTwinSnapshot } from "./types";

export interface CaptureTwinSnapshotInput {
  organisationId: string;
  organisationName: string;
  enabledAppIds: string[];
  metrics: OverviewLiveMetrics;
  connectors: OverviewConnectorProbes;
  profile?: {
    businessName?: string;
    tradingName?: string;
    logoUrl?: string;
    brandColours?: string;
    websiteUrl?: string;
    brandVoice?: { tagline?: string };
  } | null;
}

/** Build a Digital Twin snapshot from live metrics and connector probes. */
export function captureDigitalTwinSnapshot(
  input: CaptureTwinSnapshotInput,
): DigitalTwinSnapshot {
  const { organisationId, organisationName, enabledAppIds, metrics, connectors, profile } =
    input;

  const displayName =
    profile?.tradingName?.trim() ||
    profile?.businessName?.trim() ||
    organisationName;
  const brandColours = profile?.brandColours
    ? profile.brandColours.split(/[,;]+/).map((c) => c.trim()).filter(Boolean)
    : undefined;

  const connected: string[] = [];
  if (enabledAppIds.includes("crm")) connected.push("crm");
  if (connectors.website?.ok || enabledAppIds.includes("websites")) {
    connected.push("website");
  }
  if (connectors.wordpress?.ok) connected.push("wordpress");
  if (connectors.stripeOk) connected.push("stripe");
  if (enabledAppIds.includes("real-estate")) connected.push("real-estate");
  if (enabledAppIds.includes("accommodation")) connected.push("accommodation");
  if (enabledAppIds.includes("commerce")) connected.push("commerce");
  if (enabledAppIds.includes("automation")) connected.push("automation");
  if (connectors.comms?.ok || hasAdvancedCommsEntitlement({ enabledAppIds })) {
    connected.push("communications");
  }

  const websiteScore = connectors.website?.score;
  const hasRe = enabledAppIds.includes("real-estate");
  const rePipeline =
    connectors.reSummary?.vendorPipelineTotal ?? metrics.vendorLeadCount;
  const pipelineValue =
    metrics.pipelineValueCents > 0
      ? metrics.pipelineValueCents / 100
      : hasRe && rePipeline > 0
        ? rePipeline * 450_000
        : undefined;

  return {
    organisationId,
    version: 1,
    capturedAt: new Date(),
    brand: {
      name: displayName,
      tagline: profile?.brandVoice?.tagline,
      colours: brandColours?.length ? brandColours : undefined,
      logoAssetId: profile?.logoUrl,
    },
    scores: {
      websiteHealth: websiteScore,
      calculatedAt: new Date(),
    },
    metrics: {
      contactCount: metrics.contactCount,
      activeLeads:
        metrics.openLeadCount ??
        metrics.vendorLeadCount + metrics.buyerLeadCount,
      pipelineValue,
      openTasks: metrics.openTasksDue,
      connectedConnectors: connected.length,
      revenueMtdCents: metrics.revenueMtdCents,
      outstandingArCents: metrics.outstandingArCents,
      overdueArCents: metrics.overdueArCents,
      mrrCents: metrics.activeSubscriptions > 0 ? metrics.revenueMtdCents : 0,
      openOpportunities: metrics.openOpportunityCount,
      consultations: metrics.consultationCount,
      newEnquiriesThisWeek: metrics.newLeadsThisWeek,
    },
    connectors: connected,
    domains: [],
    websites: connectors.website?.siteLabel
      ? [connectors.website.siteLabel]
      : profile?.websiteUrl
        ? [profile.websiteUrl]
        : [],
  };
}
