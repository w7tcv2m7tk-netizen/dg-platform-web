/**
 * Partner Operating System dashboard workspace — operator pulse + attention queue.
 *
 * Developer rule: Partner Dashboard must never become a prospecting or sales pipeline.
 * DigitalGate’s customer acquisition remains owned by Sales / Growth Engine.
 * Partner surfaces only manage partner relationships, activity, referrals, reseller
 * performance, onboarding and commissions.
 */

import {
  countPartnerSeats,
  listAllCommissions,
  listAllReferrals,
  listPartners,
} from "./crud";
import { getDeliveryDashboardMetrics } from "../delivery/metrics";
import { listDeliveryProjects } from "../delivery/projects";
import { PARTNER_COMMISSION_CONFIG, type PartnerType } from "./types";

const CUSTOMER_STATUSES = new Set([
  "CUSTOMER",
  "ACTIVE",
  "ACCEPTED",
  "COMMISSIONING",
]);

const UNCONTACTED_REFERRAL = new Set([
  "PROSPECT",
  "INTRODUCED",
  "INVITED",
  "REFERRED",
]);

const RESELLER_TYPES = new Set<PartnerType>([
  "FOUNDING_RESELLER",
  "FOUNDING_PARTNER",
  "FOUNDING_CUSTOMER",
  "CUSTOMER_REFERRER",
]);

export type PartnerAttentionItem = {
  id: string;
  severity: "amber" | "yellow" | "none";
  title: string;
  detail: string | null;
  href: string;
  cta: string;
};

export type PartnerPulse = {
  activeResellers: number;
  pendingApplications: number;
  referralsThisMonth: number;
  customersReferred: number;
  /**
   * Referred customers still generating commissionable subscription revenue.
   * Scaffold until retention / billing linkage distinguishes acquired vs active.
   */
  activeReferredCustomers: number | null;
  /** Scaffold — open referred opportunity value in Sales, attributed to partners */
  pipelineValueCents: number | null;
  /** 0–100, or null when no referrals yet */
  conversionRate: number | null;
  /** Scaffold — recurring MRR attribution lands with billing linkage */
  mrrReferredCents: number | null;
  commissionOwingCents: number;
  commissionPaidCents: number;
};

export type PartnerDashboardRow = {
  id: string;
  name: string;
  email: string | null;
  partnerTypeLabel: string;
  partnerType: PartnerType;
  status: string;
  joinedAt: string | null;
};

export type PartnerActivityRow = {
  id: string;
  label: string;
  detail: string;
  at: string;
  href: string;
};

export type DeliveryPulse = {
  activeProjects: number;
  projectsAtRisk: number;
  customersInImplementation: number;
  /** Scaffold — Professional Services revenue attribution */
  serviceRevenueCents: number | null;
  /** Scaffold — Support & Success revenue attribution */
  supportRevenueCents: number | null;
  /** Scaffold — partner share of qualifying service revenue */
  partnerShareCents: number | null;
};

export type PartnerOnboardingPerson = {
  id: string;
  name: string;
  href: string;
};

/** Pending partners awaiting onboarding — grouped by commercial channel. */
export type PartnerOnboardingQueue = {
  acquisition: PartnerOnboardingPerson[];
  delivery: PartnerOnboardingPerson[];
};

export type PartnerDashboardWorkspace = {
  pulse: PartnerPulse;
  deliveryPulse: DeliveryPulse;
  attention: PartnerAttentionItem[];
  onboardingQueue: PartnerOnboardingQueue;
  foundingSeats: { used: number; cap: number; invited: number };
  resellers: PartnerDashboardRow[];
  deliveryPartners: PartnerDashboardRow[];
  recentActivity: PartnerActivityRow[];
};

function centsMonthStart(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
}

function emptySeats() {
  return (Object.keys(PARTNER_COMMISSION_CONFIG) as PartnerType[]).reduce(
    (acc, type) => {
      const cap = PARTNER_COMMISSION_CONFIG[type].seatCap;
      acc[type] = { used: 0, cap, remaining: cap };
      return acc;
    },
    {} as Awaited<ReturnType<typeof countPartnerSeats>>,
  );
}

