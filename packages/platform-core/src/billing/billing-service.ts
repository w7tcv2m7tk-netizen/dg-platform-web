/**
 * Billing Service — Stripe/cron → commercial state → entitlement.
 * Never: Stripe failed → wipe organisation.
 */

import Stripe from "stripe";
import type { Prisma } from "@dg/database";
import { withProjectionTransaction, type ProjectionRead } from "./projection-transaction";

import {
  appendSubscriptionEvent,
  getPlatformSubscription,
  upsertPlatformSubscription,
  type PlatformSubscriptionRow,
} from "./subscription-store";
import {
  DUNNING_DAYS,
  RETENTION_DAYS_AFTER_CANCEL,
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
}, database?: Prisma.TransactionClient) {
  const prisma = database ?? (await import("@dg/database")).prisma;
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
  if (!["active", "trialing", "past_due"].includes(subscription.status)) return "SUSPENDED";
  if (subscription.status === "past_due") return "PAYMENT_FAILED";
  if (subscription.cancel_at_period_end) {
    return "CANCEL_AT_PERIOD_END";
  }
  if (subscription.status === "trialing") return "TRIALING";
  if (subscription.status === "active") return "ACTIVE";
  // Incomplete, paused and unknown provider states do not establish active access.
  return "SUSPENDED";
}

type SubscriptionProjectionInput = {
  organisationId: string;
  subscription: Stripe.Subscription;
  eventKind: "created" | "updated" | "deleted";
  stripeEventId?: string | null;
  foundingCustomer?: boolean;
  platformExempt?: boolean;
  planTier?: string | null;
};

export async function applyStripeSubscriptionProjection(input: SubscriptionProjectionInput): Promise<PlatformSubscriptionRow> {
  return withProjectionTransaction(input.organisationId, (database, read) => projectStripeSubscription(input, database, read));
}

async function projectStripeSubscription(input: SubscriptionProjectionInput, database: Prisma.TransactionClient, read: ProjectionRead, authoritativeSubscription?: Stripe.Subscription): Promise<PlatformSubscriptionRow> {
  const { organisationId } = input;
  const existing = await getPlatformSubscription(organisationId, database);
  const customer = typeof input.subscription.customer === "string" ? input.subscription.customer : input.subscription.customer?.id;
  if (existing && (existing.stripeSubscriptionId !== input.subscription.id || existing.stripeCustomerId !== customer)) return existing;
  const prisma = database;
  if (existing && input.stripeEventId && await prisma.platformSubscriptionEvent.findUnique({
    where: { stripeEventId: `${input.stripeEventId}:subscription` },
  })) return existing;
  const subscription = authoritativeSubscription ?? await read(timeout => new Stripe(process.env.STRIPE_SECRET_KEY ?? "").subscriptions.retrieve(input.subscription.id, { timeout, maxNetworkRetries: 0 }));
  const authoritativeCustomer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  const org = await prisma.organisation.findUniqueOrThrow({ where: { id: organisationId } });
  if (subscription.id !== input.subscription.id || authoritativeCustomer !== customer ||
    subscription.livemode !== input.subscription.livemode || subscription.metadata.organisation_id !== organisationId ||
    subscription.metadata.dg_platform_subscription !== "true" ||
    (org.billingCustomerId && org.billingCustomerId !== authoritativeCustomer)) {
    throw new Error("Subscription projection ownership is unconfirmed");
  }
  const periods = stripeSubPeriods(subscription);
  const eventKind = ["canceled", "incomplete_expired"].includes(subscription.status) ? "deleted" :
    input.eventKind === "deleted" ? "updated" : input.eventKind;
  const founding =
    input.foundingCustomer ?? existing?.foundingCustomer ?? false;
  const exempt = input.platformExempt ?? existing?.platformExempt ?? false;

  let status = commercialStatusFromStripeSubscription(
    subscription,
    eventKind,
  );

  // Preserve / continue dunning ladder when Stripe reports past_due
  let paymentFailedAt = existing?.paymentFailedAt ?? null;
  if (status === "PAYMENT_FAILED") {
    if (!paymentFailedAt) paymentFailedAt = new Date();
    if (!founding && !exempt) {
      status = dunningStatusForAgeDays(daysBetween(paymentFailedAt, new Date()));
    }
  } else if (["active", "trialing", "incomplete", "paused"].includes(subscription.status)) {
    paymentFailedAt = null;
  }

  if ((founding || exempt) && ["active", "trialing", "past_due", "unpaid", "canceled", "incomplete_expired"].includes(subscription.status)) {
    if (status === "CANCELLED") {
      // still cancelled
    } else if (status !== "CANCEL_AT_PERIOD_END") {
      status = subscription.status === "trialing" ? "TRIALING" : "ACTIVE";
    }
  }

  const entitlement = !["active", "trialing", "past_due", "unpaid", "canceled", "incomplete_expired"].includes(subscription.status) ? "NONE" : entitlementFromCommercialStatus(status, {
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
    planTier: subscription.metadata.dg_platform_tier ?? existing?.planTier ?? null,
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
  }, database);

  await appendSubscriptionEvent({
    organisationId,
    subscriptionId: row.id,
    type: `stripe.subscription.${input.eventKind}`,
    source: "stripe",
    stripeEventId: input.stripeEventId
      ? `${input.stripeEventId}:subscription`
      : null,
    payload: {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      stripeStatus: subscription.status,
      commercialStatus: status,
      entitlement,
    },
  }, database);

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
      eventKind === "deleted" ? "cancelled" : subscription.status,
    stripeSubscriptionId: subscription.id,
    entitlementsSuspended,
    suspendedAt: entitlementsSuspended ? now.toISOString() : null,
  }, database);

  return row;
}

