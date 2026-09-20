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
export function captureDigitalTwinSnapshot(input: CaptureTwinSnapshotInput): DigitalTwinSnapshot {
  const { organisationId, organisationName, enabledAppIds, metrics, connectors, profile } = input;
  const displayName = profile?.tradingName?.trim() || profile?.businessName?.trim() || organisationName;
  const brandColours = profile?.brandColours
    ? profile.brandColours.split(/[,;]+/).map((c) => c.trim()).filter(Boolean)
    : undefined;

  const connected: string[] = [];
  if (enabledAppIds.includes("crm")) connected.push("crm");
  if (connectors.website?.ok || enabledAppIds.includes("websites")) connected.push("website");
  if (connectors.wordpress?.ok) connected.push("wordpress");
  if (connectors.stripeOk) connected.push("stripe");
  if (enabledAppIds.includes("real-estate")) connected.push("real-estate");
  if (enabledAppIds.includes("accommodation")) connected.push("accommodation");
  if (enabledAppIds.includes("commerce")) connected.push("commerce");
  if (enabledAppIds.includes("automation")) connected.push("automation");
  if (metrics.reputationReviewCount > 0) connected.push("reputation");
  if (metrics.marketing) connected.push("google-marketing");
  if (metrics.social?.linkedInCompanyConnected) connected.push("linkedin");
  if (metrics.social?.instagramFollowers !== null && metrics.social?.instagramFollowers !== undefined) connected.push("instagram");
  if (metrics.social?.youtubeChannelCount !== null && metrics.social?.youtubeChannelCount !== undefined) connected.push("youtube");
  if (connectors.comms?.ok || hasAdvancedCommsEntitlement({ enabledAppIds })) connected.push("communications");

  const websiteScore = connectors.website?.score;
  const pipelineValue = metrics.pipelineValueCents > 0 ? metrics.pipelineValueCents / 100 : undefined;

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
      reputation: metrics.reputationScore ?? undefined,
      calculatedAt: new Date(),
    },
    metrics: {
      contactCount: metrics.contactCount,
      activeLeads: metrics.openLeadCount ?? metrics.vendorLeadCount + metrics.buyerLeadCount,
      pipelineValue,
      openTasks: metrics.openTasksDue,
      connectedConnectors: connected.length,
      webActiveUsers30d: metrics.marketing?.activeUsers ?? undefined,
      webSessions30d: metrics.marketing?.sessions ?? undefined,
      webEngagedSessions30d: metrics.marketing?.engagedSessions ?? undefined,
      webKeyEvents30d: metrics.marketing?.keyEvents ?? undefined,
      searchClicks30d: metrics.marketing?.searchClicks ?? undefined,
      searchImpressions30d: metrics.marketing?.searchImpressions ?? undefined,
      searchCtr30d: metrics.marketing?.searchCtr ?? undefined,
      searchPosition30d: metrics.marketing?.searchPosition ?? undefined,
      webAnalyticsStatus: metrics.marketing?.sources.analytics,
      searchConsoleStatus: metrics.marketing?.sources.search,
      instagramFollowers: metrics.social?.instagramFollowers ?? undefined,
      instagramFollowing: metrics.social?.instagramFollowing ?? undefined,
      instagramMediaCount: metrics.social?.instagramMediaCount ?? undefined,
      instagramRecentMediaCount: metrics.social?.instagramRecentMediaCount ?? undefined,
      instagramRecentLikes: metrics.social?.instagramRecentLikes ?? undefined,
      instagramRecentComments: metrics.social?.instagramRecentComments ?? undefined,
      youtubeChannelCount: metrics.social?.youtubeChannelCount ?? undefined,
      youtubeRecentVideoCount: metrics.social?.youtubeRecentVideoCount ?? undefined,
      youtubeViews30d: metrics.social?.youtubeViews30d ?? undefined,
      youtubeWatchMinutes30d: metrics.social?.youtubeWatchMinutes30d ?? undefined,
      youtubeAverageViewDuration30d: metrics.social?.youtubeAverageViewDuration30d ?? undefined,
      youtubeSubscribersGained30d: metrics.social?.youtubeSubscribersGained30d ?? undefined,
      youtubeSubscribersLost30d: metrics.social?.youtubeSubscribersLost30d ?? undefined,
      advertisingSpend30d: metrics.advertising?.totals.spend ?? undefined,
      advertisingImpressions30d: metrics.advertising?.totals.impressions ?? undefined,
      advertisingClicks30d: metrics.advertising?.totals.clicks ?? undefined,
      advertisingConversions30d: metrics.advertising?.totals.conversions ?? undefined,
      advertisingConversionValue30d: metrics.advertising?.totals.conversionValue ?? undefined,
      advertisingCampaignCount30d: metrics.advertising?.totals.campaignCount ?? undefined,
      revenueMtdCents: metrics.revenueMtdCents,
      reputationReviewCount: metrics.reputationReviewCount,
      outstandingArCents: metrics.outstandingArCents,
      overdueArCents: metrics.overdueArCents,
      mrrCents: undefined,
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
