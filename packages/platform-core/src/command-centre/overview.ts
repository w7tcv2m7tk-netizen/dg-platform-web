/**
 * Command Centre ops home — cross-tenant aggregates for DigitalGate staff.
 *
 * Hard rule: platform-owner view monitors the DigitalGate business and customer
 * ecosystem health — it does not display customer industry operational data
 * (accommodation, RE listings, etc.) unless viewing a specific org context.
 * @see docs/foundations/OPERATOR-OS.md
 */

import type {
  CommandActionItem,
  CommandClientRow,
  CommandCentreOpsHome,
  CommandConnectorOrgStatus,
  CommandDeliverySummary,
  CommandOrganisationHealthSummary,
  CommandPartnerPulse,
  CommandPlatformOperationsGroup,
  CommandPlatformPulse,
  CommandReferEarnSnapshot,
} from "./types";
import {
  buildTodaySummary,
  humanizePlatformActivity,
} from "./presentation";
import { getStripeSetupStatus } from "../commerce/stripe-setup";
import { getGrowthEngineSummary } from "./growth-engine/prospects";
import { getDailyOpportunityBriefing } from "./growth-engine/opportunity-engine";
import { getClientIntelligence } from "./client-intelligence";
import { listAllCommissions, listAllReferrals, listPartners } from "../partners/crud";
import { getDeliveryDashboardMetrics } from "../delivery/metrics";
import { listDeliveryProjects } from "../delivery/projects";
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

function buildDeliverySummary(
  projects: Awaited<ReturnType<typeof listDeliveryProjects>>,
  metrics: Awaited<ReturnType<typeof getDeliveryDashboardMetrics>>,
): CommandDeliverySummary {
  const active = projects.filter((p) => p.status !== "customer_success");
  return {
    activeImplementations: metrics.activeImplementations,
    awaitingCustomerInfo: metrics.customersAwaitingInformation,
    blocked: active.filter((p) => p.health === "blocked").length,
    inTraining: active.filter((p) => p.status === "training").length,
    inQa: active.filter((p) => p.status === "qa").length,
    readyForGoLive: active.filter((p) => p.status === "go_live").length,
  };
}

async function buildPartnerPulse(): Promise<CommandPartnerPulse> {
  const [resellers, referrals, pendingCommissions] = await Promise.all([
    listPartners({ partnerType: "FOUNDING_RESELLER", status: "active" }),
    listAllReferrals({ limit: 500 }),
    listAllCommissions({ status: "PENDING", limit: 500 }),
  ]);

  const activeProspectStatuses = new Set([
    "PROSPECT",
    "INTRODUCED",
    "CONTACTED",
    "CONSULTATION",
    "APPLICATION",
    "INVITED",
    "REFERRED",
  ]);
  const referredStatuses = new Set(["CUSTOMER", "ACTIVE", "COMMISSIONING"]);
  const onboardingStatuses = new Set(["ONBOARDING", "ACCEPTED"]);

  const activeProspects = referrals.referrals.filter((r) =>
    activeProspectStatuses.has(r.status),
  ).length;
  const referredCustomers = referrals.referrals.filter((r) =>
    referredStatuses.has(r.status),
  ).length;
  const onboardingCount = referrals.referrals.filter((r) =>
    onboardingStatuses.has(r.status),
  ).length;
  const pendingCommissionsCents = pendingCommissions.commissions.reduce(
    (sum, c) => sum + c.commissionAmountCents,
    0,
  );

  return {
    foundingResellers: resellers.total,
    activeProspects,
    referredCustomers,
    onboardingCount,
    pendingCommissionsCents,
  };
}

