import {
  accrueMonthlyReferralCreditFromInvoice,
  accruePartnerCommissionFromInvoice,
  applyInvoicePaidRecovery,
  applyInvoicePaymentFailed,
  bootPaymentConnectors,
  claimStripeWebhookReceipt,
  getPlatformSubscriptionByStripeCustomer,
  handleConnectAccountUpdated,
  handleConnectTransferFailure,
  handlePlatformSubscriptionLifecycle,
  isCommerceCustomerSubscription,
  isPlatformCheckoutSession,
  isPlatformSubscription,
  processPaymentWebhookEvent,
  provisionFromPlatformCheckout,
  requirePaymentConnector,
  syncCommerceSubscriptionFromStripe,
} from "@dg/platform-core";
import type Stripe from "stripe";
import { NextResponse } from "next/server";

bootPaymentConnectors();

async function resolveOrgIdFromStripeCustomer(
  customerId: string | undefined,
): Promise<string | undefined> {
  if (!customerId) return undefined;
  const sub = await getPlatformSubscriptionByStripeCustomer(customerId);
  if (sub) return sub.organisationId;
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findFirst({
    where: { billingCustomerId: customerId },
    select: { id: true },
  });
  return org?.id;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  try {
    const connector = requirePaymentConnector("stripe");
    const event = await connector.parseWebhook(rawBody, headers);

    const receipt = await claimStripeWebhookReceipt({
      eventId: event.providerEventId,
      eventType: event.type,
      organisationId: event.organisationId ?? null,
    });
    if (!receipt.claimed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (event.type === "ignored") {
      const ignoredType =
        event.raw &&
        typeof event.raw === "object" &&
        "ignoredStripeType" in event.raw
          ? String((event.raw as { ignoredStripeType?: string }).ignoredStripeType)
          : "unknown";
      console.info("[stripe webhook] ignored event type:", ignoredType);
      return NextResponse.json({ received: true, ignored: ignoredType });
    }

    if (event.type === "checkout.completed" && event.raw) {
      const session = event.raw as Stripe.Checkout.Session;
      if (isPlatformCheckoutSession(session)) {
        const platformResult = await provisionFromPlatformCheckout(session);
        console.info("[stripe webhook] platform checkout:", platformResult);
        return NextResponse.json({ received: true, platform: platformResult });
      }

      const meta = session.metadata ?? {};
      if (
        meta.dg_kind === "stay_booking" &&
        meta.organisationId &&
        (meta.stayBookingId || meta.paymentRequestId || event.paymentRequestId)
      ) {
        const { markPublicStayPaidFromStripe } = await import("@dg/platform-core");
        const stayResult = await markPublicStayPaidFromStripe({
          organisationId: meta.organisationId,
          stayBookingId:
            meta.stayBookingId ||
            meta.paymentRequestId ||
            event.paymentRequestId ||
            "",
          providerPaymentId: event.providerPaymentId,
          amountCents: event.amountCents,
        });
        console.info("[stripe webhook] stay booking checkout:", stayResult);
        return NextResponse.json({ received: true, stay: stayResult });
      }
    }

    if (
      (event.type === "subscription.created" ||
        event.type === "subscription.cancelled" ||
        event.type === "subscription.updated") &&
      event.raw
    ) {
      const subscription = event.raw as Stripe.Subscription;
      const result: Record<string, unknown> = {};

      if (
        isPlatformSubscription(subscription) ||
        (event.organisationId && subscription.metadata?.dg_platform_tier)
      ) {
        const lifecycle = await handlePlatformSubscriptionLifecycle(
          subscription,
          event.type === "subscription.cancelled"
            ? "deleted"
            : event.type === "subscription.created"
              ? "created"
              : "updated",
          event.providerEventId,
        );
        result.platform = lifecycle;
        console.info("[stripe webhook] platform subscription:", event.type, lifecycle);
      }

      if (isCommerceCustomerSubscription(subscription)) {
        const commerce = await syncCommerceSubscriptionFromStripe({
          subscription,
          organisationId: event.organisationId,
        });
        result.commerce = commerce;
        console.info("[stripe webhook] commerce subscription:", event.type, commerce);
      }

      if (Object.keys(result).length > 0) {
        return NextResponse.json({ received: true, subscription: result });
      }
    }

    if (
      event.type === "invoice.payment_failed" ||
      event.type === "invoice.payment_action_required"
    ) {
      let organisationId = event.organisationId;
      if (!organisationId) {
        organisationId = await resolveOrgIdFromStripeCustomer(event.providerCustomerId);
      }
      if (organisationId) {
        const failed = await applyInvoicePaymentFailed({
          organisationId,
          stripeSubscriptionId: event.stripeSubscriptionId,
          stripeCustomerId: event.providerCustomerId,
          stripeEventId: event.providerEventId,
          stripeInvoiceId: event.stripeInvoiceId,
        });
        console.info("[stripe webhook] invoice payment failed:", failed?.status);
        return NextResponse.json({
          received: true,
          platform: {
            commercialStatus: failed?.status,
            entitlement: failed?.entitlement,
          },
        });
      }
      return NextResponse.json({ received: true, skipped: "no_organisation" });
    }

    if (event.type === "connect.account.updated" && event.raw) {
      const account = event.raw as Stripe.Account;
      const connectResult = await handleConnectAccountUpdated(account);
      console.info("[stripe webhook] connect account.updated:", connectResult);
      return NextResponse.json({ received: true, connect: connectResult });
    }

    if (
      (event.type === "connect.transfer.failed" ||
        event.type === "connect.transfer.reversed") &&
      event.raw
    ) {
      const transfer = event.raw as Stripe.Transfer;
      const kind =
        event.type === "connect.transfer.failed" ? "failed" : "reversed";
      const transferResult = await handleConnectTransferFailure({
        transfer,
        kind,
        failureMessage: event.failureMessage,
      });
      console.info("[stripe webhook] connect transfer:", kind, transferResult);
      return NextResponse.json({ received: true, transfer: transferResult });
    }

    if (event.type === "invoice.paid") {
      const invoice = event.raw as Stripe.Invoice | undefined;
      const periodStart = invoice?.period_start
        ? new Date(invoice.period_start * 1000)
        : null;
      const periodEnd = invoice?.period_end
        ? new Date(invoice.period_end * 1000)
        : null;

      let organisationId = event.organisationId;
      let platformTier = event.platformTier;

      if ((!organisationId || !platformTier) && event.stripeSubscriptionId) {
        try {
          const stripe = new (await import("stripe")).default(
            process.env.STRIPE_SECRET_KEY!.trim(),
          );
          const sub = await stripe.subscriptions.retrieve(event.stripeSubscriptionId);
          organisationId =
            organisationId ||
            sub.metadata?.organisation_id ||
            sub.metadata?.organisationId ||
            undefined;
          platformTier = platformTier || sub.metadata?.dg_platform_tier || undefined;
        } catch (err) {
          console.warn("[stripe webhook] subscription lookup failed", err);
        }
      }

      if (!organisationId) {
        organisationId = await resolveOrgIdFromStripeCustomer(event.providerCustomerId);
      }

      if (organisationId) {
        try {
          await applyInvoicePaidRecovery({
            organisationId,
            stripeEventId: event.providerEventId,
          });
        } catch (err) {
          console.warn("[stripe webhook] invoice paid recovery failed", err);
        }
      }

      let referralReward: unknown = null;
      try {
        referralReward = await accrueMonthlyReferralCreditFromInvoice({
          referredOrganisationId: organisationId,
          stripeCustomerId: event.providerCustomerId,
          stripeInvoiceId:
            event.stripeInvoiceId || event.providerPaymentId || event.providerEventId,
          billingReason: event.billingReason,
          amountPaidCents: event.amountCents,
          platformTier,
          periodStart,
          periodEnd,
        });
        console.info("[stripe webhook] referral invoice.paid:", referralReward);
      } catch (err) {
        console.warn("[stripe webhook] referral monthly accrual failed", err);
      }

      let partnerCommission: unknown = null;
      try {
        partnerCommission = await accruePartnerCommissionFromInvoice({
          referredOrganisationId: organisationId,
          stripeInvoiceId:
            event.stripeInvoiceId || event.providerPaymentId || event.providerEventId,
          subscriptionId: event.stripeSubscriptionId,
          amountPaidCents: event.amountCents,
          currency: invoice?.currency?.toUpperCase() ?? "AUD",
          periodStart,
          periodEnd,
        });
        console.info("[stripe webhook] partner commission invoice.paid:", partnerCommission);
      } catch (err) {
        console.warn("[stripe webhook] partner commission accrual failed", err);
      }

      return NextResponse.json({
        received: true,
        referralReward,
        partnerCommission,
      });
    }

    if (event.type === "customer.updated") {
      return NextResponse.json({ received: true, customer: "ack" });
    }

    const result = await processPaymentWebhookEvent(event);

    if (!result.ok) {
      console.info("[stripe webhook] skipped:", result.reason, {
        type: event.type,
        paymentRequestId: event.paymentRequestId,
      });
      return NextResponse.json({ received: true, skipped: result.reason }, { status: 200 });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    console.error("[stripe webhook]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const configured = Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  );
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/webhooks/stripe",
    configured,
  });
}
