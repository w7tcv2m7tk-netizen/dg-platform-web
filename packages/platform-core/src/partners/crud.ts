import { prisma } from "@dg/database";
import {
  bpsToPercent,
  PARTNER_COMMISSION_CONFIG,
  partnerReferralUrl,
  type CommissionStatus,
  type PartnerStatus,
  type PartnerType,
  type PartnerReferralStatus,
  type SerializedPartner,
  type SerializedPartnerCommission,
  type SerializedPartnerReferral,
} from "./types";

// ─── Serializers ──────────────────────────────────────────────────────────────

function serializePartner(
  row: Awaited<ReturnType<typeof prisma.partner.findUniqueOrThrow>>,
  referralCount?: number,
): SerializedPartner {
  const config =
    PARTNER_COMMISSION_CONFIG[row.partnerType as PartnerType] ??
    PARTNER_COMMISSION_CONFIG.CUSTOMER_REFERRER;

  return {
    id: row.id,
    clerkUserId: row.clerkUserId,
    organisationId: row.organisationId ?? null,
    partnerType: row.partnerType as PartnerType,
    partnerTypeLabel: config.label,
    programme: config.programme,
    seatCap: config.seatCap,
    cohort: row.cohort ?? null,
    commissionBps: row.commissionBps,
    commissionPercent: bpsToPercent(row.commissionBps),
    commissionDurationMonths: row.commissionDurationMonths,
    status: row.status as PartnerStatus,
    referralCode: row.referralCode,
    referralUrl: partnerReferralUrl(row.referralCode),
    displayName: row.displayName ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    businessName: row.businessName ?? null,
    notes: row.notes ?? null,
    joinedAt: row.joinedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeReferral(
  row: Awaited<ReturnType<typeof prisma.partnerReferral.findUniqueOrThrow>>,
): SerializedPartnerReferral {
  return {
    id: row.id,
    partnerId: row.partnerId,
    referralCode: row.referralCode,
    businessName: row.businessName,
    contactName: row.contactName ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    website: row.website ?? null,
    industry: row.industry ?? null,
    notes: row.notes ?? null,
    source: (row.source as "link" | "warm_introduction") ?? "link",
    status: row.status as PartnerReferralStatus,
    referredAt: row.referredAt.toISOString(),
    contactedAt: row.contactedAt?.toISOString() ?? null,
    consultationAt: row.consultationAt?.toISOString() ?? null,
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    convertedAt: row.convertedAt?.toISOString() ?? null,
  };
}

function serializeCommission(
  row: Awaited<
    ReturnType<typeof prisma.partnerCommission.findUniqueOrThrow>
  > & { referral?: { businessName: string } | null },
): SerializedPartnerCommission {
  return {
    id: row.id,
    partnerId: row.partnerId,
    referralId: row.referralId,
    businessName: (row as { referral?: { businessName?: string } | null }).referral?.businessName ?? null,
    customerOrganisationId: row.customerOrganisationId ?? null,
    subscriptionId: row.subscriptionId ?? null,
    commissionBps: row.commissionBps,
    commissionPercent: bpsToPercent(row.commissionBps),
    qualifyingRevenueCents: row.qualifyingRevenueCents,
    commissionAmountCents: row.commissionAmountCents,
    currency: row.currency,
    periodStart: row.periodStart?.toISOString() ?? null,
    periodEnd: row.periodEnd?.toISOString() ?? null,
    status: row.status as CommissionStatus,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Partner CRUD ─────────────────────────────────────────────────────────────

export async function createPartner(input: {
  clerkUserId: string;
  partnerType: PartnerType;
  displayName?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  cohort?: string;
  notes?: string;
  organisationId?: string;
  /** Override; defaults from partnerType config */
  commissionBps?: number;
  commissionDurationMonths?: number;
}): Promise<SerializedPartner> {
  const config = PARTNER_COMMISSION_CONFIG[input.partnerType];
  const referralCode = generateReferralCode();

  const row = await prisma.partner.create({
    data: {
      clerkUserId: input.clerkUserId,
      organisationId: input.organisationId ?? null,
      partnerType: input.partnerType,
      cohort: input.cohort ?? null,
      commissionBps: input.commissionBps ?? config.commissionBps,
      commissionDurationMonths:
        input.commissionDurationMonths ?? config.durationMonths,
      status: "pending",
      referralCode,
      displayName: input.displayName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      businessName: input.businessName ?? null,
      notes: input.notes ?? null,
    },
  });

  return serializePartner(row);
}

export async function getPartnerByClerkUserId(
  clerkUserId: string,
): Promise<SerializedPartner | null> {
  const row = await prisma.partner.findFirst({
    where: { clerkUserId, status: { not: "inactive" } },
    orderBy: { createdAt: "asc" },
  });
  if (!row) return null;
  return serializePartner(row);
}

export async function getPartnerById(
  id: string,
): Promise<SerializedPartner | null> {
  const row = await prisma.partner.findUnique({ where: { id } });
  if (!row) return null;
  return serializePartner(row);
}

export async function getPartnerByReferralCode(
  referralCode: string,
): Promise<SerializedPartner | null> {
  const row = await prisma.partner.findUnique({ where: { referralCode } });
  if (!row || row.status !== "active") return null;
  return serializePartner(row);
}

export async function listPartners(opts?: {
  status?: PartnerStatus;
  limit?: number;
  offset?: number;
}): Promise<{ partners: SerializedPartner[]; total: number }> {
  const where = opts?.status ? { status: opts.status } : {};
  const [rows, total] = await Promise.all([
    prisma.partner.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: opts?.limit ?? 50,
      skip: opts?.offset ?? 0,
    }),
    prisma.partner.count({ where }),
  ]);
  return { partners: rows.map((r) => serializePartner(r)), total };
}

export async function countPartnerSeats(): Promise<
  Record<PartnerType, { used: number; cap: number | null; remaining: number | null }>
> {
  const rows = await prisma.partner.groupBy({
    by: ["partnerType"],
    where: { status: { in: ["active", "pending"] } },
    _count: { _all: true },
  });
  const usedByType = Object.fromEntries(
    rows.map((r) => [r.partnerType, r._count._all]),
  ) as Partial<Record<PartnerType, number>>;

  return (Object.keys(PARTNER_COMMISSION_CONFIG) as PartnerType[]).reduce(
    (acc, type) => {
      const cap = PARTNER_COMMISSION_CONFIG[type].seatCap;
      const used = usedByType[type] ?? 0;
      acc[type] = {
        used,
        cap,
        remaining: cap == null ? null : Math.max(0, cap - used),
      };
      return acc;
    },
    {} as Record<PartnerType, { used: number; cap: number | null; remaining: number | null }>,
  );
}

export async function updatePartner(
  id: string,
  data: Partial<{
    status: PartnerStatus;
    partnerType: PartnerType;
    commissionBps: number;
    commissionDurationMonths: number;
    displayName: string;
    email: string;
    phone: string;
    businessName: string;
    cohort: string;
    notes: string;
    joinedAt: Date;
    organisationId: string;
  }>,
): Promise<SerializedPartner> {
  const row = await prisma.partner.update({ where: { id }, data });
  return serializePartner(row);
}

export async function approvePartner(id: string): Promise<SerializedPartner> {
  const row = await prisma.partner.update({
    where: { id },
    data: { status: "active", joinedAt: new Date() },
  });
  return serializePartner(row);
}

export async function suspendPartner(id: string): Promise<SerializedPartner> {
  const row = await prisma.partner.update({
    where: { id },
    data: { status: "suspended" },
  });
  return serializePartner(row);
}

// ─── Partner Referral CRUD ────────────────────────────────────────────────────

export async function createPartnerReferral(input: {
  partnerId: string;
  referralCode: string;
  businessName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  notes?: string;
  source: "link" | "warm_introduction";
}): Promise<SerializedPartnerReferral> {
  const email = input.email?.trim().toLowerCase() || null;
  if (email) {
    const partner = await prisma.partner.findUnique({ where: { id: input.partnerId } });
    if (partner?.email && partner.email.trim().toLowerCase() === email) {
      throw new Error(
        "You cannot refer yourself or a business you control unless DigitalGate approves it in writing.",
      );
    }
    const duplicate = await prisma.partnerReferral.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        status: { notIn: ["DECLINED", "CANCELLED", "CLOSED"] },
      },
    });
    if (duplicate) {
      throw new Error(
        "This business is already recorded. DigitalGate will determine attribution if more than one introducer is involved.",
      );
    }
  }

  const row = await prisma.partnerReferral.create({
    data: {
      partnerId: input.partnerId,
      referralCode: input.referralCode,
      businessName: input.businessName,
      contactName: input.contactName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      website: input.website ?? null,
      industry: input.industry ?? null,
      notes: input.notes ?? null,
      source: input.source,
      status: "INTRODUCED",
    },
  });
  return serializeReferral(row);
}

