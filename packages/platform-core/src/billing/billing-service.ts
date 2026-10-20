/**
 * Billing Service — Stripe/cron → commercial state → entitlement.
 * Never: Stripe failed → wipe organisation.
 */

import type Stripe from "stripe";

import {
  appendSubscriptionEvent,
  getPlatformSubscription,
  upsertPlatformSubscription,
  type PlatformSubscriptionRow,
} from "./subscription-store";
import {
  DUNNING_DAYS,
  RETENTION_DAYS_AFTER_CANCEL,
  TRIAL_PERIOD_DAYS,
  daysBetween,
  dunningStatusForAgeDays,
  entitlementFromCommercialStatus,
  type PlatformCommercialStatus,
} from "./subscription-types";

function unixToDate(sec: number | null | undefined): Date | null {
  if (sec == null || !Number.isFinite(sec)) return null;
  return new Date(sec * 1000);
}

function stripeSubPeriods(subscription: Stripe.Subscription): {
  trialStart: Date | null;
  trialEnd: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
} {
  const sub = subscription as Stripe.Subscription & {
    trial_start?: number | null;
    trial_end?: number | null;
    current_period_start?: number | null;
    current_period_end?: number | null;
  };
  return {
    trialStart: unixToDate(sub.trial_start),
    trialEnd: unixToDate(sub.trial_end),
    currentPeriodStart: unixToDate(sub.current_period_start),
    currentPeriodEnd: unixToDate(sub.current_period_end),
  };
}

function mirrorOrgBillingJson(
  existingSettings: Record<string, unknown>,
  patch: {
    subscriptionStatus: string;
    stripeSubscriptionId?: string | null;
    entitlementsSuspended: boolean;
    suspendedAt?: string | null;
  },
): Record<string, unknown> {
  const billing =
    (existingSettings.billing as Record<string, unknown> | undefined) ?? {};
  const apps = (existingSettings.apps as Record<string, unknown> | undefined) ?? {};
  return {
    ...existingSettings,
    billing: {
      ...billing,
      subscriptionStatus: patch.subscriptionStatus,
      stripeSubscriptionId: patch.stripeSubscriptionId ?? billing.stripeSubscriptionId,
      entitlementsSuspended: patch.entitlementsSuspended,
      lastSubscriptionEventAt: new Date().toISOString(),
      suspendedAt: patch.suspendedAt ?? null,
    },
    apps: {
      ...apps,
      entitlementsSuspended: patch.entitlementsSuspended,
      suspendedAt: patch.suspendedAt ?? null,
    },
  };
}

async function mirrorToOrganisation(input: {
  organisationId: string;
  billingCustomerId?: string | null;
  orgStatus?: string;
  subscriptionStatus: string;
  stripeSubscriptionId?: string | null;
  entitlementsSuspended: boolean;
  suspendedAt?: string | null;
}) {
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { settings: true },
  });
  if (!org) return;

  const settings = (org.settings as Record<string, unknown> | null) ?? {};
  const next = mirrorOrgBillingJson(settings, {
    subscriptionStatus: input.subscriptionStatus,
    stripeSubscriptionId: input.stripeSubscriptionId,
    entitlementsSuspended: input.entitlementsSuspended,
    suspendedAt: input.suspendedAt ?? null,
  });

  await prisma.organisation.update({
    where: { id: input.organisationId },
    data: {
      ...(input.orgStatus ? { status: input.orgStatus } : {}),
      ...(input.billingCustomerId
        ? { billingCustomerId: input.billingCustomerId }
        : {}),
      settings: next as never,
    },
  });
}

/**
 * Map Stripe subscription object → DG commercial status (before dunning age).
 */
