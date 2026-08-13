/**
 * Mirror Stripe customer subscriptions into CommerceSubscription for org MRR.
 * Platform SaaS seats (dg_platform_tier) stay in org.settings.billing — not here.
 */

import type Stripe from "stripe";

import { upsertCommerceSubscription } from "../commerce/catalog-engine";

function stripeInterval(subscription: Stripe.Subscription): string {
  const item = subscription.items?.data?.[0];
  return item?.price?.recurring?.interval || "month";
}

function stripeAmountCents(subscription: Stripe.Subscription): number {
  return (subscription.items?.data ?? []).reduce((sum, item) => {
    const unit = item.price?.unit_amount ?? 0;
    const qty = item.quantity ?? 1;
    return sum + unit * qty;
  }, 0);
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "paused":
      return "paused";
    case "canceled":
      return "cancelled";
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
      return "expired";
    default:
      return status;
  }
}

/** True when this Stripe subscription should land in the Commerce MRR ledger. */
export function isCommerceCustomerSubscription(
  subscription: Stripe.Subscription,
): boolean {
  const meta = subscription.metadata ?? {};
  if (meta.dg_platform_tier || meta.dg_platform_subscription === "true") {
    return false;
  }
  if (meta.dg_commerce_subscription === "true" || meta.dg_commerce === "true") {
    return true;
  }
  // Tenant customer sub: org tagged, but not a DigitalGate platform seat.
  return Boolean(meta.organisation_id || meta.organisationId);
}

export async function syncCommerceSubscriptionFromStripe(input: {
  subscription: Stripe.Subscription;
  organisationId?: string | null;
}): Promise<{ ok: boolean; reason?: string; subscriptionId?: string }> {
  const { subscription } = input;
  if (!isCommerceCustomerSubscription(subscription)) {
    return { ok: false, reason: "not_commerce_subscription" };
  }

  const organisationId =
    input.organisationId?.trim() ||
    subscription.metadata?.organisation_id?.trim() ||
    subscription.metadata?.organisationId?.trim() ||
    "";

  if (!organisationId) {
    return { ok: false, reason: "missing_organisation_id" };
  }

  const periodStartSec =
    (subscription as Stripe.Subscription & { current_period_start?: number })
      .current_period_start ?? null;
  const periodEndSec =
    (subscription as Stripe.Subscription & { current_period_end?: number })
      .current_period_end ?? null;
  const periodStart = periodStartSec ? new Date(periodStartSec * 1000) : null;
  const periodEnd = periodEndSec ? new Date(periodEndSec * 1000) : null;
  const cancelledAt = subscription.canceled_at
    ? new Date(subscription.canceled_at * 1000)
    : null;

  const row = await upsertCommerceSubscription({
    organisationId,
    providerId: "stripe",
    providerSubscriptionId: subscription.id,
    status: mapStripeStatus(subscription.status),
    amountCents: stripeAmountCents(subscription),
    currency: (subscription.currency || "aud").toUpperCase(),
    interval: stripeInterval(subscription),
    contactId: subscription.metadata?.contact_id || subscription.metadata?.contactId || null,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelledAt,
    metadata: {
      stripeStatus: subscription.status,
      customerId:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id,
    },
  });

  return { ok: true, subscriptionId: row.id };
}
