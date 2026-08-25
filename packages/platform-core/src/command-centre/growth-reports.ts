/**
 * DigitalGate Growth Reports — period aggregates from Neon for Command Centre.
 * @see docs/COMMAND-CENTRE.md
 */

import type { RecommendedAction } from "../intelligence/types";
import { getClientIntelligence } from "./client-intelligence";
import type { ExecutiveGrowthReport, ExecutiveReportHighlight } from "./types";
import { tierLabel } from "./success-score";

export type GrowthReportPeriod = "mtd" | "last_30d" | "last_7d";

export type ClientGrowthReportRow = {
  organisationId: string;
  organisationName: string;
  organisationSlug: string;
  periodLabel: string;
  successScore: number;
  healthTier: string;
  rank: number;
  leadsNew: number;
  activities: number;
  openOpportunities: number;
  propertiesListed: number;
  stayBookings: number;
  invoicePaidCents: number;
  invoicePaidLabel: string;
  highlights: ExecutiveReportHighlight[];
  recommendedNextStep: RecommendedAction;
  aiGenerated: boolean;
  generatedAt: string;
};

export type GrowthReportsBundle = {
  generatedAt: string;
  period: GrowthReportPeriod;
  periodLabel: string;
  platform: {
    organisations: number;
    leadsNew: number;
    activities: number;
    openOpportunities: number;
    invoicePaidCents: number;
    invoicePaidLabel: string;
    averageSuccessScore: number;
  };
  reports: ClientGrowthReportRow[];
};

function formatAud(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function periodWindow(period: GrowthReportPeriod): { start: Date; label: string } {
  const now = new Date();
  if (period === "last_7d") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { start, label: "Last 7 days" };
  }
  if (period === "last_30d") {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return { start, label: "Last 30 days" };
  }
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    label: now.toLocaleString("en-AU", { month: "long", year: "numeric" }),
  };
}

function nextStepFor(client: {
  attentionReasons: string[];
  healthTier: string;
  scoreBreakdown: { crm: number; billing: number; connectors: number };
}): RecommendedAction {
  if (client.attentionReasons.some((c) => /overdue/i.test(c))) {
    return {
      id: "clear-leads",
      label: "Clear overdue lead responses",
      href: "/apps/re/vendor-leads",
      priority: 1,
    };
  }
  if (client.scoreBreakdown.billing < 60) {
    return {
      id: "billing-review",
      label: "Confirm billing and subscription",
      href: "/dashboard/settings/billing",
      priority: 1,
    };
  }
  if (client.scoreBreakdown.crm < 65) {
    return {
      id: "crm-push",
      label: "Increase CRM activity",
      description: "Add contacts and move open opportunities forward.",
      href: "/apps/crm/opportunities",
      priority: 1,
    };
  }
  if (client.healthTier === "top_performer") {
    return {
      id: "ask-referral",
      label: "Ask for a referral",
      description: "Top performer — good time for Refer & Earn.",
      href: "/dashboard/settings/referrals",
      priority: 1,
    };
  }
  return {
    id: "send-report",
    label: "Share this Growth Report with the client",
    href: "/command/reports",
    priority: 1,
  };
}