export function commercialStatusFromStripeSubscription(
  subscription: Stripe.Subscription,
  eventKind: "created" | "updated" | "deleted",
): PlatformCommercialStatus {
  if (eventKind === "deleted" || subscription.status === "canceled") {
    return "CANCELLED";
  }
  if (
    subscription.status === "unpaid" ||
    subscription.status === "incomplete_expired"
  ) {
    return "CANCELLED";
  }
  if (subscription.cancel_at_period_end) {
    return "CANCEL_AT_PERIOD_END";
  }
  if (subscription.status === "trialing") return "TRIALING";
  if (subscription.status === "past_due") return "PAYMENT_FAILED";
  if (subscription.status === "active") return "ACTIVE";
  // incomplete / paused — keep collecting; treat as trialing-like warning
  if (subscription.status === "incomplete") return "TRIALING";
  return "ACTIVE";
}

export async function applyStripeSubscriptionProjection(input: {
  organisationId: string;
  subscription: Stripe.Subscription;
  eventKind: "created" | "updated" | "deleted";
  stripeEventId?: string | null;
  foundingCustomer?: boolean;
  platformExempt?: boolean;
  planTier?: string | null;
}): Promise<PlatformSubscriptionRow> {
  const { subscription, organisationId } = input;
  const periods = stripeSubPeriods(subscription);
  const existing = await getPlatformSubscription(organisationId);
  const founding =
    input.foundingCustomer ?? existing?.foundingCustomer ?? false;
  const exempt = input.platformExempt ?? existing?.platformExempt ?? false;

  let status = commercialStatusFromStripeSubscription(
    subscription,
    input.eventKind,
  );

  // Preserve / continue dunning ladder when Stripe reports past_due
  let paymentFailedAt = existing?.paymentFailedAt ?? null;
  if (status === "PAYMENT_FAILED") {
    if (!paymentFailedAt) paymentFailedAt = new Date();
    if (!founding && !exempt) {
      status = dunningStatusForAgeDays(daysBetween(paymentFailedAt, new Date()));
    }
  } else if (status === "ACTIVE" || status === "TRIALING") {
    paymentFailedAt = null;
  }

  if (founding || exempt) {
    if (status === "CANCELLED") {
      // still cancelled
    } else if (status !== "CANCEL_AT_PERIOD_END") {
      status = subscription.status === "trialing" ? "TRIALING" : "ACTIVE";
    }
  }

  const entitlement = entitlementFromCommercialStatus(status, {
    foundingOrExempt: founding || exempt,
  });

  const now = new Date();
  const cancelledAt =
    status === "CANCELLED" ? existing?.cancelledAt ?? now : null;
  const retentionEndsAt =
    status === "CANCELLED"
      ? existing?.retentionEndsAt ??
        new Date(now.getTime() + RETENTION_DAYS_AFTER_CANCEL * 86400000)
      : null;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  const row = await upsertPlatformSubscription({
    organisationId,
    status,
    entitlement,
    planTier: input.planTier ?? existing?.planTier ?? null,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripeStatus: subscription.status,
    trialStart: periods.trialStart,
    trialEnd: periods.trialEnd,
    currentPeriodStart: periods.currentPeriodStart,
    currentPeriodEnd: periods.currentPeriodEnd,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    paymentFailedAt,
    gracePeriodEndsAt:
      paymentFailedAt && !founding && !exempt
        ? new Date(
            paymentFailedAt.getTime() + DUNNING_DAYS.restrictedFrom * 86400000,
          )
        : null,
    restrictedAt: status === "RESTRICTED" ? existing?.restrictedAt ?? now : null,
    suspendedAt: status === "SUSPENDED" ? existing?.suspendedAt ?? now : null,
    cancelledAt,
    retentionEndsAt,
    foundingCustomer: founding,
    platformExempt: exempt,
    day3ReminderAt: paymentFailedAt ? existing?.day3ReminderAt ?? null : null,
    day7ReminderAt: paymentFailedAt ? existing?.day7ReminderAt ?? null : null,
  });

  await appendSubscriptionEvent({
    organisationId,
    subscriptionId: row.id,
    type: `stripe.subscription.${input.eventKind}`,
    source: "stripe",
    stripeEventId: input.stripeEventId
      ? `${input.stripeEventId}:subscription`
      : null,
    payload: {
      stripeStatus: subscription.status,
      commercialStatus: status,
      entitlement,
    },
  });

  const entitlementsSuspended =
    entitlement === "READ_ONLY" || entitlement === "NONE";
  const orgStatus =
    status === "CANCELLED" || status === "SUSPENDED"
      ? "suspended"
      : status === "TRIALING"
        ? "trial"
        : "active";

  await mirrorToOrganisation({
    organisationId,
    billingCustomerId: customerId,
    orgStatus,
    subscriptionStatus:
      input.eventKind === "deleted" ? "cancelled" : subscription.status,
    stripeSubscriptionId: subscription.id,
    entitlementsSuspended,
    suspendedAt: entitlementsSuspended ? now.toISOString() : null,
  });

  return row;
}

