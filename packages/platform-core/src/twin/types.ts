/**
 * Digital Twin™ — complete digital state of an organisation.
 * Every score, recommendation, report, and AI insight is generated from the Twin.
 */

export interface DigitalTwinBrand {
  name: string;
  tagline?: string;
  colours?: string[];
  logoAssetId?: string;
}

export interface DigitalTwinScores {
  aiVisibility?: number;
  seo?: number;
  websiteHealth?: number;
  businessGrowth?: number;
  marketing?: number;
  businessHealth?: number;
  reputation?: number;
  automation?: number;
  calculatedAt?: Date;
}

export interface DigitalTwinSnapshot {
  organisationId: string;
  version: number;
  capturedAt: Date;

  brand: DigitalTwinBrand;
  scores: DigitalTwinScores;

  /** Counts and health indicators */
  metrics: {
    contactCount?: number;
    activeLeads?: number;
    pipelineValue?: number;
    openTasks?: number;
    connectedConnectors?: number;
    pendingAutomations?: number;
    unrepliedReviews?: number;
    openOpportunities?: number;
    consultations?: number;
    newEnquiriesThisWeek?: number;
    /** Canonical web marketing evidence (GA4 + Search Console). */
    webActiveUsers30d?: number;
    webSessions30d?: number;
    webEngagedSessions30d?: number;
    webKeyEvents30d?: number;
    searchClicks30d?: number;
    searchImpressions30d?: number;
    searchCtr30d?: number;
    searchPosition30d?: number;
    /** Canonical organisation-scoped Instagram evidence. */
    instagramFollowers?: number;
    instagramFollowing?: number;
    instagramMediaCount?: number;
    instagramRecentMediaCount?: number;
    instagramRecentLikes?: number;
    instagramRecentComments?: number;
    /** Canonical organisation-scoped YouTube evidence, last 30 days where applicable. */
    youtubeChannelCount?: number;
    youtubeRecentVideoCount?: number;
    youtubeViews30d?: number;
    youtubeWatchMinutes30d?: number;
    youtubeAverageViewDuration30d?: number;
    youtubeSubscribersGained30d?: number;
    youtubeSubscribersLost30d?: number;
    /** Canonical provider-neutral advertising evidence, last 30 days. */
    advertisingSpend30d?: number;
    advertisingImpressions30d?: number;
    advertisingClicks30d?: number;
    advertisingConversions30d?: number;
    advertisingConversionValue30d?: number;
    advertisingCampaignCount30d?: number;
    /** Commerce / Financial Health (Digital Twin™) */
    revenueMtdCents?: number;
    outstandingArCents?: number;
    overdueArCents?: number;
    mrrCents?: number;
    avgPaymentDays?: number;
    failedPayments30d?: number;
    refundRate?: number;
  };

  /** Connected system IDs */
  connectors: string[];
  domains: string[];
  websites: string[];

  /** Reference to knowledge graph snapshot */
  graphSnapshotId?: string;
}
