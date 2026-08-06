import type { OverviewConnectorProbes } from "../overview/connector-probes";
import type { OverviewLiveMetrics } from "../overview/gather-live-metrics";
import type { DigitalTwinSnapshot } from "./types";

export interface CaptureTwinSnapshotInput {
  organisationId: string;
  organisationName: string;
  enabledAppIds: string[];
  metrics: OverviewLiveMetrics;
  connectors: OverviewConnectorProbes;
}

/** Build a Digital Twin snapshot from live metrics and connector probes. */
export function captureDigitalTwinSnapshot(
  input: CaptureTwinSnapshotInput,
): DigitalTwinSnapshot {
  const { organisationId, organisationName, enabledAppIds, metrics, connectors } = input;

  const connected: string[] = [];
  if (connectors.website?.ok) connected.push("website");
  if (connectors.wordpress?.ok) connected.push("wordpress");
  if (connectors.stripeOk) connected.push("stripe");
  if (enabledAppIds.includes("real-estate")) connected.push("real-estate");
  if (enabledAppIds.includes("accommodation")) connected.push("accommodation");
  if (enabledAppIds.includes("commerce")) connected.push("commerce");

  const websiteScore = connectors.website?.score;
  const rePipeline =
    connectors.reSummary?.vendorPipelineTotal ??
    metrics.vendorLeadCount;
  const pipelineValue =
    metrics.pipelineValueCents > 0
      ? metrics.pipelineValueCents / 100
      : rePipeline > 0
        ? rePipeline * 450_000
        : undefined;

  return {
    organisationId,
    version: 1,
    capturedAt: new Date(),
    brand: { name: organisationName },
    scores: {
      websiteHealth: websiteScore,
      calculatedAt: new Date(),
    },
    metrics: {
      contactCount: metrics.contactCount,
      activeLeads: metrics.vendorLeadCount + metrics.buyerLeadCount,
      pipelineValue,
      openTasks: metrics.openTasksDue,
      connectedConnectors: connected.length,
      revenueMtdCents: metrics.revenueMtdCents,
      outstandingArCents: metrics.outstandingArCents,
      overdueArCents: metrics.overdueArCents,
      mrrCents: metrics.activeSubscriptions > 0 ? metrics.revenueMtdCents : 0,
    },
    connectors: connected,
    domains: [],
    websites: connectors.website?.siteLabel ? [connectors.website.siteLabel] : [],
  };
}
