import { getCommerceFinancialSnapshot } from "../commerce/payment-engine";
import { fetchOrgGoogleWebEvidence } from "../connectors/google/analytics";
import { fetchOrgGoogleAdsEvidence } from "../connectors/google/ads";
import { fetchOrgMetaAdsEvidence } from "../connectors/meta/auth";
import { fetchOrgMicrosoftAdsEvidence } from "../connectors/microsoft/ads";
import { fetchOrgTikTokAdsEvidence } from "../connectors/tiktok/ads";
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
  const marketing = web && (web.analytics || web.search)
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
      }
    : null;

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
    marketing,
  };
}
