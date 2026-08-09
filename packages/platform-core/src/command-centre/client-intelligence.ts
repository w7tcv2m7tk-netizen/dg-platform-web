/**
 * Client Intelligence — Success Score™ + Agency Health Ranking.
 * @see docs/COMMAND-CENTRE.md
 */

import type {
  AgencyHealthRanking,
  AgencyHealthTier,
  ClientIntelligence,
  CommandClientRow,
} from "./types";
import {
  computeSuccessScore,
  type SuccessScoreBreakdown,
  type SuccessScoreInput,
} from "./success-score";
import type { OrgWordPressConnectorSettings } from "../connectors/wordpress/org-connector";

type OrgSettings = {
  connectors?: { wordpress?: OrgWordPressConnectorSettings };
  featureFlags?: Record<string, boolean>;
};

function wpConfigured(settings: unknown): boolean {
  const wp = (settings as OrgSettings | null)?.connectors?.wordpress;
  return Boolean(wp?.baseUrl?.trim() || wp?.apiKey?.trim() || wp?.lastVendorLeadSyncAt);
}

function wpLastSync(settings: unknown): string | null {
  const wp = (settings as OrgSettings | null)?.connectors?.wordpress;
  return (
    wp?.lastVendorLeadSyncAt ??
    wp?.lastAccBookingSyncAt ??
    wp?.lastPropertySyncAt ??
    wp?.lastBookingSyncAt ??
    null
  );
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export type EnrichedCommandClient = CommandClientRow & {
  successScore: number;
  healthTier: AgencyHealthTier;
  scoreBreakdown: SuccessScoreBreakdown;
  highlights: string[];
  rank: number;
};

export type ClientIntelligenceBundle = {
  generatedAt: string;
  clients: EnrichedCommandClient[];
  rankings: AgencyHealthRanking[];
  tierCounts: Record<AgencyHealthTier, number>;
  averageSuccessScore: number;
};

type CountRow = { organisationId: string; _count: { id: number } };
type SumRow = {
  organisationId: string;
  _sum: { amountCents: number | null; totalCents?: number | null };
  _count?: { id: number };
};

function countMap(rows: CountRow[]): Map<string, number> {
  return new Map(rows.map((r) => [r.organisationId, r._count.id]));
}

/** Load cross-tenant client intelligence with Success Score™. */
export async function getClientIntelligence(): Promise<ClientIntelligenceBundle> {
  const { prisma } = await import("@dg/database");
  const monthStart = startOfMonth();
  const now = new Date();

  const [
    orgRows,
    leadsThisMonth,
    openOpps,
    overdueLeads,
    activitiesThisMonth,
    listedProps,
    activeStays,
    activeSubs,
    invoicePaidMtd,
  ] = await Promise.all([
    prisma.organisation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 80,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        industry: true,
        billingCustomerId: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            memberships: true,
            contacts: true,
            leads: true,
            properties: true,
            stayBookings: true,
            appInstallations: true,
          },
        },
        appInstallations: {
          where: { enabled: true },
          select: { appId: true },
        },
      },
    }),
    prisma.lead.groupBy({
      by: ["organisationId"],
      where: { createdAt: { gte: monthStart } },
      _count: { id: true },
    }),
    prisma.opportunity.groupBy({
      by: ["organisationId"],
      where: { status: "open" },
      _count: { id: true },
    }),
    prisma.lead.groupBy({
      by: ["organisationId"],
      where: {
        responseDueAt: { lt: now },
        firstResponseAt: null,
      },
      _count: { id: true },
    }),
    prisma.activity.groupBy({
      by: ["organisationId"],
      where: { createdAt: { gte: monthStart } },
      _count: { id: true },
    }),
    prisma.property.groupBy({
      by: ["organisationId"],
      where: { status: "listed" },
      _count: { id: true },
    }),
    prisma.stayBooking.groupBy({
      by: ["organisationId"],
      where: { status: { in: ["confirmed", "airbnb", "bookingcom", "pending"] } },
      _count: { id: true },
    }),
    prisma.commerceSubscription.groupBy({
      by: ["organisationId"],
      where: { status: "active" },
      _count: { id: true },
      _sum: { amountCents: true },
    }),
    prisma.commerceInvoice.groupBy({
      by: ["organisationId"],
      where: { status: "paid", paidAt: { gte: monthStart } },
      _sum: { totalCents: true },
    }),
  ]);

  const leadsMonthMap = countMap(leadsThisMonth as CountRow[]);
  const openOppMap = countMap(openOpps as CountRow[]);
  const overdueMap = countMap(overdueLeads as CountRow[]);
  const activityMap = countMap(activitiesThisMonth as CountRow[]);
  const listedMap = countMap(listedProps as CountRow[]);
  const activeStayMap = countMap(activeStays as CountRow[]);
  const subCountMap = new Map(
    (activeSubs as SumRow[]).map((r) => [r.organisationId, r._count?.id ?? 0]),
  );
  const subMrrMap = new Map(
    (activeSubs as SumRow[]).map((r) => [r.organisationId, r._sum.amountCents ?? 0]),
  );
  const invoiceMap = new Map(
    (invoicePaidMtd as SumRow[]).map((r) => [
      r.organisationId,
      r._sum.totalCents ?? 0,
    ]),
  );

  const scored = orgRows.map((org) => {
    const installedApps = org.appInstallations.map((a) => a.appId);
    const settings = (org.settings as OrgSettings | null) ?? {};
    const reBeta = settings.featureFlags?.["re.beta"] === true;
    const accBeta = settings.featureFlags?.["acc.beta"] === true;
    const websitesBeta = settings.featureFlags?.["websites.builder"] === true;
    const infraDomainsBeta =
      settings.featureFlags?.["infra.domains_beta"] === true;
    const connectorOk = wpConfigured(org.settings);
    const scoreInput: SuccessScoreInput = {
      wordpressConfigured: connectorOk,
      lastSyncAt: wpLastSync(org.settings),
      hasBillingCustomer: Boolean(org.billingCustomerId),
      status: org.status,
      memberCount: org._count.memberships,
      contactCount: org._count.contacts,
      leadCount: org._count.leads,
      leadsThisMonth: leadsMonthMap.get(org.id) ?? 0,
      openOpportunities: openOppMap.get(org.id) ?? 0,
      overdueLeadResponses: overdueMap.get(org.id) ?? 0,
      activitiesThisMonth: activityMap.get(org.id) ?? 0,
      propertyCount: org._count.properties,
      listedPropertyCount: listedMap.get(org.id) ?? 0,
      stayBookingCount: org._count.stayBookings,
      stayBookingsActive: activeStayMap.get(org.id) ?? 0,
      installedApps,
      activeSubscriptionCount: subCountMap.get(org.id) ?? 0,
      subscriptionMrrCents: subMrrMap.get(org.id) ?? 0,
      invoicePaidMtdCents: invoiceMap.get(org.id) ?? 0,
      daysSinceUpdate:
        (Date.now() - org.updatedAt.getTime()) / (24 * 60 * 60 * 1000),
    };

    const result = computeSuccessScore(scoreInput);
    const attentionReasons = [...result.concerns];
    if (reBeta && !connectorOk) {
      attentionReasons.unshift("RE beta — WordPress connector down");
    }
    if (reBeta && installedApps.includes("real-estate") && org._count.leads === 0) {
      attentionReasons.push("RE beta — no leads yet");
    }
    if (accBeta && !connectorOk) {
      attentionReasons.unshift("Acc beta — WordPress connector down");
    }
    if (
      accBeta &&
      installedApps.includes("accommodation") &&
      org._count.stayBookings === 0
    ) {
      attentionReasons.push("Acc beta — no stay bookings yet");
    }

    const row: Omit<EnrichedCommandClient, "rank"> = {
      organisationId: org.id,
      organisationName: org.name,
      organisationSlug: org.slug,
      status: org.status,
      industry: org.industry,
      memberCount: org._count.memberships,
      contactCount: org._count.contacts,
      leadCount: org._count.leads,
      propertyCount: org._count.properties,
      stayBookingCount: org._count.stayBookings,
      installedApps,
      reBeta,
      accBeta,
      websitesBeta,
      infraDomainsBeta,
      needsAttention:
        result.tier === "needs_attention" || attentionReasons.length > 0,
      attentionReasons,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
      successScore: result.successScore,
      healthTier: result.tier,
      scoreBreakdown: result.breakdown,
      highlights: result.highlights,
    };
    return row;
  });

  scored.sort((a, b) => b.successScore - a.successScore);

  const clients: EnrichedCommandClient[] = scored.map((c, i) => ({
    ...c,
    rank: i + 1,
  }));

  const rankings: AgencyHealthRanking[] = clients.map((c) => ({
    organisationId: c.organisationId,
    organisationName: c.organisationName,
    successScore: c.successScore,
    tier: c.healthTier,
    rank: c.rank,
    highlights: c.highlights.slice(0, 3),
    concerns: c.attentionReasons.slice(0, 3),
  }));

  const tierCounts: Record<AgencyHealthTier, number> = {
    top_performer: clients.filter((c) => c.healthTier === "top_performer").length,
    healthy: clients.filter((c) => c.healthTier === "healthy").length,
    needs_attention: clients.filter((c) => c.healthTier === "needs_attention")
      .length,
  };

  const averageSuccessScore =
    clients.length === 0
      ? 0
      : Math.round(
          clients.reduce((sum, c) => sum + c.successScore, 0) / clients.length,
        );

  return {
    generatedAt: now.toISOString(),
    clients,
    rankings,
    tierCounts,
    averageSuccessScore,
  };
}

/** Single-org intelligence for advisor / reports. */
export async function getClientIntelligenceForOrg(
  organisationId: string,
): Promise<
  | (ClientIntelligence & {
      breakdown: SuccessScoreBreakdown;
      organisationSlug: string;
      healthTier: AgencyHealthTier;
    })
  | null
> {
  const bundle = await getClientIntelligence();
  const client = bundle.clients.find((c) => c.organisationId === organisationId);
  if (!client) return null;
  return {
    organisationId: client.organisationId,
    organisationName: client.organisationName,
    organisationSlug: client.organisationSlug,
    successScore: client.successScore,
    scores: {},
    needsAttention: client.needsAttention,
    attentionReasons: client.attentionReasons,
    platformUsagePercent: client.scoreBreakdown.usage,
    breakdown: client.scoreBreakdown,
    healthTier: client.healthTier,
  };
}