/** invoice.payment_failed — enter / refresh payment-failed ladder without hard suspend. */
export async function applyInvoicePaymentFailed(input: {
  organisationId: string;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  stripeEventId?: string | null;
  stripeInvoiceId?: string | null;
}): Promise<PlatformSubscriptionRow | null> {
  const existing =
    (await getPlatformSubscription(input.organisationId)) ??
    null;
  if (!existing) {
    // Create minimal row so dunning can start
    const paymentFailedAt = new Date();
    const status = dunningStatusForAgeDays(0);
    const entitlement = entitlementFromCommercialStatus(status);
    const row = await upsertPlatformSubscription({
      organisationId: input.organisationId,
      status,
      entitlement,
      stripeCustomerId: input.stripeCustomerId ?? null,
      stripeSubscriptionId: input.stripeSubscriptionId ?? null,
      stripeStatus: "past_due",
      paymentFailedAt,
      gracePeriodEndsAt: new Date(
        paymentFailedAt.getTime() + DUNNING_DAYS.restrictedFrom * 86400000,
      ),
    });
    await appendSubscriptionEvent({
      organisationId: input.organisationId,
      subscriptionId: row.id,
      type: "invoice.payment_failed",
      source: "stripe",
      stripeEventId: input.stripeEventId ?? null,
      payload: { stripeInvoiceId: input.stripeInvoiceId },
    });
    await mirrorToOrganisation({
      organisationId: input.organisationId,
      billingCustomerId: input.stripeCustomerId,
      orgStatus: "active",
      subscriptionStatus: "past_due",
      stripeSubscriptionId: input.stripeSubscriptionId,
      entitlementsSuspended: false,
      suspendedAt: null,
    });
    return row;
  }

  if (existing.foundingCustomer || existing.platformExempt) {
    await appendSubscriptionEvent({
      organisationId: input.organisationId,
      subscriptionId: existing.id,
      type: "invoice.payment_failed.skipped_exempt",
      source: "stripe",
      stripeEventId: input.stripeEventId ?? null,
    });
    return existing;
  }

  const paymentFailedAt = existing.paymentFailedAt ?? new Date();
  const status = dunningStatusForAgeDays(daysBetween(paymentFailedAt, new Date()));
  const entitlement = entitlementFromCommercialStatus(status);

  const row = await upsertPlatformSubscription({
    organisationId: input.organisationId,
    status,
    entitlement,
    stripeCustomerId: input.stripeCustomerId ?? existing.stripeCustomerId,
    stripeSubscriptionId:
      input.stripeSubscriptionId ?? existing.stripeSubscriptionId,
    stripeStatus: "past_due",
    paymentFailedAt,
    gracePeriodEndsAt: new Date(
      paymentFailedAt.getTime() + DUNNING_DAYS.restrictedFrom * 86400000,
    ),
    restrictedAt: status === "RESTRICTED" ? existing.restrictedAt ?? new Date() : existing.restrictedAt,
    suspendedAt: status === "SUSPENDED" ? existing.suspendedAt ?? new Date() : existing.suspendedAt,
    foundingCustomer: existing.foundingCustomer,
    platformExempt: existing.platformExempt,
    planTier: existing.planTier,
    cancelAtPeriodEnd: existing.cancelAtPeriodEnd,
    trialStart: existing.trialStart,
    trialEnd: existing.trialEnd,
    currentPeriodStart: existing.currentPeriodStart,
    currentPeriodEnd: existing.currentPeriodEnd,
  });

  await appendSubscriptionEvent({
    organisationId: input.organisationId,
    subscriptionId: row.id,
    type: "invoice.payment_failed",
    source: "stripe",
    stripeEventId: input.stripeEventId ?? null,
    payload: { stripeInvoiceId: input.stripeInvoiceId, commercialStatus: status },
  });

  await mirrorToOrganisation({
    organisationId: input.organisationId,
    billingCustomerId: input.stripeCustomerId ?? existing.stripeCustomerId,
    orgStatus: status === "SUSPENDED" ? "suspended" : "active",
    subscriptionStatus: "past_due",
    stripeSubscriptionId: row.stripeSubscriptionId,
    entitlementsSuspended: entitlement === "READ_ONLY" || entitlement === "NONE",
    suspendedAt:
      entitlement === "READ_ONLY" || entitlement === "NONE"
        ? new Date().toISOString()
        : null,
  });

  return row;
}

