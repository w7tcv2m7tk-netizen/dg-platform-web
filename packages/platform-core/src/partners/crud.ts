import { prisma } from "@dg/database";
import { isPendingPartnerInviteClerkId, parsePartnerInviteClerkId } from "./invite-state";
import {
  bpsToPercent,
  PARTNER_COMMISSION_CONFIG,
  partnerReferralUrl,
  type CommissionStatus,
  type PartnerInvitationStatus,
  type PartnerStatus,
  type PartnerType,
  type PartnerReferralStatus,
  type SerializedPartner,
  type SerializedPartnerCommission,
  type SerializedPartnerReferral,
} from "./types";

function isMissingRelationError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? String((err as { code?: unknown }).code ?? "") : "";
  const message =
    "message" in err ? String((err as { message?: unknown }).message ?? "") : "";
  return (
    code === "P2021" ||
    code === "P2022" ||
    code === "42P01" ||
    /relation ["'].*["'] does not exist/i.test(message) ||
    /does not exist in the current database/i.test(message)
  );
}

async function emptyIfUnmigrated<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (isMissingRelationError(err)) return fallback;
    throw err;
  }
}

// ─── Serializers ──────────────────────────────────────────────────────────────

function serializePartner(
  row: Awaited<ReturnType<typeof prisma.partner.findUniqueOrThrow>>,
  referralCount?: number,
): SerializedPartner {
  const config =
    PARTNER_COMMISSION_CONFIG[row.partnerType as PartnerType] ??
    PARTNER_COMMISSION_CONFIG.CUSTOMER_REFERRER;

  const invite = parsePartnerInviteClerkId(row.clerkUserId);
  const invitationStatus: PartnerInvitationStatus | null =
    row.status === "inactive" && invite.token
      ? "withdrawn"
      : invite.invitationStatus;

  return {
    id: row.id,
    clerkUserId: isPendingPartnerInviteClerkId(row.clerkUserId) ? null : row.clerkUserId,
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
    invitationStatus,
    inviteToken: invite.token,
    invitedAt: null,
    invitedByName: invite.token ? "Ben Roe" : null,
    invitationAcceptedAt: null,
    referralCode: row.referralCode,
    referralUrl: partnerReferralUrl(row.referralCode),
    displayName: row.displayName ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    businessName: row.businessName ?? null,
    deliveryRole:
      row.deliveryRole === "lead" || row.deliveryRole === "member" ? row.deliveryRole : null,
    notes: row.notes ?? null,
    termsAcceptedAt: row.termsAcceptedAt?.toISOString() ?? null,
    termsVersion: row.termsVersion ?? null,
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
  > & {
    referral?: { businessName: string } | null;
    partner?: { displayName: string | null; businessName: string | null; email: string | null } | null;
  },
): SerializedPartnerCommission {
  return {
    id: row.id,
    partnerId: row.partnerId,
    referralId: row.referralId,
    businessName: row.referral?.businessName ?? null,
    partnerName: row.partner?.displayName ?? row.partner?.businessName ?? row.partner?.email ?? null,
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
  /** Delivery Partner only: lead | member */
  deliveryRole?: "lead" | "member";
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
      deliveryRole:
        input.partnerType === "IMPLEMENTATION_PARTNER"
          ? (input.deliveryRole ?? "member")
          : null,
    },
  });

  return serializePartner(row);
}

export async function getPartnerByInviteToken(
  token: string,
): Promise<SerializedPartner | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;
  return emptyIfUnmigrated(async () => {
    const row = await prisma.partner.findFirst({
      where: {
        OR: [
          { clerkUserId: `invite-draft:${trimmed}` },
          { clerkUserId: `invite:${trimmed}` },
          { clerkUserId: `invite-accepted:${trimmed}` },
        ],
      },
    });
    if (!row) return null;
    return serializePartner(row);
  }, null);
}

export async function claimPartnerInvitation(input: {
  clerkUserId: string;
  email?: string | null;
}): Promise<SerializedPartner | null> {
  return emptyIfUnmigrated(async () => {
    const existing = await prisma.partner.findFirst({
      where: { clerkUserId: input.clerkUserId, status: { not: "inactive" } },
      orderBy: { createdAt: "asc" },
    });
    if (existing) return serializePartner(existing);

    const email = input.email?.trim().toLowerCase();
    if (!email) return null;
    const invited = await prisma.partner.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        clerkUserId: { startsWith: "invite" },
        status: { not: "inactive" },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!invited) return null;
    const row = await prisma.partner.update({
      where: { id: invited.id },
      data: { clerkUserId: input.clerkUserId },
    });
    return serializePartner(row);
  }, null);
}