/** invoice.payment_failed — enter / refresh payment-failed ladder without hard suspend. */
type InvoiceFailureInput = {
  organisationId: string;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  stripeEventId?: string | null;
  stripeInvoiceId?: string | null;
};

export async function applyInvoicePaymentFailed(input: InvoiceFailureInput): Promise<PlatformSubscriptionRow | null> {
  return withProjectionTransaction(input.organisationId, (database, read) => projectInvoiceFailure(input, database, read));
}

async function projectInvoiceFailure(input: InvoiceFailureInput, database: Prisma.TransactionClient, read: ProjectionRead): Promise<PlatformSubscriptionRow | null> {
  const existing =
    (await getPlatformSubscription(input.organisationId, database)) ??
    null;
  // An invoice cannot establish ownership, create a subscription, resurrect a
  // terminal purchase, or replace the current subscription with historical IDs.
  if (!existing || !input.stripeSubscriptionId || !input.stripeCustomerId ||
    existing.stripeSubscriptionId !== input.stripeSubscriptionId || existing.stripeCustomerId !== input.stripeCustomerId ||
    ["canceled", "incomplete_expired", "incomplete", "paused"].includes(existing.stripeStatus ?? "") ||
    existing.status === "CANCELLED") return existing;
  const prisma = database;
  if (input.stripeEventId && await prisma.platformSubscriptionEvent.findUnique({ where: { stripeEventId: input.stripeEventId } })) return existing;

  if (!input.stripeInvoiceId) return existing;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
  const invoice = await read(timeout => stripe.invoices.retrieve(input.stripeInvoiceId!, { timeout, maxNetworkRetries: 0 }));
  const subscription = await read(timeout => stripe.subscriptions.retrieve(input.stripeSubscriptionId!, { timeout, maxNetworkRetries: 0 }));
  const invoiceCustomer = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  const invoiceSubscription = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  const subscriptionCustomer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (invoice.id !== input.stripeInvoiceId || invoiceCustomer !== existing.stripeCustomerId ||
    invoiceSubscription !== existing.stripeSubscriptionId || subscription.id !== existing.stripeSubscriptionId ||
    subscriptionCustomer !== existing.stripeCustomerId || invoice.livemode !== subscription.livemode ||
    subscription.metadata.organisation_id !== input.organisationId || subscription.metadata.dg_platform_subscription !== "true") {
    throw new Error("Invoice failure ownership is unconfirmed");
  }
  const latestInvoice = typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : subscription.latest_invoice?.id;
  const genuinelyFailed = invoice.status === "open" && !invoice.paid && invoice.amount_remaining > 0 &&
    latestInvoice === invoice.id && subscription.status === "past_due";
  if (!genuinelyFailed || existing.foundingCustomer || existing.platformExempt) {
    const row = existing.foundingCustomer || existing.platformExempt ? existing : await projectStripeSubscription({
      organisationId: input.organisationId, subscription: { ...subscription, id: input.stripeSubscriptionId, customer: input.stripeCustomerId },
      eventKind: "updated", stripeEventId: input.stripeEventId,
    }, database, read, subscription);
    await appendSubscriptionEvent({ organisationId: input.organisationId, subscriptionId: row.id,
      type: "invoice.payment_failed.ignored", source: "stripe", stripeEventId: input.stripeEventId,
      payload: { stripeInvoiceId: invoice.id, stripeSubscriptionId: subscription.id, invoiceStatus: invoice.status, stripeStatus: subscription.status },
    }, database);
    return row;
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
  }, database);

  await appendSubscriptionEvent({
    organisationId: input.organisationId,
    subscriptionId: row.id,
    type: "invoice.payment_failed",
    source: "stripe",
    stripeEventId: input.stripeEventId ?? null,
    payload: { stripeInvoiceId: input.stripeInvoiceId, commercialStatus: status },
  }, database);

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
  }, database);

  return row;
}

