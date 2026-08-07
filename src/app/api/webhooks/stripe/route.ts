import {
  accrueMonthlyReferralCreditFromInvoice,
  bootPaymentConnectors,
  isPlatformCheckoutSession,
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

    if (event.type === "checkout.completed" && event.raw) {
      const session = event.raw as Stripe.Checkout.Session;
      if (isPlatformCheckoutSession(session)) {
        const platformResult = await provisionFromPlatformCheckout(session);
        console.info("[stripe webhook] platform checkout:", platformResult);
        return NextResponse.json({ received: true, platform: platformResult });
      }
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