export async function listPartnerReferrals(
  partnerId: string,
): Promise<SerializedPartnerReferral[]> {
  const rows = await prisma.partnerReferral.findMany({
    where: { partnerId },
    orderBy: { referredAt: "desc" },
  });
  return rows.map(serializeReferral);
}

export async function listAllReferrals(opts?: {
  status?: PartnerReferralStatus;
  limit?: number;
  offset?: number;
}): Promise<{
  referrals: (SerializedPartnerReferral & { partnerName: string | null })[];
  total: number;
}> {
  const where = opts?.status ? { status: opts.status } : {};
  const [rows, total] = await Promise.all([
    prisma.partnerReferral.findMany({
      where,
      include: { partner: { select: { displayName: true, email: true } } },
      orderBy: { referredAt: "desc" },
      take: opts?.limit ?? 50,
      skip: opts?.offset ?? 0,
    }),
    prisma.partnerReferral.count({ where }),
  ]);
  return {
    referrals: rows.map((r) => ({
      ...serializeReferral(r),
      partnerName: r.partner.displayName ?? r.partner.email ?? null,
    })),
    total,
  };
}

export async function getPartnerReferralById(
  id: string,
): Promise<SerializedPartnerReferral | null> {
  const row = await prisma.partnerReferral.findUnique({ where: { id } });
  if (!row) return null;
  return serializeReferral(row);
}

