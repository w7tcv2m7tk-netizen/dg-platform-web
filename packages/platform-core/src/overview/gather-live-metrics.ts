import { getCommerceFinancialSnapshot } from "../commerce/payment-engine";
import { fetchOrgGoogleWebEvidence } from "../connectors/google/analytics";
import { fetchOrgGoogleAdsEvidence } from "../connectors/google/ads";
import { fetchOrgMetaAdsEvidence } from "../connectors/meta/auth";
import { fetchOrgMicrosoftAdsEvidence } from "../connectors/microsoft/ads";
import { fetchOrgTikTokAdsEvidence } from "../connectors/tiktok/ads";
import { fetchOrgMetaInstagramEvidence } from "../connectors/meta/auth";
import { fetchOrgLinkedInCompanyEvidence } from "../connectors/linkedin/auth";
import { fetchOrgYouTubeContentEvidence, fetchOrgYouTubeAnalyticsEvidence } from "../connectors/google/youtube";
import { getOrgGbpSyncSnapshot } from "../connectors/google/gbp";
import { listLeads } from "../leads";
import { getPlatformSetupStatus } from "../org/setup-status";
import { listProperties } from "../properties";
import { computeReputationScore, mapGbpReviewsToFeed } from "../reviews";
import { buildAdvertisingEvidence, withDerivedAdvertisingMetrics, type AdvertisingEvidence } from "./advertising-evidence";

export interface OverviewLiveMetrics {
  contactCount: number;
  activityCount: number;
  hasContacts: boolean;
  hasTimelineActivity: boolean;
  vendorLeadCount: number;
  buyerLeadCount: number;
  newLeadsThisWeek: number;
  overdueFollowUps: number;
  listedPropertyCount: number;
  pipelineValueCents: number;
  openTasksDue: number;
  revenueMtdCents: number;
  revenueYtdCents: number;
  outstandingArCents: number;
  overdueArCents: number;
  activeSubscriptions: number;
  openOpportunityCount: number;
  openLeadCount: number;
  consultationCount: number;
  /** Measured Reputation Score™ from the organisation's canonical connected review evidence. */
  reputationScore: number | null;
  reputationReviewCount: number;
  /** Canonical provider-neutral advertising evidence. */
  advertising: AdvertisingEvidence | null;
  /** Canonical organisation-scoped organic social evidence. Null means no usable authorised evidence is connected. */
  social: {
    instagramFollowers: number | null;
    instagramFollowing: number | null;
    instagramMediaCount: number | null;
    instagramRecentMediaCount: number | null;
    instagramRecentLikes: number | null;
    instagramRecentComments: number | null;
    linkedInCompanyConnected: boolean;
    youtubeChannelCount: number | null;
    youtubeRecentVideoCount: number | null;
    youtubeViews30d: number | null;
    youtubeWatchMinutes30d: number | null;
    youtubeAverageViewDuration30d: number | null;
    youtubeSubscribersGained30d: number | null;
    youtubeSubscribersLost30d: number | null;
  } | null;
  /** Canonical organisation-scoped Google web evidence. Null means no usable evidence is connected. */
  marketing: {
    period: string;
    activeUsers: number | null;
    sessions: number | null;
    engagedSessions: number | null;
    keyEvents: number | null;
    searchClicks: number | null;
    searchImpressions: number | null;
    searchCtr: number | null;
    searchPosition: number | null;
    /** Explicit source state; genuine zero metrics remain available evidence. */
    sources: { analytics: "available" | "not_configured" | "failed"; search: "available" | "not_configured" | "failed" };
  } | null;
}

