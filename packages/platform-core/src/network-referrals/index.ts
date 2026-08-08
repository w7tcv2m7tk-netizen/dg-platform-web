/**
 * Business Referral Network — B2B introductions between verified businesses.
 * NOT Platform Refer & Earn (SaaS subscription credits).
 * Contact = person; referral lands on Contact timeline / CRM.
 * See docs/foundations/REVIEWS-AND-REFERRALS.md §§2–4.
 */

import type { Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import { platformEvents } from "../events";

export const BUSINESS_REFERRAL_TYPES = [
  "free",
  "reciprocal",
  "paid",
  "commission",
] as const;

export type BusinessReferralType = (typeof BUSINESS_REFERRAL_TYPES)[number];

export const BUSINESS_REFERRAL_STATUSES = [
  "referral",
  "accepted",
  "contacted",
  "converted",
  "revenue",
] as const;

export type BusinessReferralStatus = (typeof BUSINESS_REFERRAL_STATUSES)[number];

export const BUSINESS_REFERRAL_TYPE_LABELS: Record<BusinessReferralType, string> = {
  free: "Free",
  reciprocal: "Reciprocal",
  paid: "Paid",
  commission: "Commission",
};

export const BUSINESS_REFERRAL_STATUS_LABELS: Record<BusinessReferralStatus, string> = {
  referral: "Referral",
  accepted: "Accepted",
  contacted: "Contacted",
  converted: "Converted",
  revenue: "Revenue",
};

/** Regulated verticals — Paid/Commission disabled until compliance pack. */
export const REGULATED_INDUSTRY_HINTS = [
  "real estate",
  "real-estate",
  "mortgage",
  "finance",
  "insurance",
  "financial",
  "conveyanc",
] as const;

export const BUSINESS_REFERRAL_COMPLIANCE_NOTE =
  "Paid and Commission referrals in regulated industries (real estate, finance, insurance, and similar) require a jurisdiction-specific compliance pack before financial incentives can be enabled. Invisible commissions are not allowed — fee type and terms must be disclosed to all parties.";

export function normalizeBusinessReferralType(raw: unknown): BusinessReferralType | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  return (BUSINESS_REFERRAL_TYPES as readonly string[]).includes(v)
    ? (v as BusinessReferralType)
    : null;
}

export function normalizeBusinessReferralStatus(raw: unknown): BusinessReferralStatus | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  return (BUSINESS_REFERRAL_STATUSES as readonly string[]).includes(v)
    ? (v as BusinessReferralStatus)
    : null;
}

export function industryLooksRegulated(industry?: string | null) {
  if (!industry?.trim()) return false;
  const lower = industry.toLowerCase();
  return REGULATED_INDUSTRY_HINTS.some((h) => lower.includes(h));
}

export function financialIncentivesAllowed(input: {
  type: BusinessReferralType;
  industry?: string | null;
  compliancePackEnabled?: boolean;
}) {
  if (input.type === "free" || input.type === "reciprocal") {
    return { allowed: true as const };
  }
  if (input.compliancePackEnabled) {
    return { allowed: true as const };
  }
  if (industryLooksRegulated(input.industry)) {
    return {
      allowed: false as const,
      reason: "compliance_pack_required" as const,
      message: BUSINESS_REFERRAL_COMPLIANCE_NOTE,
    };
  }
  return { allowed: true as const };
}

export type BusinessReferralRecord = {
  id: string;
  activityId: string;
  contactId: string;
  type: BusinessReferralType;
  status: BusinessReferralStatus;
  recipientBusiness: string;
  feeDisclosure?: string | null;
  disclosed: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ReferralMeta = {
  referralId: string;
  type: BusinessReferralType;
  status: BusinessReferralStatus;
  recipientBusiness: string;
  feeDisclosure?: string | null;
  disclosed: boolean;
  notes?: string | null;
  updatedAt?: string;
};

function parseMeta(raw: unknown): ReferralMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const type = normalizeBusinessReferralType(m.type);
  const status = normalizeBusinessReferralStatus(m.status);
  if (!type || !status || typeof m.referralId !== "string") return null;
  return {
    referralId: m.referralId,
    type,
    status,
    recipientBusiness: String(m.recipientBusiness ?? ""),
    feeDisclosure: typeof m.feeDisclosure === "string" ? m.feeDisclosure : null,
    disclosed: Boolean(m.disclosed),
    notes: typeof m.notes === "string" ? m.notes : null,
    updatedAt: typeof m.updatedAt === "string" ? m.updatedAt : undefined,
  };
}