export async function updatePartnerReferralStatus(
  id: string,
  status: PartnerReferralStatus,
  timestamps?: {
    contactedAt?: Date;
    consultationAt?: Date;
    acceptedAt?: Date;
    convertedAt?: Date;
  },
): Promise<SerializedPartnerReferral> {
  const row = await prisma.partnerReferral.update({
    where: { id },
    data: { status, ...timestamps },
  });
  return serializeReferral(row);
}

/** Called when a referred business becomes a DigitalGate customer org. */
export async function linkReferralToOrganisation(
  referralId: string,
  organisationId: string,
): Promise<void> {
  await prisma.partnerReferral.update({
    where: { id: referralId },
    data: {
      referredOrganisationId: organisationId,
      status: "ACTIVE",
      convertedAt: new Date(),
    },
  });
}

/**
 * Attribution: find the referral for an email or org and link it.
 * Called when a new org signs up with a ?ref= code.
 */
export async function attributePartnerReferralByCode(input: {
  referralCode: string;
  email?: string;
  businessName?: string;
  organisationId?: string;
}): Promise<void> {
  const partner = await getPartnerByReferralCode(input.referralCode);
  if (!partner) return;

  const existing = await prisma.partnerReferral.findFirst({
    where: { referralCode: input.referralCode, email: input.email ?? undefined },
  });

  if (existing) {
    if (input.organisationId) {
      await prisma.partnerReferral.update({
        where: { id: existing.id },
        data: {
          referredOrganisationId: input.organisationId,
          status: "ACTIVE",
          convertedAt: new Date(),
        },
      });
    }
    return;
  }

  await prisma.partnerReferral.create({
    data: {
      partnerId: partner.id,
      referralCode: input.referralCode,
      businessName: input.businessName ?? "Unknown",
      email: input.email ?? null,
      source: "link",
      status: input.organisationId ? "ACTIVE" : "INTRODUCED",
      referredOrganisationId: input.organisationId ?? null,
      convertedAt: input.organisationId ? new Date() : null,
    },
  });
}

// ─── Commission CRUD ──────────────────────────────────────────────────────────

export async function createPartnerCommission(input: {
  partnerId: string;
  referralId: string;
  customerOrganisationId?: string;
  subscriptionId?: string;
  commissionBps: number;
  qualifyingRevenueCents: number;
  currency?: string;
  periodStart?: Date;
  periodEnd?: Date;
}): Promise<SerializedPartnerCommission> {
  const { commissionFromRevenue } = await import("./types");
  const commissionAmountCents = commissionFromRevenue(
    input.qualifyingRevenueCents,
    input.commissionBps,
  );

  const row = await prisma.partnerCommission.create({
    data: {
      partnerId: input.partnerId,
      referralId: input.referralId,
      customerOrganisationId: input.customerOrganisationId ?? null,
      subscriptionId: input.subscriptionId ?? null,
      commissionBps: input.commissionBps,
      qualifyingRevenueCents: input.qualifyingRevenueCents,
      commissionAmountCents,
      currency: input.currency ?? "AUD",
      periodStart: input.periodStart ?? null,
      periodEnd: input.periodEnd ?? null,
      status: "CALCULATED",
    },
    include: { referral: { select: { businessName: true } } },
  });

  return serializeCommission(row);
}