function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Aggregate live KPIs and canonical connector evidence for Business Overview. */
export async function gatherOverviewLiveMetrics(
  organisationId: string,
  options: { includeFinancials?: boolean } = {},
): Promise<OverviewLiveMetrics> {
  const { prisma } = await import("@dg/database");
  const weekStart = startOfWeek();
  const todayEnd = endOfToday();
  const now = new Date();
  const includeFinancials = options.includeFinancials !== false;

  const [
    setupStatus,
    financial,
    vendorLeads,
    buyerLeads,
    newLeadsThisWeek,
    overdueFollowUps,
    listedProperties,
    pipelineAgg,
    openTasksDue,
    openOpportunityCount,
    openLeadCount,
    consultationCount,
    gbp,
    googleWebEvidence,
    googleAdsEvidence,
    metaAdsEvidence,
    microsoftAdsEvidence,
    tiktokAdsEvidence,
    instagramEvidence,
    linkedInEvidence,
    youtubeContent,
    youtubeAnalytics,
  ] = await Promise.all([
    getPlatformSetupStatus(organisationId),
    includeFinancials ? getCommerceFinancialSnapshot(organisationId) : Promise.resolve(null),
    listLeads({ organisationId, leadType: "vendor", limit: 1 }),
    listLeads({ organisationId, leadType: "buyer", limit: 1 }),
    prisma.lead.count({ where: { organisationId, createdAt: { gte: weekStart } } }),
    prisma.lead.count({
      where: { organisationId, responseDueAt: { lt: now }, firstResponseAt: null },
    }),
    listProperties({ organisationId, status: "listed", limit: 1 }),
    prisma.property.aggregate({
      where: {
        organisationId,
        status: { in: ["listed", "under_offer", "contract_signed", "unconditional", "appraisal"] },
        listingPriceCents: { not: null },
      },
      _sum: { listingPriceCents: true },
    }),
    prisma.task.count({ where: { organisationId, status: "open", dueAt: { lte: todayEnd } } }),
    prisma.opportunity.count({ where: { organisationId, status: "open" } }),
    prisma.lead.count({
      where: { organisationId, status: { notIn: ["converted", "lost", "closed", "junk"] } },
    }),
    prisma.opportunity.count({
      where: { organisationId, status: "open", pipelineId: "platform_consultation" },
    }),
    getOrgGbpSyncSnapshot(organisationId),
    fetchOrgGoogleWebEvidence(organisationId).catch(() => null),
    fetchOrgGoogleAdsEvidence(organisationId).catch(() => null),
    fetchOrgMetaAdsEvidence(organisationId).catch(() => null),
    fetchOrgMicrosoftAdsEvidence(organisationId).catch(() => null),
    fetchOrgTikTokAdsEvidence(organisationId).catch(() => null),
    fetchOrgMetaInstagramEvidence(organisationId).catch(() => null),
    fetchOrgLinkedInCompanyEvidence(organisationId).catch(() => null),
    fetchOrgYouTubeContentEvidence(organisationId).catch(() => null),
    fetchOrgYouTubeAnalyticsEvidence(organisationId).catch(() => null),
  ]);

  const advertisingChannels = [];
  if (googleAdsEvidence?.ok && googleAdsEvidence.data.length) {
    advertisingChannels.push(withDerivedAdvertisingMetrics({
      provider: "google", period: "LAST_30_DAYS",
      spend: googleAdsEvidence.data.reduce((n, x) => n + x.performance.spend, 0),
      impressions: googleAdsEvidence.data.reduce((n, x) => n + x.performance.impressions, 0),
      clicks: googleAdsEvidence.data.reduce((n, x) => n + x.performance.clicks, 0),
      conversions: googleAdsEvidence.data.reduce((n, x) => n + x.performance.conversions, 0),
      conversionValue: googleAdsEvidence.data.reduce((n, x) => n + x.performance.conversionsValue, 0),
      reach: null, campaignCount: googleAdsEvidence.data.reduce((n, x) => n + x.campaigns.length, 0),
    }));
  }
  if (metaAdsEvidence?.ok && metaAdsEvidence.data.length) {
    advertisingChannels.push(withDerivedAdvertisingMetrics({
      provider: "meta", period: "LAST_30_DAYS",
      spend: metaAdsEvidence.data.reduce((n, x) => n + x.performance.spend, 0),
      impressions: metaAdsEvidence.data.reduce((n, x) => n + x.performance.impressions, 0),
      clicks: metaAdsEvidence.data.reduce((n, x) => n + x.performance.clicks, 0),
      conversions: null, conversionValue: null,
      reach: metaAdsEvidence.data.reduce((n, x) => n + x.performance.reach, 0),
      campaignCount: metaAdsEvidence.data.reduce((n, x) => n + x.campaigns.length, 0),
    }));
  }
  if (microsoftAdsEvidence?.ok && microsoftAdsEvidence.data.length) {
    advertisingChannels.push(withDerivedAdvertisingMetrics({
      provider: "microsoft", period: "LAST_30_DAYS",
      spend: microsoftAdsEvidence.data.reduce((n, x) => n + x.performance.spend, 0),
      impressions: microsoftAdsEvidence.data.reduce((n, x) => n + x.performance.impressions, 0),
      clicks: microsoftAdsEvidence.data.reduce((n, x) => n + x.performance.clicks, 0),
      conversions: microsoftAdsEvidence.data.reduce((n, x) => n + x.performance.conversions, 0),
      conversionValue: microsoftAdsEvidence.data.reduce((n, x) => n + x.performance.conversionValue, 0),
      reach: null, campaignCount: microsoftAdsEvidence.data.reduce((n, x) => n + x.campaigns.length, 0),
    }));
  }
  if (tiktokAdsEvidence?.ok && tiktokAdsEvidence.data.length) {
    advertisingChannels.push(withDerivedAdvertisingMetrics({
      provider:"tiktok",period:"LAST_30_DAYS",
      spend:tiktokAdsEvidence.data.reduce((n,x)=>n+x.performance.spend,0),
      impressions:tiktokAdsEvidence.data.reduce((n,x)=>n+x.performance.impressions,0),
      clicks:tiktokAdsEvidence.data.reduce((n,x)=>n+x.performance.clicks,0),
      conversions:tiktokAdsEvidence.data.reduce((n,x)=>n+x.performance.conversions,0),
      conversionValue:tiktokAdsEvidence.data.reduce((n,x)=>n+x.performance.conversionValue,0),
      reach:null,campaignCount:tiktokAdsEvidence.data.reduce((n,x)=>n+x.campaigns.length,0),
    }));
  }
  const advertising = buildAdvertisingEvidence(advertisingChannels);
  const reputation = computeReputationScore(mapGbpReviewsToFeed(gbp?.reviews ?? []));
  const web = googleWebEvidence?.ok ? googleWebEvidence.data : null;
  const marketing = web
    ? {
        period: web.period,
        activeUsers: web.analytics?.activeUsers ?? null,
        sessions: web.analytics?.sessions ?? null,
        engagedSessions: web.analytics?.engagedSessions ?? null,
        keyEvents: web.analytics?.keyEvents ?? null,
        searchClicks: web.search?.clicks ?? null,
        searchImpressions: web.search?.impressions ?? null,
        searchCtr: web.search?.ctr ?? null,
        searchPosition: web.search?.position ?? null,
        sources: web.sources,
      }
    : null;

  const instagramRows = instagramEvidence?.ok ? instagramEvidence.data : [];
  const youtubeContentRows = youtubeContent?.ok ? youtubeContent.data : [];
  const youtubeAnalyticsRows = youtubeAnalytics?.ok ? youtubeAnalytics.data : [];
  const hasSocialEvidence = instagramRows.length > 0 || Boolean(linkedInEvidence?.ok) || youtubeContentRows.length > 0 || youtubeAnalyticsRows.length > 0;
  const social = hasSocialEvidence ? {
    instagramFollowers: instagramRows.length ? instagramRows.reduce((n, row) => n + (row.followersCount ?? 0), 0) : null,
    instagramFollowing: instagramRows.length ? instagramRows.reduce((n, row) => n + (row.followsCount ?? 0), 0) : null,
    instagramMediaCount: instagramRows.length ? instagramRows.reduce((n, row) => n + (row.mediaCount ?? 0), 0) : null,
    instagramRecentMediaCount: instagramRows.length ? instagramRows.reduce((n, row) => n + row.media.length, 0) : null,
    instagramRecentLikes: instagramRows.length ? instagramRows.reduce((n, row) => n + row.media.reduce((sum, item) => sum + (item.likeCount ?? 0), 0), 0) : null,
    instagramRecentComments: instagramRows.length ? instagramRows.reduce((n, row) => n + row.media.reduce((sum, item) => sum + (item.commentsCount ?? 0), 0), 0) : null,
    linkedInCompanyConnected: Boolean(linkedInEvidence?.ok),
    youtubeChannelCount: youtubeContentRows.length ? youtubeContentRows.length : youtubeAnalyticsRows.length ? youtubeAnalyticsRows.length : null,
    youtubeRecentVideoCount: youtubeContentRows.length ? youtubeContentRows.reduce((n, row) => n + row.videos.length, 0) : null,
    youtubeViews30d: youtubeAnalyticsRows.length ? youtubeAnalyticsRows.reduce((n, row) => n + row.views, 0) : null,
    youtubeWatchMinutes30d: youtubeAnalyticsRows.length ? youtubeAnalyticsRows.reduce((n, row) => n + row.estimatedMinutesWatched, 0) : null,
    youtubeAverageViewDuration30d: youtubeAnalyticsRows.length ? youtubeAnalyticsRows.reduce((n, row) => n + row.averageViewDuration, 0) / youtubeAnalyticsRows.length : null,
    youtubeSubscribersGained30d: youtubeAnalyticsRows.length ? youtubeAnalyticsRows.reduce((n, row) => n + row.subscribersGained, 0) : null,
    youtubeSubscribersLost30d: youtubeAnalyticsRows.length ? youtubeAnalyticsRows.reduce((n, row) => n + row.subscribersLost, 0) : null,
  } : null;

  return {
    contactCount: setupStatus.contactCount,
    activityCount: setupStatus.activityCount,
    hasContacts: setupStatus.hasContacts,
    hasTimelineActivity: setupStatus.hasTimelineActivity,
    vendorLeadCount: vendorLeads.meta.total,
    buyerLeadCount: buyerLeads.meta.total,
    newLeadsThisWeek,
    overdueFollowUps,
    listedPropertyCount: listedProperties.meta.total,
    pipelineValueCents: pipelineAgg._sum.listingPriceCents ?? 0,
    openTasksDue,
    revenueMtdCents: financial?.revenueMtdCents ?? 0,
    revenueYtdCents: financial?.revenueYtdCents ?? 0,
    outstandingArCents: financial?.outstandingArCents ?? 0,
    overdueArCents: financial?.overdueArCents ?? 0,
    activeSubscriptions: financial?.activeSubscriptions ?? 0,
    openOpportunityCount,
    openLeadCount,
    consultationCount,
    reputationScore: reputation.score,
    reputationReviewCount: reputation.reviewCount,
    advertising,
    social,
    marketing,
  };
}