/** invoice.paid recovery — clear dunning when subscription is healthy. */
export async function applyInvoicePaidRecovery(input: {
  organisationId: string;
  stripeEventId?: string | null;
}): Promise<PlatformSubscriptionRow | null> {
  const existing = await getPlatformSubscription(input.organisationId);
  if (!existing) return null;
  if (
    existing.status !== "PAYMENT_FAILED" &&
    existing.status !== "PAST_DUE" &&
    existing.status !== "RESTRICTED" &&
    existing.status !== "SUSPENDED"
  ) {
    return existing;
  }

  const status: PlatformCommercialStatus = existing.cancelAtPeriodEnd
    ? "CANCEL_AT_PERIOD_END"
    : "ACTIVE";
  const entitlement = entitlementFromCommercialStatus(status, {
    foundingOrExempt: existing.foundingCustomer || existing.platformExempt,
  });

  const row = await upsertPlatformSubscription({
    organisationId: input.organisationId,
    status,
    entitlement,
    paymentFailedAt: null,
    gracePeriodEndsAt: null,
    restrictedAt: null,
    suspendedAt: null,
    day3ReminderAt: null,
    day7ReminderAt: null,
    stripeStatus: "active",
    foundingCustomer: existing.foundingCustomer,
    platformExempt: existing.platformExempt,
    planTier: existing.planTier,
    stripeCustomerId: existing.stripeCustomerId,
    stripeSubscriptionId: existing.stripeSubscriptionId,
    cancelAtPeriodEnd: existing.cancelAtPeriodEnd,
    trialStart: existing.trialStart,
    trialEnd: existing.trialEnd,
    currentPeriodStart: existing.currentPeriodStart,
    currentPeriodEnd: existing.currentPeriodEnd,
  });

  await appendSubscriptionEvent({
    organisationId: input.organisationId,
    subscriptionId: row.id,
    type: "invoice.paid.recovered",
    source: "stripe",
    stripeEventId: input.stripeEventId
      ? `${input.stripeEventId}:recovery`
      : null,
  });

  await mirrorToOrganisation({
    organisationId: input.organisationId,
    orgStatus: "active",
    subscriptionStatus: "active",
    stripeSubscriptionId: row.stripeSubscriptionId,
    entitlementsSuspended: false,
    suspendedAt: null,
  });

  return row;
}