export async function getPartnerByClerkUserId(
  clerkUserId: string,
): Promise<SerializedPartner | null> {
  return emptyIfUnmigrated(async () => {
    const row = await prisma.partner.findFirst({
      where: { clerkUserId, status: { not: "inactive" } },
      orderBy: { createdAt: "asc" },
    });
    if (!row) return null;
    return serializePartner(row);
  }, null);
}

export async function getPartnerById(
  id: string,
): Promise<SerializedPartner | null> {
  return emptyIfUnmigrated(async () => {
    const row = await prisma.partner.findUnique({ where: { id } });
    if (!row) return null;
    return serializePartner(row);
  }, null);
}

export async function getPartnerByReferralCode(
  referralCode: string,
): Promise<SerializedPartner | null> {
  return emptyIfUnmigrated(async () => {
    const row = await prisma.partner.findUnique({ where: { referralCode } });
    if (!row || row.status !== "active") return null;
    return serializePartner(row);
  }, null);
}

export async function listPartners(opts?: {
  status?: PartnerStatus;
  partnerType?: PartnerType;
  limit?: number;
  offset?: number;
}): Promise<{ partners: SerializedPartner[]; total: number }> {
  return emptyIfUnmigrated(async () => {
    const where: { status?: string; partnerType?: string } = {};
    if (opts?.status) where.status = opts.status;
    if (opts?.partnerType) where.partnerType = opts.partnerType;
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
  }, { partners: [], total: 0 });
}

export async function countPartnerSeats(): Promise<
  Record<PartnerType, { used: number; cap: number | null; remaining: number | null }>