/** invoice.paid recovery — clear dunning when subscription is healthy. */
export async function applyInvoicePaidRecovery(input: {
  organisationId: string;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  stripeEventId?: string | null;
}): Promise<PlatformSubscriptionRow | null> {
  return withProjectionTransaction(input.organisationId, async (database, read) => {
    const existing = await getPlatformSubscription(input.organisationId, database);
    if (!existing || !input.stripeSubscriptionId || !input.stripeCustomerId ||
      existing.stripeSubscriptionId !== input.stripeSubscriptionId || existing.stripeCustomerId !== input.stripeCustomerId) return existing;
    if (input.stripeEventId && await database.platformSubscriptionEvent.findUnique({
      where: { stripeEventId: `${input.stripeEventId}:recovery` },
    })) return existing;
    // Payment of a historical invoice is not current subscription health.
    const subscription = await read(timeout => new Stripe(process.env.STRIPE_SECRET_KEY ?? "").subscriptions.retrieve(input.stripeSubscriptionId!, { timeout, maxNetworkRetries: 0 }));
    const row = await projectStripeSubscription({ organisationId: input.organisationId, subscription: {
      ...subscription, id: input.stripeSubscriptionId, customer: input.stripeCustomerId,
    }, eventKind: "updated", stripeEventId: input.stripeEventId }, database, read, subscription);
    await appendSubscriptionEvent({ organisationId: input.organisationId, subscriptionId: row.id,
      type: ["active", "trialing"].includes(row.stripeStatus ?? "") ? "invoice.paid.recovered" : "invoice.paid.observed", source: "stripe",
      stripeEventId: input.stripeEventId ? `${input.stripeEventId}:recovery` : null,
      payload: { stripeSubscriptionId: row.stripeSubscriptionId, stripeStatus: row.stripeStatus, entitlement: row.entitlement },
    }, database);
    return row;
  });
}

/** Cron: advance dunning stages + set reminder flags (no email send). */
export async function advanceDunningForSubscription(row: PlatformSubscriptionRow, now = new Date()): Promise<PlatformSubscriptionRow | null> {
  return withProjectionTransaction(row.organisationId, async database => {
    const current = await getPlatformSubscription(row.organisationId, database);
    if (!current || current.stripeSubscriptionId !== row.stripeSubscriptionId ||
      current.stripeCustomerId !== row.stripeCustomerId || current.status === "CANCELLED" ||
      ["canceled", "incomplete_expired", "incomplete", "paused"].includes(current.stripeStatus ?? "")) return current;
    return advanceCurrentDunning(current, now, database);
  });
}

async function advanceCurrentDunning(
  row: PlatformSubscriptionRow,
  now: Date,
  database: Prisma.TransactionClient,
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
  }, database);

  if (nextStatus !== row.status) {
    await appendSubscriptionEvent({
      organisationId: row.organisationId,
      subscriptionId: updated.id,
      type: `dunning.${nextStatus.toLowerCase()}`,
      source: "system",
      payload: { ageDays: age, from: row.status, to: nextStatus },
    }, database);
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
  }, database);

  return updated;
}

export async function syncPlatformSubscriptionFromCheckout(input: {
  organisationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string | null;
  planTier: string;
  foundingCustomer?: boolean;
  platformExempt?: boolean;
  trialStart: Date | null;
  trialEnd: Date | null;
  stripeStatus: "active" | "trialing";
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  stripeEventId?: string | null;
}, database?: Prisma.TransactionClient): Promise<PlatformSubscriptionRow> {
  const existing = await getPlatformSubscription(input.organisationId, database);
  if (existing?.stripeSubscriptionId && existing.stripeSubscriptionId !== input.stripeSubscriptionId &&
    !(existing.status === "CANCELLED" && ["canceled", "incomplete_expired"].includes(existing.stripeStatus ?? ""))) {
    throw new Error("Checkout cannot replace the current subscription");
  }
  const founding = input.foundingCustomer ?? false;
  const exempt = input.platformExempt ?? false;
  const status: PlatformCommercialStatus =
    input.cancelAtPeriodEnd ? "CANCEL_AT_PERIOD_END" :
      founding || exempt || input.stripeStatus === "active" ? "ACTIVE" : "TRIALING";
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
    stripeStatus: input.stripeStatus,
    trialStart: founding || exempt ? null : input.trialStart,
    trialEnd: founding || exempt ? null : input.trialEnd,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    currentPeriodStart: input.currentPeriodStart,
    currentPeriodEnd: input.currentPeriodEnd,
    paymentFailedAt: null,
    foundingCustomer: founding,
    platformExempt: exempt,
  }, database);

  await appendSubscriptionEvent({
    organisationId: input.organisationId,
    subscriptionId: row.id,
    type: "checkout.provisioned",
    source: "stripe",
    stripeEventId: input.stripeEventId
      ? `${input.stripeEventId}:checkout`
      : null,
    payload: { planTier: input.planTier, status },
  }, database);

  return row;
}
