/**
 * Command Centre ops home — cross-tenant aggregates for DigitalGate staff.
 * Prefer counts / light client rows over Twin/Scoring until those land.
 * @see docs/COMMAND-CENTRE.md
 */

import type {
  CommandActionItem,
  CommandClientRow,
  CommandCentreOpsHome,
  CommandConnectorOrgStatus,
  CommandDeepLink,
  CommandPlatformPulse,
  CommandReferEarnSnapshot,
} from "./types";
import { getStripeSetupStatus } from "../commerce/stripe-setup";
import { getGrowthEngineSummary } from "./growth-engine/prospects";
import { getClientIntelligence } from "./client-intelligence";
import type { OrgWordPressConnectorSettings } from "../connectors/wordpress/org-connector";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function formatAud(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

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

const CORE_DEEP_LINKS: CommandDeepLink[] = [
  {
    id: "crm",
    label: "CRM",
    href: "/apps/crm/contacts",
    description: "Contacts, opportunities, timeline",
  },
  {
    id: "re",
    label: "Real Estate",
    href: "/apps/re",
    description: "Vendor pipeline, listings, bookings",
  },
  {
    id: "acc",
    label: "Accommodation",
    href: "/apps/accommodation",
    description: "Bookings, check-ins, units",
  },
  {
    id: "commerce",
    label: "Commerce",
    href: "/apps/commerce",
    description: "Invoices, quotes, reports",
  },
  {
    id: "connectors",
    label: "Connectors",
    href: "/dashboard/settings/connectors",
    description: "WordPress and Stripe setup",
  },
  {
    id: "referrals",
    label: "Refer & Earn",
    href: "/dashboard/settings/referrals",
    description: "Platform SaaS referral dashboard",
  },
  {
    id: "billing",
    label: "Billing",
    href: "/dashboard/settings/billing",
    description: "Stripe checkout and portal",
  },
  {
    id: "growth",
    label: "Growth Engine",
    href: "/command/growth-engine",
    description: "Acquisition pipeline",
  },
  {
    id: "reports",
    label: "Growth Reports",
    href: "/command/reports",
    description: "Period client reports",
  },
  {
    id: "advisor",
    label: "AI Advisor",
    href: "/command/advisor",
    description: "Org-level staff insights",
  },
  {
    id: "opportunities",
    label: "Expansion",
    href: "/command/opportunities",
    description: "Upsell opportunities",
  },
];

/** Cross-tenant Command Centre ops home. Staff-scoped; no PII dumps. */
export async function getCommandCentreOpsHome(): Promise<CommandCentreOpsHome> {
  const { prisma } = await import("@dg/database");

  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();
  const now = new Date();

  const [
    organisations,
    users,
    leads,
    leadsThisWeek,
    opportunities,
    properties,
    listedProperties,
    stayBookings,
    stayBookingsActive,
    checkinsToday,
    openTasksDue,
    overdueLeadResponses,
    orgsWithBilling,
    activeSubscriptions,
    subscriptionMrr,
    invoicePaidMtd,
    referralTotals,
    referralByStatus,
    referralCreditsMtd,
    growth,
    orgRows,
    recentActivities,
    intelligence,
  ] = await Promise.all([
    prisma.organisation.count(),
    prisma.membership.count({ where: { status: "active" } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.opportunity.count({ where: { status: "open" } }),
    prisma.property.count(),
    prisma.property.count({ where: { status: "listed" } }),
    prisma.stayBooking.count(),
    prisma.stayBooking.count({
      where: { status: { in: ["confirmed", "airbnb", "bookingcom", "pending"] } },
    }),
    prisma.stayBooking.count({
      where: {
        checkin: { gte: todayStart, lte: todayEnd },
        status: { notIn: ["cancelled"] },
      },
    }),
    prisma.task.count({
      where: { status: "open", dueAt: { lte: todayEnd } },
    }),
    prisma.lead.count({
      where: {
        responseDueAt: { lt: now },
        firstResponseAt: null,
      },
    }),
    prisma.organisation.count({ where: { billingCustomerId: { not: null } } }),
    prisma.commerceSubscription.count({ where: { status: "active" } }),
    prisma.commerceSubscription.aggregate({
      where: { status: "active", interval: "month" },
      _sum: { amountCents: true },
    }),
    prisma.commerceInvoice.aggregate({
      where: {
        status: "paid",
        paidAt: { gte: monthStart },
      },
      _sum: { totalCents: true },
    }),
    prisma.platformReferral.count(),
    prisma.platformReferral.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.platformReferralLedger.aggregate({
      where: {
        entryType: "credit",
        createdAt: { gte: monthStart },
        amountCents: { gt: 0 },
      },
      _sum: { amountCents: true },
    }),
    getGrowthEngineSummary(),
    prisma.organisation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 40,
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
    prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        activityType: true,
        sourceApp: true,
        createdAt: true,
        organisation: { select: { name: true, slug: true } },
      },
    }),
    getClientIntelligence(),
  ]);

  const stripe = getStripeSetupStatus();

  const pulse: CommandPlatformPulse = {
    organisations,
    users,
    leads,
    leadsThisWeek,
    openOpportunities: opportunities,
    properties,
    listedProperties,
    stayBookings,
    stayBookingsActive,
    checkinsToday,
    growthProspects: growth.totalProspects,
    growthInPipeline:
      growth.totalProspects -
      (growth.byStage.won ?? 0) -
      (growth.byStage.lost ?? 0),
    openTasksDue,
    overdueLeadResponses,
  };

  const referralStatusMap = Object.fromEntries(
    referralByStatus.map((r) => [r.status, r._count.id]),
  );
  const referEarn: CommandReferEarnSnapshot = {
    totalReferrals: referralTotals,
    invited: referralStatusMap.invited ?? 0,
    signedUp:
      (referralStatusMap.signed_up ?? 0) +
      (referralStatusMap.trial ?? 0) +
      (referralStatusMap.paid ?? 0) +
      (referralStatusMap.rewarded ?? 0),
    paid:
      (referralStatusMap.paid ?? 0) + (referralStatusMap.rewarded ?? 0),
    creditsMtdCents: referralCreditsMtd._sum.amountCents ?? 0,
  };

  const connectors: CommandConnectorOrgStatus[] = orgRows.map((org) => {
    const lastSyncAt = wpLastSync(org.settings);
    const configured = wpConfigured(org.settings);
    return {
      organisationId: org.id,
      organisationName: org.name,
      organisationSlug: org.slug,
      wordpressConfigured: configured,
      lastSyncAt,
      hasBillingCustomer: Boolean(org.billingCustomerId),
      installedApps: org.appInstallations.map((a) => a.appId),
    };
  });

  const wordpressConfiguredCount = connectors.filter((c) => c.wordpressConfigured).length;
  const wordpressSyncedRecently = connectors.filter((c) => {
    if (!c.lastSyncAt) return false;
    const ts = Date.parse(c.lastSyncAt);
    return Number.isFinite(ts) && Date.now() - ts < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const clients: CommandClientRow[] = intelligence.clients.map((c) => ({
    organisationId: c.organisationId,
    organisationName: c.organisationName,
    organisationSlug: c.organisationSlug,
    status: c.status,
    industry: c.industry,
    memberCount: c.memberCount,
    contactCount: c.contactCount,
    leadCount: c.leadCount,
    propertyCount: c.propertyCount,
    stayBookingCount: c.stayBookingCount,
    installedApps: c.installedApps,
    reBeta: c.reBeta,
    needsAttention: c.needsAttention,
    attentionReasons: c.attentionReasons,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    successScore: c.successScore,
    healthTier: c.healthTier,
    rank: c.rank,
  }));

  const actions: CommandActionItem[] = [];

  if (overdueLeadResponses > 0) {
    actions.push({
      id: "overdue-leads",
      severity: "urgent",
      title: `${overdueLeadResponses} overdue lead response${overdueLeadResponses === 1 ? "" : "s"}`,
      detail: "Across tenants — agents need to reply before SLA slips further.",
      href: "/apps/re/vendor-leads",
    });
  }

  if (openTasksDue > 0) {
    actions.push({
      id: "tasks-due",
      severity: "today",
      title: `${openTasksDue} open task${openTasksDue === 1 ? "" : "s"} due today`,
      detail: "Platform-wide tasks with due dates on or before today.",
      href: "/dashboard",
    });
  }

  if (checkinsToday > 0) {
    actions.push({
      id: "checkins",
      severity: "today",
      title: `${checkinsToday} accommodation check-in${checkinsToday === 1 ? "" : "s"} today`,
      detail: "Confirm housekeeping and guest arrival readiness.",
      href: "/apps/accommodation/check-ins",
    });
  }

  const followUpProspects =
    (growth.byStage.follow_up_due ?? 0) + (growth.byStage.report_sent ?? 0);
  if (followUpProspects > 0) {
    actions.push({
      id: "growth-followups",
      severity: "today",
      title: `${followUpProspects} Growth Engine prospect${followUpProspects === 1 ? "" : "s"} need follow-up`,
      detail: "Reports sent or follow-up due — keep the acquisition loop moving.",
      href: "/command/growth-engine/pipeline",
    });
  }

  if (!stripe.ok) {
    actions.push({
      id: "stripe-setup",
      severity: "watch",
      title: "Stripe billing needs attention",
      detail: stripe.issues.map((i) => i.replace(/_/g, " ")).join(", ") || "Incomplete setup",
      href: "/dashboard/settings/billing",
    });
  }

  const needsAttentionClients = clients.filter((c) => c.needsAttention).length;
  if (needsAttentionClients > 0) {
    actions.push({
      id: "clients-attention",
      severity: "watch",
      title: `${needsAttentionClients} client${needsAttentionClients === 1 ? "" : "s"} need attention`,
      detail: "Trials, missing connectors, or quiet usage — open Client Intelligence.",
      href: "/command/clients",
    });
  }

  const briefingParts = [
    `${organisations} organisation${organisations === 1 ? "" : "s"}`,
    `avg Success Score ${intelligence.averageSuccessScore}`,
    `${leadsThisWeek} new lead${leadsThisWeek === 1 ? "" : "s"} this week`,
    `${listedProperties} live listing${listedProperties === 1 ? "" : "s"}`,
    stayBookingsActive > 0
      ? `${stayBookingsActive} active stay${stayBookingsActive === 1 ? "" : "s"}`
      : null,
    growth.totalProspects > 0
      ? `${growth.totalProspects} Growth Engine prospect${growth.totalProspects === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);

  return {
    generatedAt: now.toISOString(),
    briefing: `DigitalGate pulse — ${briefingParts.join(" · ")}.`,
    pulse,
    actions,
    clients,
    connectors: {
      stripeOk: stripe.ok,
      stripeMode: stripe.mode,
      orgsWithBillingCustomer: orgsWithBilling,
      wordpressConfiguredCount,
      wordpressSyncedRecently,
      orgs: connectors,
    },
    billing: {
      activeSubscriptions,
      estimatedMrrCents: subscriptionMrr._sum.amountCents ?? 0,
      invoicePaidMtdCents: invoicePaidMtd._sum.totalCents ?? 0,
      orgsWithBillingCustomer: orgsWithBilling,
      stripeOk: stripe.ok,
      stripeMode: stripe.mode,
      estimatedMrrLabel: formatAud(subscriptionMrr._sum.amountCents ?? 0),
      invoicePaidMtdLabel: formatAud(invoicePaidMtd._sum.totalCents ?? 0),
    },
    referEarn,
    growth,
    recentActivity: recentActivities.map((a) => ({
      id: a.id,
      title: a.title,
      activityType: a.activityType,
      sourceApp: a.sourceApp,
      organisationName: a.organisation.name,
      organisationSlug: a.organisation.slug,
      createdAt: a.createdAt.toISOString(),
    })),
    deepLinks: CORE_DEEP_LINKS,
  };
}