export async function buildPartnerDashboardWorkspace(): Promise<PartnerDashboardWorkspace> {
  let partners: Awaited<ReturnType<typeof listPartners>>["partners"] = [];
  let seats = emptySeats();
  let referrals: Awaited<ReturnType<typeof listAllReferrals>>["referrals"] = [];
  let commissions: Awaited<ReturnType<typeof listAllCommissions>>["commissions"] = [];
  let deliveryMetrics = {
    activeImplementations: 0,
    atRisk: 0,
    blocked: 0,
  };
  let deliveryProjects: Awaited<ReturnType<typeof listDeliveryProjects>> = [];

  try {
    const [listed, counted, refs, comms, metrics, projects] = await Promise.all([
      listPartners({ limit: 100 }),
      countPartnerSeats(),
      listAllReferrals({ limit: 200 }),
      listAllCommissions({ limit: 200 }),
      getDeliveryDashboardMetrics({ managerView: true }),
      listDeliveryProjects({ managerView: true }),
    ]);
    partners = listed.partners;
    seats = counted;
    referrals = refs.referrals;
    commissions = comms.commissions;
    deliveryMetrics = metrics;
    deliveryProjects = projects;
  } catch {
    /* tables not migrated */
  }

  const monthStart = centsMonthStart();
  const resellerPartners = partners.filter((p) => RESELLER_TYPES.has(p.partnerType));
  const deliveryPartners = partners.filter((p) => p.partnerType === "IMPLEMENTATION_PARTNER");

  const activeResellers = resellerPartners.filter((p) => p.status === "active").length;
  const pendingApplications = resellerPartners.filter((p) => p.status === "pending").length;
  const referralsThisMonth = referrals.filter(
    (r) => r.referredAt && new Date(r.referredAt) >= monthStart,
  ).length;
  const customersReferred = referrals.filter((r) => CUSTOMER_STATUSES.has(r.status)).length;
  const conversionRate =
    referrals.length === 0
      ? null
      : Math.round((customersReferred / referrals.length) * 1000) / 10;

  const commissionOwingCents = commissions
    .filter((c) => ["CALCULATED", "PENDING", "APPROVED"].includes(c.status))
    .reduce((sum, c) => sum + c.commissionAmountCents, 0);
  const commissionPaidCents = commissions
    .filter((c) => c.status === "PAID")
    .reduce((sum, c) => sum + c.commissionAmountCents, 0);

  /** Scaffold until subscription attribution is linked to partner referrals. */
  const mrrReferredCents: number | null = customersReferred > 0 ? null : 0;
  /** Until retention linkage exists, do not invent a second headcount. */
  const activeReferredCustomers: number | null = customersReferred > 0 ? null : 0;
  const pipelineValueCents: number | null = null;

  const personName = (p: (typeof partners)[number]) =>
    p.displayName ?? p.businessName ?? p.email ?? "Partner";

  const onboardingQueue: PartnerOnboardingQueue = {
    acquisition: resellerPartners
      .filter((p) => p.status === "pending")
      .map((p) => ({
        id: p.id,
        name: personName(p),
        href: `/command/partners/${p.id}`,
      })),
    delivery: deliveryPartners
      .filter((p) => p.status === "pending")
      .map((p) => ({
        id: p.id,
        name: personName(p),
        href: `/command/partners/${p.id}`,
      })),
  };

  const uncontacted = referrals.filter((r) => UNCONTACTED_REFERRAL.has(r.status));
  const commissionsAwaiting = commissions.filter((c) =>
    ["CALCULATED", "PENDING"].includes(c.status),
  );

  const attention: PartnerAttentionItem[] = [];
  if (uncontacted.length > 0) {
    attention.push({
      id: "referrals",
      severity: "yellow",
      title: `${uncontacted.length} referral${uncontacted.length === 1 ? "" : "s"} haven't been contacted`,
      detail: uncontacted[0]
        ? `${uncontacted[0].businessName ?? uncontacted[0].contactName ?? "Referral"}${
            uncontacted[0].partnerName ? ` · via ${uncontacted[0].partnerName}` : ""
          }`
        : null,
      href: "/command/referrals",
      cta: "Review referrals",
    });
  }
  if (commissionsAwaiting.length > 0) {
    const cents = commissionsAwaiting.reduce((s, c) => s + c.commissionAmountCents, 0);
    attention.push({
      id: "commissions",
      severity: "amber",
      title: `${formatAud(cents)} commission awaiting approval`,
      detail: `${commissionsAwaiting.length} commission row${commissionsAwaiting.length === 1 ? "" : "s"}`,
      href: "/command/commissions",
      cta: "Review commissions",
    });
  }

  const toRow = (p: (typeof partners)[number]): PartnerDashboardRow => ({
    id: p.id,
    name: p.displayName ?? p.businessName ?? "—",
    email: p.email,
    partnerTypeLabel: p.partnerTypeLabel,
    partnerType: p.partnerType,
    status: p.status,
    joinedAt: p.joinedAt,
  });

  const recentActivity: PartnerActivityRow[] = [
    ...referrals.slice(0, 5).map((r) => ({
      id: `ref-${r.id}`,
      label: "Referral",
      detail: `${r.businessName ?? r.contactName ?? "Referral"} · ${r.status}${
        r.partnerName ? ` · ${r.partnerName}` : ""
      }`,
      at: r.referredAt,
      href: "/command/referrals",
    })),
    ...commissions.slice(0, 3).map((c) => ({
      id: `com-${c.id}`,
      label: "Commission",
      detail: `${formatAud(c.commissionAmountCents)} · ${c.status}`,
      at: c.createdAt,
      href: "/command/commissions",
    })),
  ]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 8);

  const founding = seats.FOUNDING_RESELLER;
  const foundingPartnersInvited = resellerPartners.filter(
    (p) =>
      (p.partnerType === "FOUNDING_RESELLER" || p.partnerType === "FOUNDING_PARTNER") &&
      (p.status === "pending" || p.status === "active"),
  ).length;

  return {
    pulse: {
      activeResellers,
      pendingApplications,
      referralsThisMonth,
      customersReferred,
      activeReferredCustomers,
      pipelineValueCents,
      conversionRate,
      mrrReferredCents,
      commissionOwingCents,
      commissionPaidCents,
    },
    deliveryPulse: {
      activeProjects: deliveryMetrics.activeImplementations,
      projectsAtRisk: deliveryMetrics.atRisk + deliveryMetrics.blocked,
      customersInImplementation: new Set(
        deliveryProjects
          .filter((p) => p.status !== "customer_success")
          .map((p) => p.customerOrganisationId),
      ).size,
      serviceRevenueCents: null,
      supportRevenueCents: null,
      partnerShareCents: null,
    },
    attention,
    onboardingQueue,
    foundingSeats: {
      used: founding.used,
      cap: founding.cap ?? 10,
      invited: foundingPartnersInvited,
    },
    resellers: resellerPartners.slice(0, 12).map(toRow),
    deliveryPartners: deliveryPartners.slice(0, 12).map(toRow),
    recentActivity,
  };
}

function formatAud(cents: number) {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}