function serialize(
  activity: {
    id: string;
    entityId: string;
    createdAt: Date;
    metadata: unknown;
  },
  meta: ReferralMeta,
): BusinessReferralRecord {
  return {
    id: meta.referralId,
    activityId: activity.id,
    contactId: activity.entityId,
    type: meta.type,
    status: meta.status,
    recipientBusiness: meta.recipientBusiness,
    feeDisclosure: meta.feeDisclosure,
    disclosed: meta.disclosed,
    notes: meta.notes,
    createdAt: activity.createdAt.toISOString(),
    updatedAt: meta.updatedAt ?? activity.createdAt.toISOString(),
  };
}

export async function listBusinessReferralsForContact(
  organisationId: string,
  contactId: string,
): Promise<BusinessReferralRecord[]> {
  if (!process.env.DATABASE_URL) return [];
  const { prisma } = await import("@dg/database");

  const rows = await prisma.activity.findMany({
    where: {
      organisationId,
      entityType: "Contact",
      entityId: contactId,
      activityType: "business_referral",
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return rows
    .map((row) => {
      const meta = parseMeta(row.metadata);
      return meta ? serialize(row, meta) : null;
    })
    .filter((r): r is BusinessReferralRecord => Boolean(r));
}

export async function listOrganisationBusinessReferrals(
  organisationId: string,
  limit = 40,
): Promise<BusinessReferralRecord[]> {
  if (!process.env.DATABASE_URL) return [];
  const { prisma } = await import("@dg/database");

  const rows = await prisma.activity.findMany({
    where: {
      organisationId,
      activityType: "business_referral",
      entityType: "Contact",
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
  });

  return rows
    .map((row) => {
      const meta = parseMeta(row.metadata);
      return meta ? serialize(row, meta) : null;
    })
    .filter((r): r is BusinessReferralRecord => Boolean(r));
}

export async function createBusinessReferral(input: {
  organisationId: string;
  contactId: string;
  actorId?: string;
  type: BusinessReferralType;
  recipientBusiness: string;
  feeDisclosure?: string;
  disclosed: boolean;
  notes?: string;
  industry?: string | null;
  compliancePackEnabled?: boolean;
}) {
  const gate = financialIncentivesAllowed({
    type: input.type,
    industry: input.industry,
    compliancePackEnabled: input.compliancePackEnabled,
  });
  if (!gate.allowed) {
    return { ok: false as const, reason: gate.reason, message: gate.message };
  }

  if ((input.type === "paid" || input.type === "commission") && !input.disclosed) {
    return {
      ok: false as const,
      reason: "disclosure_required" as const,
      message:
        "Paid and Commission referrals require explicit fee disclosure acknowledgement.",
    };
  }

  const recipient = input.recipientBusiness.trim();
  if (!recipient) {
    return {
      ok: false as const,
      reason: "validation" as const,
      message: "Recipient business is required",
    };
  }

  if (!process.env.DATABASE_URL) {
    return {
      ok: false as const,
      reason: "no_database" as const,
      message: "DATABASE_URL not configured",
    };
  }

  const { prisma } = await import("@dg/database");
  const contact = await prisma.contact.findFirst({
    where: {
      id: input.contactId,
      organisationId: input.organisationId,
      deletedAt: null,
    },
  });
  if (!contact) {
    return { ok: false as const, reason: "not_found" as const, message: "Contact not found" };
  }

  const referralId = `bref_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const meta: ReferralMeta = {
    referralId,
    type: input.type,
    status: "referral",
    recipientBusiness: recipient,
    feeDisclosure: input.feeDisclosure?.trim() || null,
    disclosed: input.disclosed,
    notes: input.notes?.trim() || null,
    updatedAt: now,
  };

  const activity = await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "Contact",
      entityId: input.contactId,
      activityType: "business_referral",
      title: `Business referral → ${recipient}`,
      body: [
        `Type: ${BUSINESS_REFERRAL_TYPE_LABELS[input.type]}`,
        `Status: ${BUSINESS_REFERRAL_STATUS_LABELS.referral}`,
        meta.feeDisclosure ? `Fee: ${meta.feeDisclosure}` : null,
        meta.notes,
      ]
        .filter(Boolean)
        .join(" · "),
      sourceApp: "network",
      createdBy: input.actorId,
      metadata: meta as unknown as Prisma.InputJsonValue,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "BusinessReferral",
    entityId: referralId,
    changes: { after: meta },
  });

  await platformEvents.publish({
    type: "business_referral.created",
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "Contact",
    entityId: input.contactId,
    payload: {
      referralId,
      status: "referral",
      type: input.type,
      recipientBusiness: recipient,
    },
    occurredAt: new Date(),
  });

  return {
    ok: true as const,
    referral: serialize(activity, meta),
  };
}

const STATUS_ORDER: BusinessReferralStatus[] = [...BUSINESS_REFERRAL_STATUSES];

export async function advanceBusinessReferral(input: {
  organisationId: string;
  referralId: string;
  actorId?: string;
  status?: BusinessReferralStatus;
}) {
  if (!process.env.DATABASE_URL) {
    return {
      ok: false as const,
      reason: "no_database" as const,
      message: "DATABASE_URL not configured",
    };
  }

  const { prisma } = await import("@dg/database");
  const rows = await prisma.activity.findMany({
    where: {
      organisationId: input.organisationId,
      activityType: "business_referral",
    },
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  const match = rows.find((row) => {
    const meta = parseMeta(row.metadata);
    return meta?.referralId === input.referralId;
  });
  if (!match) {
    return { ok: false as const, reason: "not_found" as const, message: "Referral not found" };
  }

  const meta = parseMeta(match.metadata)!;
  let nextStatus = input.status;
  if (!nextStatus) {
    const idx = STATUS_ORDER.indexOf(meta.status);
    nextStatus = STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)]!;
  }

  const now = new Date().toISOString();
  const nextMeta: ReferralMeta = {
    ...meta,
    status: nextStatus,
    updatedAt: now,
  };

  const updated = await prisma.activity.update({
    where: { id: match.id },
    data: {
      title: `Business referral → ${nextMeta.recipientBusiness} (${BUSINESS_REFERRAL_STATUS_LABELS[nextStatus]})`,
      body: [
        `Type: ${BUSINESS_REFERRAL_TYPE_LABELS[nextMeta.type]}`,
        `Status: ${BUSINESS_REFERRAL_STATUS_LABELS[nextStatus]}`,
        nextMeta.feeDisclosure ? `Fee: ${nextMeta.feeDisclosure}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      metadata: nextMeta as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "Contact",
      entityId: match.entityId,
      activityType: "business_referral_status",
      title: `Referral ${BUSINESS_REFERRAL_STATUS_LABELS[nextStatus].toLowerCase()}`,
      body: `${nextMeta.recipientBusiness} · ${BUSINESS_REFERRAL_TYPE_LABELS[nextMeta.type]}`,
      sourceApp: "network",
      createdBy: input.actorId,
      metadata: {
        referralId: nextMeta.referralId,
        status: nextStatus,
      } as Prisma.InputJsonValue,
    },
  });

  await platformEvents.publish({
    type: "business_referral.status_changed",
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "Contact",
    entityId: match.entityId,
    payload: {
      referralId: nextMeta.referralId,
      status: nextStatus,
      type: nextMeta.type,
    },
    occurredAt: new Date(),
  });

  return { ok: true as const, referral: serialize(updated, nextMeta) };
}

export function businessReferralFunnelCounts(referrals: BusinessReferralRecord[]) {
  const counts = Object.fromEntries(
    BUSINESS_REFERRAL_STATUSES.map((s) => [s, 0]),
  ) as Record<BusinessReferralStatus, number>;
  for (const r of referrals) counts[r.status] += 1;
  return counts;
}