/** Build period Growth Reports for all (or one) client orgs. */
export async function getGrowthReports(input?: {
  period?: GrowthReportPeriod;
  organisationId?: string;
}): Promise<GrowthReportsBundle> {
  const { prisma } = await import("@dg/database");
  const period = input?.period ?? "mtd";
  const { start, label } = periodWindow(period);
  const now = new Date();

  const intelligence = await getClientIntelligence();
  let clients = intelligence.clients;
  if (input?.organisationId) {
    clients = clients.filter((c) => c.organisationId === input.organisationId);
  }

  const orgIds = clients.map((c) => c.organisationId);

  const [leads, activities, openOpps, listed, stays, invoices] = await Promise.all([
    orgIds.length
      ? prisma.lead.groupBy({
          by: ["organisationId"],
          where: { organisationId: { in: orgIds }, createdAt: { gte: start } },
          _count: { id: true },
        })
      : Promise.resolve([]),
    orgIds.length
      ? prisma.activity.groupBy({
          by: ["organisationId"],
          where: { organisationId: { in: orgIds }, createdAt: { gte: start } },
          _count: { id: true },
        })
      : Promise.resolve([]),
    orgIds.length
      ? prisma.opportunity.groupBy({
          by: ["organisationId"],
          where: { organisationId: { in: orgIds }, status: "open" },
          _count: { id: true },
        })
      : Promise.resolve([]),
    orgIds.length
      ? prisma.property.groupBy({
          by: ["organisationId"],
          where: { organisationId: { in: orgIds }, status: "listed" },
          _count: { id: true },
        })
      : Promise.resolve([]),
    orgIds.length
      ? prisma.stayBooking.groupBy({
          by: ["organisationId"],
          where: { organisationId: { in: orgIds }, createdAt: { gte: start } },
          _count: { id: true },
        })
      : Promise.resolve([]),
    orgIds.length
      ? prisma.commerceInvoice.groupBy({
          by: ["organisationId"],
          where: {
            organisationId: { in: orgIds },
            status: "paid",
            paidAt: { gte: start },
          },
          _sum: { totalCents: true },
        })
      : Promise.resolve([]),
  ]);

  const leadMap = new Map(leads.map((r) => [r.organisationId, r._count.id]));
  const activityMap = new Map(activities.map((r) => [r.organisationId, r._count.id]));
  const oppMap = new Map(openOpps.map((r) => [r.organisationId, r._count.id]));
  const listedMap = new Map(listed.map((r) => [r.organisationId, r._count.id]));
  const stayMap = new Map(stays.map((r) => [r.organisationId, r._count.id]));
  const invoiceMap = new Map(
    invoices.map((r) => [r.organisationId, r._sum.totalCents ?? 0]),
  );

  const reports: ClientGrowthReportRow[] = clients.map((client) => {
    const leadsNew = leadMap.get(client.organisationId) ?? 0;
    const act = activityMap.get(client.organisationId) ?? 0;
    const opps = oppMap.get(client.organisationId) ?? 0;
    const props = listedMap.get(client.organisationId) ?? 0;
    const stayBookings = stayMap.get(client.organisationId) ?? 0;
    const invoicePaidCents = invoiceMap.get(client.organisationId) ?? 0;

    const highlights: ExecutiveReportHighlight[] = [
      { label: "Success Score™", value: client.successScore, trend: "flat" },
      {
        label: "New leads",
        value: leadsNew,
        trend: leadsNew > 0 ? "up" : "flat",
      },
      {
        label: "Timeline activity",
        value: act,
        trend: act > 5 ? "up" : "flat",
      },
      { label: "Open opportunities", value: opps },
      { label: "Live listings", value: props },
      {
        label: "Invoices paid",
        value: formatAud(invoicePaidCents),
        trend: invoicePaidCents > 0 ? "up" : "flat",
      },
    ];

    return {
      organisationId: client.organisationId,
      organisationName: client.organisationName,
      organisationSlug: client.organisationSlug,
      periodLabel: label,
      successScore: client.successScore,
      healthTier: client.healthTier,
      rank: client.rank,
      leadsNew,
      activities: act,
      openOpportunities: opps,
      propertiesListed: props,
      stayBookings,
      invoicePaidCents,
      invoicePaidLabel: formatAud(invoicePaidCents),
      highlights,
      recommendedNextStep: nextStepFor(client),
      aiGenerated: false,
      generatedAt: now.toISOString(),
    };
  });

  return {
    generatedAt: now.toISOString(),
    period,
    periodLabel: label,
    platform: {
      organisations: reports.length,
      leadsNew: reports.reduce((s, r) => s + r.leadsNew, 0),
      activities: reports.reduce((s, r) => s + r.activities, 0),
      openOpportunities: reports.reduce((s, r) => s + r.openOpportunities, 0),
      invoicePaidCents: reports.reduce((s, r) => s + r.invoicePaidCents, 0),
      invoicePaidLabel: formatAud(
        reports.reduce((s, r) => s + r.invoicePaidCents, 0),
      ),
      averageSuccessScore: intelligence.averageSuccessScore,
    },
    reports,
  };
}

export function toExecutiveGrowthReport(
  row: ClientGrowthReportRow,
): ExecutiveGrowthReport {
  return {
    organisationId: row.organisationId,
    periodLabel: row.periodLabel,
    highlights: row.highlights,
    scoreChanges: [
      {
        scoreId: "success_score",
        label: "Success Score™",
        changePercent: 0,
        currentValue: row.successScore,
      },
    ],
    recommendedNextStep: row.recommendedNextStep,
    generatedAt: new Date(row.generatedAt),
    aiGenerated: row.aiGenerated,
  };
}

export function healthTierDisplay(tier: string): string {
  if (tier === "top_performer" || tier === "healthy" || tier === "needs_attention") {
    return tierLabel(tier);
  }
  return tier;
}