export async function listPartnerCommissions(
  partnerId: string,
): Promise<SerializedPartnerCommission[]> {
  const rows = await prisma.partnerCommission.findMany({
    where: { partnerId },
    include: { referral: { select: { businessName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serializeCommission);
}

export async function listAllCommissions(opts?: {
  status?: CommissionStatus;
  limit?: number;
  offset?: number;
}): Promise<{ commissions: SerializedPartnerCommission[]; total: number }> {
  const where = opts?.status ? { status: opts.status } : {};
  const [rows, total] = await Promise.all([
    prisma.partnerCommission.findMany({
      where,
      include: { referral: { select: { businessName: true } } },
      orderBy: { createdAt: "desc" },
      take: opts?.limit ?? 50,
      skip: opts?.offset ?? 0,
    }),
    prisma.partnerCommission.count({ where }),
  ]);
  return { commissions: rows.map(serializeCommission), total };
}

export async function updateCommissionStatus(
  id: string,
  status: CommissionStatus,
): Promise<SerializedPartnerCommission> {
  const data: Record<string, unknown> = { status };
  if (status === "APPROVED") data.approvedAt = new Date();
  if (status === "PAID") data.paidAt = new Date();

  const row = await prisma.partnerCommission.update({
    where: { id },
    data,
    include: { referral: { select: { businessName: true } } },
  });
  return serializeCommission(row);
}

export async function getPartnerCommissionSummary(partnerId: string): Promise<{
  totalEarnedCents: number;
  pendingCents: number;
  paidCents: number;
  currency: string;
}> {
  const rows = await prisma.partnerCommission.findMany({
    where: { partnerId },
    select: { status: true, commissionAmountCents: true, currency: true },
  });

  let totalEarnedCents = 0;
  let pendingCents = 0;
  let paidCents = 0;

  for (const row of rows) {
    totalEarnedCents += row.commissionAmountCents;
    if (row.status === "PAID") paidCents += row.commissionAmountCents;
    else pendingCents += row.commissionAmountCents;
  }

  return { totalEarnedCents, pendingCents, paidCents, currency: "AUD" };
}

// ─── Commission Event Logging ─────────────────────────────────────────────────

export async function logPartnerCommissionEvent(input: {
  partnerId: string;
  referralId: string;
  commissionId?: string;
  subscriptionId?: string;
  invoiceId?: string;
  eventType: string;
  qualifyingAmountCents: number;
  commissionBps: number;
  commissionAmountCents: number;
  currency?: string;
  period?: string;
  metadata?: object;
}): Promise<void> {
  await prisma.partnerCommissionEvent.create({
    data: {
      partnerId: input.partnerId,
      referralId: input.referralId,
      commissionId: input.commissionId ?? null,
      subscriptionId: input.subscriptionId ?? null,
      invoiceId: input.invoiceId ?? null,
      eventType: input.eventType,
      qualifyingAmountCents: input.qualifyingAmountCents,
      commissionBps: input.commissionBps,
      commissionAmountCents: input.commissionAmountCents,
      currency: input.currency ?? "AUD",
      period: input.period ?? null,
      metadata: (input.metadata as object | null | undefined) ?? undefined,
    },
  });
}

// ─── Partner Dashboard Metrics ────────────────────────────────────────────────

export async function getPartnerDashboardMetrics(partnerId: string): Promise<{
  businessesReferred: number;
  consultations: number;
  activeCustomers: number;
  commissionEarnedCents: number;
  commissionPendingCents: number;
  commissionPaidCents: number;
}> {
  const [referrals, commissionSummary] = await Promise.all([
    prisma.partnerReferral.findMany({
      where: { partnerId },
      select: { status: true },
    }),
    getPartnerCommissionSummary(partnerId),
  ]);

  return {
    businessesReferred: referrals.length,
    consultations: referrals.filter((r) =>
      ["CONSULTATION", "APPLICATION", "ONBOARDING", "ACCEPTED", "CUSTOMER", "ACTIVE", "COMMISSIONING"].includes(
        r.status,
      ),
    ).length,
    activeCustomers: referrals.filter((r) =>
      ["CUSTOMER", "ACTIVE", "COMMISSIONING"].includes(r.status),
    ).length,
    commissionEarnedCents: commissionSummary.totalEarnedCents,
    commissionPendingCents: commissionSummary.pendingCents,
    commissionPaidCents: commissionSummary.paidCents,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateReferralCode(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function canAccessPartnerPortal(partner: SerializedPartner | null): boolean {
  if (!partner) return false;
  return partner.status === "active" || partner.status === "pending";
}
