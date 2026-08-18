import { getCommerceFinancialSnapshot } from "../commerce/payment-engine";
import { listLeads } from "../leads";
import { listProperties } from "../properties";
import { getPlatformSetupStatus } from "../org/setup-status";

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

/** Aggregate live KPIs from Postgres for Business Overview. */
export async function gatherOverviewLiveMetrics(
  organisationId: string,
): Promise<OverviewLiveMetrics> {
  const { prisma } = await import("@dg/database");
  const weekStart = startOfWeek();
  const todayEnd = endOfToday();
  const now = new Date();

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
  ] = await Promise.all([
    getPlatformSetupStatus(organisationId),
    getCommerceFinancialSnapshot(organisationId),
    listLeads({ organisationId, leadType: "vendor", limit: 1 }),
    listLeads({ organisationId, leadType: "buyer", limit: 1 }),
    prisma.lead.count({
      where: { organisationId, createdAt: { gte: weekStart } },
    }),
    prisma.lead.count({
      where: {
        organisationId,
        responseDueAt: { lt: now },
        firstResponseAt: null,
      },
    }),
    listProperties({ organisationId, status: "listed", limit: 1 }),
    prisma.property.aggregate({
      where: {
        organisationId,
        status: {
          in: [
            "listed",
            "under_offer",
            "contract_signed",
            "unconditional",
            "appraisal",
          ],
        },
        listingPriceCents: { not: null },
      },
      _sum: { listingPriceCents: true },
    }),
    prisma.task.count({
      where: {
        organisationId,
        status: "open",
        dueAt: { lte: todayEnd },
      },
    }),
    prisma.opportunity.count({
      where: { organisationId, status: "open" },
    }),
    prisma.lead.count({
      where: {
        organisationId,
        status: { notIn: ["converted", "lost", "closed", "junk"] },
      },
    }),
    prisma.opportunity.count({
      where: {
        organisationId,
        status: "open",
        pipelineId: "platform_consultation",
      },
    }),
  ]);

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
    revenueMtdCents: financial.revenueMtdCents,
    revenueYtdCents: financial.revenueYtdCents,
    outstandingArCents: financial.outstandingArCents,
    overdueArCents: financial.overdueArCents,
    activeSubscriptions: financial.activeSubscriptions,
    openOpportunityCount,
    openLeadCount,
    consultationCount,
  };
}
