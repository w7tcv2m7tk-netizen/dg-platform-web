import {
  accrueMonthlyReferralCreditFromInvoice,
  bootPaymentConnectors,
  handleConnectAccountUpdated,
  handleConnectTransferFailure,
  handlePlatformSubscriptionLifecycle,
  isPlatformCheckoutSession,
  isPlatformSubscription,
  processPaymentWebhookEvent,
  provisionFromPlatformCheckout,
  requirePaymentConnector,
} from "@dg/platform-core";
import type Stripe from "stripe";
import { NextResponse } from "next/server";

bootPaymentConnectors();

export async function POST(req: Request) {
  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  try {
    const connector = requirePaymentConnector("stripe");
    const event = await connector.parseWebhook(rawBody, headers);

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
    }

    if (
      (event.type === "subscription.cancelled" ||
        event.type === "subscription.updated") &&
      event.raw
    ) {
      const subscription = event.raw as Stripe.Subscription;
      // Resolve by subscription metadata or org.billingCustomerId — skip inventing
      // updates when neither matches (commerce noise returns ok:false).
      if (
        isPlatformSubscription(subscription) ||
        event.organisationId ||
        event.providerCustomerId
      ) {
        const lifecycle = await handlePlatformSubscriptionLifecycle(
          subscription,
          event.type === "subscription.cancelled" ? "deleted" : "updated",
        );
        console.info("[stripe webhook] platform subscription:", event.type, lifecycle);
        return NextResponse.json({ received: true, subscription: lifecycle });
      }
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

      // Resolve org / tier from subscription metadata when invoice payload omits them
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

      return NextResponse.json({
        received: true,
        referralReward,
      });
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