/** Cron: advance dunning stages + set reminder flags (no email send). */
export async function advanceDunningForSubscription(
  row: PlatformSubscriptionRow,
  now = new Date(),
): Promise<PlatformSubscriptionRow | null> {
  if (row.foundingCustomer || row.platformExempt || !row.paymentFailedAt) {
    return row;
  }

  const age = daysBetween(row.paymentFailedAt, now);
  const nextStatus = dunningStatusForAgeDays(age);
  let day3 = row.day3ReminderAt;
  let day7 = row.day7ReminderAt;
  if (age >= DUNNING_DAYS.reminderDay3 && !day3) day3 = now;
  if (age >= DUNNING_DAYS.reminderDay7 && !day7) day7 = now;

  if (
    nextStatus === row.status &&
    day3 === row.day3ReminderAt &&
    day7 === row.day7ReminderAt
  ) {
    return row;
  }

  const entitlement = entitlementFromCommercialStatus(nextStatus);
  const updated = await upsertPlatformSubscription({
    organisationId: row.organisationId,
    status: nextStatus,
    entitlement,
    paymentFailedAt: row.paymentFailedAt,
    gracePeriodEndsAt: row.gracePeriodEndsAt,
    restrictedAt:
      nextStatus === "RESTRICTED" || nextStatus === "SUSPENDED"
        ? row.restrictedAt ?? now
        : row.restrictedAt,
    suspendedAt: nextStatus === "SUSPENDED" ? row.suspendedAt ?? now : row.suspendedAt,
    day3ReminderAt: day3,
    day7ReminderAt: day7,
    foundingCustomer: row.foundingCustomer,
    platformExempt: row.platformExempt,
    planTier: row.planTier,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    stripeStatus: row.stripeStatus,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    trialStart: row.trialStart,
    trialEnd: row.trialEnd,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
  });

  if (nextStatus !== row.status) {
    await appendSubscriptionEvent({
      organisationId: row.organisationId,
      subscriptionId: updated.id,
      type: `dunning.${nextStatus.toLowerCase()}`,
      source: "system",
      payload: { ageDays: age, from: row.status, to: nextStatus },
    });
  }

  await mirrorToOrganisation({
    organisationId: row.organisationId,
    orgStatus: nextStatus === "SUSPENDED" ? "suspended" : "active",
    subscriptionStatus: "past_due",
    stripeSubscriptionId: updated.stripeSubscriptionId,
    entitlementsSuspended: entitlement === "READ_ONLY" || entitlement === "NONE",
    suspendedAt:
      entitlement === "READ_ONLY" || entitlement === "NONE"
        ? now.toISOString()
        : null,
  });

  return updated;
}

export async function syncPlatformSubscriptionFromCheckout(input: {
  organisationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string | null;
  planTier: string;
  foundingCustomer?: boolean;
  platformExempt?: boolean;
  trialStart?: Date | null;
  trialEnd?: Date | null;
  stripeEventId?: string | null;
}): Promise<PlatformSubscriptionRow> {
  const trialEnd =
    input.trialEnd ??
    new Date(Date.now() + TRIAL_PERIOD_DAYS * 86400000);
  const trialStart = input.trialStart ?? new Date();
  const founding = input.foundingCustomer ?? false;
  const exempt = input.platformExempt ?? false;
  const status: PlatformCommercialStatus =
    founding || exempt ? "ACTIVE" : "TRIALING";
  const entitlement = entitlementFromCommercialStatus(status, {
    foundingOrExempt: founding || exempt,
  });

  const row = await upsertPlatformSubscription({
    organisationId: input.organisationId,
    status,
    entitlement,
    planTier: input.planTier,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId ?? null,
    stripeStatus: founding || exempt ? "active" : "trialing",
    trialStart: founding || exempt ? null : trialStart,
    trialEnd: founding || exempt ? null : trialEnd,
    paymentFailedAt: null,
    foundingCustomer: founding,
    platformExempt: exempt,
  });

  await appendSubscriptionEvent({
    organisationId: input.organisationId,
    subscriptionId: row.id,
    type: "checkout.provisioned",
    source: "stripe",
    stripeEventId: input.stripeEventId
      ? `${input.stripeEventId}:checkout`
      : null,
    payload: { planTier: input.planTier, status },
  });

  return row;
}