> {
  const empty = (Object.keys(PARTNER_COMMISSION_CONFIG) as PartnerType[]).reduce(
    (acc, type) => {
      const cap = PARTNER_COMMISSION_CONFIG[type].seatCap;
      acc[type] = {
        used: 0,
        cap,
        remaining: cap == null ? null : cap,
      };
      return acc;
    },
    {} as Record<PartnerType, { used: number; cap: number | null; remaining: number | null }>,
  );

  return emptyIfUnmigrated(async () => {
    const rows = await prisma.partner.groupBy({
      by: ["partnerType"],
      where: { status: "active" },
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
  }, empty);
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
    clerkUserId: string;
    deliveryRole: "lead" | "member" | null;
    termsAcceptedAt: Date | null;
    termsVersion: string | null;
  }>,
): Promise<SerializedPartner> {
  const row = await prisma.partner.update({ where: { id }, data });
  return serializePartner(row);
}

export async function acceptPartnerProgrammeTerms(
  partnerId: string,
  termsVersion: string,
): Promise<SerializedPartner> {
  const row = await prisma.partner.update({
    where: { id: partnerId },
    data: {
      termsAcceptedAt: new Date(),
      termsVersion,
    },
  });
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
  return emptyIfUnmigrated(async () => {
    const rows = await prisma.partnerReferral.findMany({
      where: { partnerId },
      orderBy: { referredAt: "desc" },
    });
    return rows.map(serializeReferral);
  }, []);
}

export async function listAllReferrals(opts?: {
  status?: PartnerReferralStatus;
  limit?: number;
  offset?: number;
}): Promise<{
  referrals: (SerializedPartnerReferral & { partnerName: string | null })[];
  total: number;
}> {
  return emptyIfUnmigrated(async () => {
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
  }, { referrals: [], total: 0 });
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
  return emptyIfUnmigrated(async () => {
    const rows = await prisma.partnerCommission.findMany({
      where: { partnerId },
      include: { referral: { select: { businessName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(serializeCommission);
  }, []);
}

export async function listAllCommissions(opts?: {
  status?: CommissionStatus;
  limit?: number;
  offset?: number;
}): Promise<{ commissions: SerializedPartnerCommission[]; total: number }> {
  return emptyIfUnmigrated(async () => {
    const where = opts?.status ? { status: opts.status } : {};
    const [rows, total] = await Promise.all([
      prisma.partnerCommission.findMany({
        where,
        include: {
          referral: { select: { businessName: true } },
          partner: { select: { displayName: true, businessName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: opts?.limit ?? 50,
        skip: opts?.offset ?? 0,
      }),
      prisma.partnerCommission.count({ where }),
    ]);
    return { commissions: rows.map(serializeCommission), total };
  }, { commissions: [], total: 0 });
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
  return emptyIfUnmigrated(async () => {
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
  }, { totalEarnedCents: 0, pendingCents: 0, paidCents: 0, currency: "AUD" });
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

/**
 * Accrue Founding Reseller commission from a paid Stripe invoice for a referred org.
 * Idempotent on stripe invoice id (PartnerCommissionEvent.invoiceId).
 * Qualifying amount = invoice amount paid as billed — staff can adjust later.
 */
export async function accruePartnerCommissionFromInvoice(input: {
  referredOrganisationId?: string | null;
  stripeInvoiceId?: string | null;
  subscriptionId?: string | null;
  amountPaidCents?: number | null;
  currency?: string;
  periodStart?: Date | null;
  periodEnd?: Date | null;
}): Promise<
  | { ok: true; alreadyAccrued?: boolean; commissionId?: string }
  | { ok: false; reason: string }
> {
  if (!input.referredOrganisationId) {
    return { ok: false, reason: "missing_organisation" };
  }
  const amountPaidCents = input.amountPaidCents ?? 0;
  if (amountPaidCents <= 0) {
    return { ok: false, reason: "zero_amount" };
  }

  return emptyIfUnmigrated(async () => {
    if (input.stripeInvoiceId) {
      const existing = await prisma.partnerCommissionEvent.findFirst({
        where: { invoiceId: input.stripeInvoiceId, eventType: "invoice_paid" },
        select: { commissionId: true },
      });
      if (existing) {
        return {
          ok: true as const,
          alreadyAccrued: true,
          commissionId: existing.commissionId ?? undefined,
        };
      }
    }

    const referral = await prisma.partnerReferral.findFirst({
      where: {
        referredOrganisationId: input.referredOrganisationId!,
        status: { in: ["CUSTOMER", "ACTIVE", "COMMISSIONING", "ACCEPTED"] },
      },
      include: { partner: true },
      orderBy: { convertedAt: "desc" },
    });

    if (!referral) {
      return { ok: false as const, reason: "no_partner_referral" };
    }

    const partner = referral.partner;
    if (partner.status !== "active") {
      return { ok: false as const, reason: "partner_not_active" };
    }

    const windowStart = referral.convertedAt ?? referral.acceptedAt ?? referral.referredAt;
    const durationMonths = partner.commissionDurationMonths;
    const windowEnd = new Date(windowStart);
    windowEnd.setMonth(windowEnd.getMonth() + durationMonths);
    if (new Date() > windowEnd) {
      return { ok: false as const, reason: "outside_commission_window" };
    }

    const commissionBps = partner.commissionBps;
    const { commissionFromRevenue } = await import("./types");
    const commissionAmountCents = commissionFromRevenue(amountPaidCents, commissionBps);

    const commission = await createPartnerCommission({
      partnerId: partner.id,
      referralId: referral.id,
      customerOrganisationId: input.referredOrganisationId!,
      subscriptionId: input.subscriptionId ?? undefined,
      commissionBps,
      qualifyingRevenueCents: amountPaidCents,
      currency: input.currency ?? "AUD",
      periodStart: input.periodStart ?? undefined,
      periodEnd: input.periodEnd ?? undefined,
    });

    await logPartnerCommissionEvent({
      partnerId: partner.id,
      referralId: referral.id,
      commissionId: commission.id,
      subscriptionId: input.subscriptionId ?? undefined,
      invoiceId: input.stripeInvoiceId ?? undefined,
      eventType: "invoice_paid",
      qualifyingAmountCents: amountPaidCents,
      commissionBps,
      commissionAmountCents,
      currency: input.currency ?? "AUD",
      metadata: { source: "stripe.invoice.paid" },
    });

    return { ok: true as const, commissionId: commission.id };
  }, { ok: false as const, reason: "unmigrated" });
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
  return emptyIfUnmigrated(async () => {
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
  }, {
    businessesReferred: 0,
    consultations: 0,
    activeCustomers: 0,
    commissionEarnedCents: 0,
    commissionPendingCents: 0,
    commissionPaidCents: 0,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateReferralCode(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function canAccessPartnerPortal(partner: SerializedPartner | null): boolean {
  if (!partner) return false;
  return partner.status === "active" || partner.status === "pending";
}