function buildOrganisationHealthSummary(
  totalOrganisations: number,
  clients: CommandClientRow[],
): CommandOrganisationHealthSummary {
  const scored = clients.filter((c) => !c.scoreProvisional && c.successScore != null);
  const averageHealth =
    scored.length === 0
      ? null
      : Math.round(scored.reduce((sum, c) => sum + (c.successScore ?? 0), 0) / scored.length);

  return {
    totalOrganisations,
    organisationsWithSufficientData: scored.length,
    averageHealth,
    averageHealthLabel: averageHealth == null ? "—" : `${averageHealth}/100`,
    needsAttentionCount: clients.filter((c) => c.needsAttention).length,
  };
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

const PLATFORM_OPERATIONS: CommandPlatformOperationsGroup[] = [
  {
    id: "customers",
    label: "Customers",
    links: [
      {
        id: "client-intelligence",
        label: "Client Intelligence",
        href: "/command/clients",
        description: "Organisation health, blockers and intervention queue",
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    links: [
      {
        id: "growth-engine",
        label: "Growth Engine",
        href: "/command/growth-engine",
        description: "Acquisition pipeline and daily prospecting",
      },
      {
        id: "founding",
        label: "Founding 10",
        href: "/command/founding",
        description: "Founding customer pipeline",
      },
    ],
  },
  {
    id: "delivery",
    label: "Delivery",
    links: [
      {
        id: "implementations",
        label: "Implementation",
        href: "/command/delivery",
        description: "Onboarding, QA and go-live projects",
      },
    ],
  },
  {
    id: "partners",
    label: "Partners",
    links: [
      {
        id: "resellers",
        label: "Resellers / Referrals",
        href: "/command/partners",
        description: "Founding resellers, referrals and commissions",
      },
    ],
  },
  {
    id: "revenue",
    label: "Revenue",
    links: [
      {
        id: "billing",
        label: "Billing / MRR",
        href: "/command/revenue",
        description: "Subscriptions, invoices and expansion",
      },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    links: [
      {
        id: "connectors",
        label: "Connectors / Health",
        href: "/command/platform-health",
        description: "Connector health, Stripe and infrastructure",
      },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    links: [
      {
        id: "advisor",
        label: "AI Advisor",
        href: "/command/advisor",
        description: "What should the DigitalGate team focus on?",
      },
      {
        id: "benchmarks",
        label: "Benchmarks",
        href: "/command/benchmarks",
        description: "Cohort comparisons across the customer base",
      },
    ],
  },
];

/** Cross-tenant Command Centre ops home. Staff-scoped; no PII dumps. */
export async function getCommandCentreOpsHome(): Promise<CommandCentreOpsHome> {
  const { prisma } = await import("@dg/database");

  const todayEnd = endOfToday();
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();
  const now = new Date();

  const operatorOrgIdFromEnv =
    process.env.DG_OPERATOR_ORG_ID?.trim() ||
    process.env.DG_COMMAND_CENTRE_ORG_IDS?.split(",")
      .map((id) => id.trim())
      .filter(Boolean)[0] ||
    null;

  const operatorOrg =
    (operatorOrgIdFromEnv
      ? await prisma.organisation.findUnique({
          where: { id: operatorOrgIdFromEnv },
          select: { id: true },
        })
      : null) ??
    (await prisma.organisation.findFirst({
      where: {
        OR: [
          { slug: "digitalgate" },
          { slug: { startsWith: "digitalgate-" } },
        ],
      },
      select: { id: true },
    }));

  const operatorOrganisationId = operatorOrg?.id ?? operatorOrgIdFromEnv;

  const [
    organisations,
    users,
    leads,
    leadsThisWeek,
    opportunities,
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
    prospectingBriefing,
    orgRows,
    recentActivities,
    intelligence,
    deliveryAlerts,
    deliveryMetrics,
    deliveryProjects,
    partnerPulse,
  ] = await Promise.all([
    prisma.organisation.count(),
    prisma.membership.count({ where: { status: "active" } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.opportunity.count({ where: { status: "open" } }),
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
    operatorOrganisationId
      ? getGrowthEngineSummary(operatorOrganisationId)
      : Promise.resolve({
          totalProspects: 0,
          byStage: {} as Record<string, number>,
          engagementsThisWeek: 0,
        }),
    getDailyOpportunityBriefing({
      organisationId: operatorOrganisationId ?? undefined,
      limit: 20,
    }).catch(() => null),
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
    import("../delivery/metrics")
      .then((m) => m.getCommandCentreDeliveryAlerts())
      .catch(() => [] as Awaited<ReturnType<typeof import("../delivery/metrics").getCommandCentreDeliveryAlerts>>),
    getDeliveryDashboardMetrics({ managerView: true }).catch(() => ({
      activeImplementations: 0,
      onTrack: 0,
      atRisk: 0,
      blocked: 0,
      goLivesThisMonth: 0,
      averageImplementationDays: null,
      overdueTasks: 0,
      customersAwaitingInformation: 0,
      tasksDueToday: 0,
    })),
    listDeliveryProjects({ limit: 200 }).catch(() => []),
    buildPartnerPulse().catch(() => ({
      foundingResellers: 0,
      activeProspects: 0,
      referredCustomers: 0,
      onboardingCount: 0,
      pendingCommissionsCents: 0,
    })),
  ]);

  const stripe = getStripeSetupStatus();

  const estimatedMrrCents = subscriptionMrr._sum.amountCents ?? 0;

  const pulse: CommandPlatformPulse = {
    organisations,
    users,
    leads,
    leadsThisWeek,
    openOpportunities: opportunities,
    growthProspects: growth.totalProspects,
    growthInPipeline:
      growth.totalProspects -
      (growth.byStage.won ?? 0) -
      (growth.byStage.lost ?? 0),
    growthEngagementsThisWeek: growth.engagementsThisWeek,
    openTasksDue,
    overdueLeadResponses,
    estimatedMrrCents,
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
    accBeta: c.accBeta,
    websitesBeta: c.websitesBeta,
    infraDomainsBeta: c.infraDomainsBeta,
    needsAttention: c.needsAttention,
    attentionReasons: c.attentionReasons,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    successScore: c.successScore,
    organisationHealth: c.scoreProvisional ? undefined : c.successScore,
    healthTier: c.healthTier,
    rank: c.rank,
    scoreProvisional: c.scoreProvisional,
  }));

  const organisationHealth = buildOrganisationHealthSummary(organisations, clients);
  const delivery = buildDeliverySummary(deliveryProjects, deliveryMetrics);
  const followUpProspects =
    (growth.byStage.follow_up_due ?? 0) + (growth.byStage.report_sent ?? 0);
  const today = buildTodaySummary({
    openTasksDue,
    prospectFollowUps: followUpProspects,
    organisationsNeedingAttention: organisationHealth.needsAttentionCount,
  });

  const actions: CommandActionItem[] = [];

  if (overdueLeadResponses > 0) {
    actions.push({
      id: "overdue-leads",
      severity: "urgent",
      title: `${overdueLeadResponses} overdue lead response${overdueLeadResponses === 1 ? "" : "s"}`,
      detail: "Across customer organisations — review in Client Intelligence.",
      href: "/command/clients",
    });
  }

  if (openTasksDue > 0) {
    actions.push({
      id: "tasks-due",
      severity: "today",
      title: `${openTasksDue} open task${openTasksDue === 1 ? "" : "s"} due today`,
      detail: "Platform-wide tasks with due dates on or before today.",
      href: "/command/delivery/tasks",
    });
  }

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

  const needsAttentionClients = organisationHealth.needsAttentionCount;
  if (needsAttentionClients > 0) {
    actions.push({
      id: "clients-attention",
      severity: "watch",
      title: `${needsAttentionClients} organisation${needsAttentionClients === 1 ? "" : "s"} need attention`,
      detail: "Observed blockers only — open Client Intelligence for intervention queue.",
      href: "/command/clients",
    });
  }

  return {
    generatedAt: now.toISOString(),
    briefing: "DigitalGate Platform Operations — run DigitalGate, not customer industry ops.",
    pulse,
    today,
    organisationHealth,
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
      estimatedMrrCents,
      invoicePaidMtdCents: invoicePaidMtd._sum.totalCents ?? 0,
      orgsWithBillingCustomer: orgsWithBilling,
      stripeOk: stripe.ok,
      stripeMode: stripe.mode,
      estimatedMrrLabel: formatAud(estimatedMrrCents),
      invoicePaidMtdLabel: formatAud(invoicePaidMtd._sum.totalCents ?? 0),
    },
    referEarn,
    growth,
    growthEngine: {
      prospects: growth.totalProspects,
      engagementsThisWeek: growth.engagementsThisWeek,
      activePipeline: pulse.growthInPipeline,
      topPriorityLabel: prospectingBriefing?.top?.businessName ?? null,
      topPriorityScore: prospectingBriefing?.top?.score ?? null,
      href: "/command/growth-engine",
    },
    delivery,
    partnerPulse,
    prospectingToday: {
      recommendedCount: prospectingBriefing?.recommendedCount ?? 0,
      contactedToday: prospectingBriefing?.contactedToday ?? 0,
      conversations: prospectingBriefing?.conversations ?? 0,
      meetingsBooked: prospectingBriefing?.meetingsBooked ?? 0,
      stillRequireAction: prospectingBriefing?.stillRequireAction ?? 0,
      proposalPipelineCents: prospectingBriefing?.proposalPipelineCents ?? null,
      topBusinessName: prospectingBriefing?.top?.businessName ?? null,
      topScore: prospectingBriefing?.top?.score ?? null,
    },
    recentActivity: recentActivities.map((a) => {
      const base = {
        id: a.id,
        title: a.title,
        activityType: a.activityType,
        sourceApp: a.sourceApp,
        organisationName: a.organisation.name,
        organisationSlug: a.organisation.slug,
        createdAt: a.createdAt.toISOString(),
      };
      const human = humanizePlatformActivity(base);
      return { ...base, ...human };
    }),
    platformOperations: PLATFORM_OPERATIONS,
    deliveryAlerts,
  };
}
