import type { Prisma } from "@dg/database";

import type {
  PlatformCommercialStatus,
  PlatformEntitlementLevel,
} from "./subscription-types";

export type PlatformSubscriptionRow = {
  id: string;
  organisationId: string;
  status: PlatformCommercialStatus;
  entitlement: PlatformEntitlementLevel;
  planTier: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeStatus: string | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  paymentFailedAt: Date | null;
  gracePeriodEndsAt: Date | null;
  restrictedAt: Date | null;
  suspendedAt: Date | null;
  cancelledAt: Date | null;
  retentionEndsAt: Date | null;
  foundingCustomer: boolean;
  platformExempt: boolean;
  day3ReminderAt: Date | null;
  day7ReminderAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapRow(row: {
  id: string;
  organisationId: string;
  status: string;
  entitlement: string;
  planTier: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeStatus: string | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  paymentFailedAt: Date | null;
  gracePeriodEndsAt: Date | null;
  restrictedAt: Date | null;
  suspendedAt: Date | null;
  cancelledAt: Date | null;
  retentionEndsAt: Date | null;
  foundingCustomer: boolean;
  platformExempt: boolean;
  day3ReminderAt: Date | null;
  day7ReminderAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PlatformSubscriptionRow {
  return {
    ...row,
    status: row.status as PlatformCommercialStatus,
    entitlement: row.entitlement as PlatformEntitlementLevel,
  };
}

export async function getPlatformSubscription(
  organisationId: string,
): Promise<PlatformSubscriptionRow | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { prisma } = await import("@dg/database");
    const row = await prisma.platformSubscription.findUnique({
      where: { organisationId },
    });
    return row ? mapRow(row) : null;
  } catch {
    // Table may not exist until migration is applied — never take down Apps / Settings.
    return null;
  }
}

export async function getPlatformSubscriptionByStripeCustomer(
  stripeCustomerId: string,
): Promise<PlatformSubscriptionRow | null> {
  if (!process.env.DATABASE_URL) return null;
  const { prisma } = await import("@dg/database");
  const row = await prisma.platformSubscription.findFirst({
    where: { stripeCustomerId },
  });
  return row ? mapRow(row) : null;
}

export async function getPlatformSubscriptionByStripeSubscription(
  stripeSubscriptionId: string,
): Promise<PlatformSubscriptionRow | null> {
  if (!process.env.DATABASE_URL) return null;
  const { prisma } = await import("@dg/database");
  const row = await prisma.platformSubscription.findFirst({
    where: { stripeSubscriptionId },
  });
  return row ? mapRow(row) : null;
}

export type UpsertPlatformSubscriptionInput = {
  organisationId: string;
  status: PlatformCommercialStatus;
  entitlement: PlatformEntitlementLevel;
  planTier?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeStatus?: string | null;
  trialStart?: Date | null;
  trialEnd?: Date | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  paymentFailedAt?: Date | null;
  gracePeriodEndsAt?: Date | null;
  restrictedAt?: Date | null;
  suspendedAt?: Date | null;
  cancelledAt?: Date | null;
  retentionEndsAt?: Date | null;
  foundingCustomer?: boolean;
  platformExempt?: boolean;
  day3ReminderAt?: Date | null;
  day7ReminderAt?: Date | null;
};

export async function upsertPlatformSubscription(
  input: UpsertPlatformSubscriptionInput,
): Promise<PlatformSubscriptionRow> {
  const { prisma } = await import("@dg/database");
  const data = {
    status: input.status,
    entitlement: input.entitlement,
    planTier: input.planTier ?? undefined,
    stripeCustomerId: input.stripeCustomerId ?? undefined,
    stripeSubscriptionId: input.stripeSubscriptionId ?? undefined,
    stripeStatus: input.stripeStatus ?? undefined,
    trialStart: input.trialStart === undefined ? undefined : input.trialStart,
    trialEnd: input.trialEnd === undefined ? undefined : input.trialEnd,
    currentPeriodStart:
      input.currentPeriodStart === undefined ? undefined : input.currentPeriodStart,
    currentPeriodEnd:
      input.currentPeriodEnd === undefined ? undefined : input.currentPeriodEnd,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    paymentFailedAt:
      input.paymentFailedAt === undefined ? undefined : input.paymentFailedAt,
    gracePeriodEndsAt:
      input.gracePeriodEndsAt === undefined ? undefined : input.gracePeriodEndsAt,
    restrictedAt: input.restrictedAt === undefined ? undefined : input.restrictedAt,
    suspendedAt: input.suspendedAt === undefined ? undefined : input.suspendedAt,
    cancelledAt: input.cancelledAt === undefined ? undefined : input.cancelledAt,
    retentionEndsAt:
      input.retentionEndsAt === undefined ? undefined : input.retentionEndsAt,
    foundingCustomer: input.foundingCustomer,
    platformExempt: input.platformExempt,
    day3ReminderAt:
      input.day3ReminderAt === undefined ? undefined : input.day3ReminderAt,
    day7ReminderAt:
      input.day7ReminderAt === undefined ? undefined : input.day7ReminderAt,
  };

  const row = await prisma.platformSubscription.upsert({
    where: { organisationId: input.organisationId },
    create: {
      organisationId: input.organisationId,
      status: input.status,
      entitlement: input.entitlement,
      planTier: input.planTier ?? null,
      stripeCustomerId: input.stripeCustomerId ?? null,
      stripeSubscriptionId: input.stripeSubscriptionId ?? null,
      stripeStatus: input.stripeStatus ?? null,
      trialStart: input.trialStart ?? null,
      trialEnd: input.trialEnd ?? null,
      currentPeriodStart: input.currentPeriodStart ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      paymentFailedAt: input.paymentFailedAt ?? null,
      gracePeriodEndsAt: input.gracePeriodEndsAt ?? null,
      restrictedAt: input.restrictedAt ?? null,
      suspendedAt: input.suspendedAt ?? null,
      cancelledAt: input.cancelledAt ?? null,
      retentionEndsAt: input.retentionEndsAt ?? null,
      foundingCustomer: input.foundingCustomer ?? false,
      platformExempt: input.platformExempt ?? false,
      day3ReminderAt: input.day3ReminderAt ?? null,
      day7ReminderAt: input.day7ReminderAt ?? null,
    },
    update: Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as Prisma.PlatformSubscriptionUpdateInput,
  });

  return mapRow(row);
}

export async function appendSubscriptionEvent(input: {
  organisationId: string;
  subscriptionId: string;
  type: string;
  source?: "stripe" | "system" | "staff";
  stripeEventId?: string | null;
  payload?: Prisma.InputJsonValue;
}): Promise<{ created: boolean; id?: string }> {
  const { prisma } = await import("@dg/database");

  if (input.stripeEventId) {
    const existing = await prisma.platformSubscriptionEvent.findUnique({
      where: { stripeEventId: input.stripeEventId },
      select: { id: true },
    });
    if (existing) return { created: false, id: existing.id };
  }

  try {
    const row = await prisma.platformSubscriptionEvent.create({
      data: {
        organisationId: input.organisationId,
        subscriptionId: input.subscriptionId,
        type: input.type,
        source: input.source ?? "system",
        stripeEventId: input.stripeEventId ?? null,
        payload: input.payload ?? undefined,
      },
    });
    return { created: true, id: row.id };
  } catch (err) {
    // Unique race on stripeEventId
    if (input.stripeEventId) {
      const existing = await prisma.platformSubscriptionEvent.findUnique({
        where: { stripeEventId: input.stripeEventId },
        select: { id: true },
      });
      if (existing) return { created: false, id: existing.id };
    }
    throw err;
  }
}

export async function claimStripeWebhookReceipt(input: {
  eventId: string;
  eventType: string;
  organisationId?: string | null;
}): Promise<{ claimed: boolean }> {
  const { prisma } = await import("@dg/database");
  try {
    await prisma.stripeWebhookReceipt.create({
      data: {
        eventId: input.eventId,
        eventType: input.eventType,
        organisationId: input.organisationId ?? null,
      },
    });
    return { claimed: true };
  } catch {
    return { claimed: false };
  }
}

export async function listSubscriptionsNeedingDunning(limit = 200) {
  const { prisma } = await import("@dg/database");
  const rows = await prisma.platformSubscription.findMany({
    where: {
      platformExempt: false,
      foundingCustomer: false,
      paymentFailedAt: { not: null },
      status: {
        in: ["PAYMENT_FAILED", "PAST_DUE", "RESTRICTED", "SUSPENDED"],
      },
    },
    take: limit,
    orderBy: { paymentFailedAt: "asc" },
  });
  return rows.map(mapRow);
}
