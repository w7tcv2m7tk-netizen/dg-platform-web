import Stripe from "stripe";

import type { PaymentMethod } from "../../types";
import type {
  CheckoutSessionResult,
  ConnectorHealthResult,
  CreateCheckoutSessionInput,
  CreatePaymentLinkInput,
  PaymentConnector,
  PaymentLinkResult,
  PaymentWebhookEvent,
  RefundPaymentInput,
  RefundPaymentResult,
} from "../types";

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secretKey);
}

function stripeLineItems(input: CreateCheckoutSessionInput | CreatePaymentLinkInput) {
  return input.lineItems.map((item) => ({
    quantity: Math.max(1, item.quantity),
    price_data: {
      currency: input.currency.toLowerCase(),
      unit_amount: item.unitAmountCents,
      product_data: {
        name: item.description.slice(0, 250),
      },
    },
  }));
}

function mapCheckoutCompleted(session: Stripe.Checkout.Session): PaymentWebhookEvent {
  const metadata = session.metadata ?? {};
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  return {
    type: "checkout.completed",
    providerId: "stripe",
    providerEventId: session.id,
    organisationId: metadata.organisationId,
    paymentRequestId: metadata.paymentRequestId,
    providerPaymentId: paymentIntent ?? session.id,
    amountCents: session.amount_total ?? undefined,
    currency: session.currency?.toUpperCase() as PaymentWebhookEvent["currency"],
    paymentMethod: "card",
    occurredAt: new Date((session.created ?? Date.now() / 1000) * 1000),
    raw: session,
  };
}

/**
 * Stripe Payment Connector — Phase 1
 */
export class StripePaymentConnector implements PaymentConnector {
  readonly id = "stripe" as const;

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CheckoutSessionResult> {
    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: stripeLineItems(input),
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer_email: input.customerEmail,
      metadata: {
        organisationId: input.organisationId,
        paymentRequestId: input.paymentRequestId,
        ...(input.metadata ?? {}),
      },
      payment_intent_data: {
        metadata: {
          organisationId: input.organisationId,
          paymentRequestId: input.paymentRequestId,
        },
      },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return {
      providerSessionId: session.id,
      checkoutUrl: session.url,
      expiresAt: session.expires_at
        ? new Date(session.expires_at * 1000)
        : undefined,
    };
  }

  async createPaymentLink(input: CreatePaymentLinkInput): Promise<PaymentLinkResult> {
    const checkout = await this.createCheckoutSession({
      ...input,
      successUrl:
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
        "https://app.digitalgate.com.au" + "/commerce/checkout/success",
      cancelUrl:
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
        "https://app.digitalgate.com.au" + "/commerce/checkout/cancel",
    });

    return {
      providerLinkId: checkout.providerSessionId,
      paymentLinkUrl: checkout.checkoutUrl,
    };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    const stripe = getStripeClient();

    const refund = await stripe.refunds.create({
      payment_intent: input.providerPaymentId,
      amount: input.amountCents,
      reason: input.reason === "duplicate" ? "duplicate" : undefined,
      metadata: input.metadata as Stripe.MetadataParam,
    });

    return {
      providerRefundId: refund.id,
      status: refund.status === "succeeded" ? "succeeded" : "pending",
      amountCents: refund.amount ?? input.amountCents ?? 0,
    };
  }

  async parseWebhook(
    payload: string | Buffer,
    headers: Record<string, string | undefined>,
  ): Promise<PaymentWebhookEvent> {
    const stripe = getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }

    const signature = headers["stripe-signature"];
    if (!signature) {
      throw new Error("Missing Stripe-Signature header");
    }

    const rawBody = typeof payload === "string" ? payload : payload.toString("utf8");
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      return mapCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        type: "checkout.expired",
        providerId: "stripe",
        providerEventId: event.id,
        organisationId: session.metadata?.organisationId,
        paymentRequestId: session.metadata?.paymentRequestId,
        occurredAt: new Date(event.created * 1000),
        raw: event,
      };
    }

    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      return {
        type: "payment.failed",
        providerId: "stripe",
        providerEventId: event.id,
        organisationId: intent.metadata?.organisationId,
        paymentRequestId: intent.metadata?.paymentRequestId,
        providerPaymentId: intent.id,
        occurredAt: new Date(event.created * 1000),
        raw: event,
      };
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const sub =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;
      const meta = (invoice.subscription_details?.metadata ??
        invoice.metadata ??
        {}) as Record<string, string>;
      const organisationId =
        meta.organisation_id ||
        meta.organisationId ||
        undefined;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;
      return {
        type: "invoice.paid",
        providerId: "stripe",
        providerEventId: event.id,
        organisationId,
        providerCustomerId: customerId,
        providerPaymentId: invoice.id,
        amountCents: invoice.amount_paid ?? undefined,
        currency: invoice.currency?.toUpperCase() as PaymentWebhookEvent["currency"],
        billingReason: invoice.billing_reason ?? undefined,
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId: sub,
        platformTier: meta.dg_platform_tier,
        occurredAt: new Date(event.created * 1000),
        raw: invoice,
      };
    }

    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      return {
        type: "connect.account.updated",
        providerId: "stripe",
        providerEventId: event.id,
        organisationId:
          account.metadata?.organisation_id ||
          account.metadata?.organisationId ||
          undefined,
        connectAccountId: account.id,
        occurredAt: new Date(event.created * 1000),
        raw: account,
      };
    }

    // Stripe's TS Event type includes transfer.reversed/created/updated but not
    // transfer.failed; keep a runtime check for Dashboard/webhook configurations
    // that still emit it (and for forward-compat).
    const stripeEventType = event.type as string;
    if (stripeEventType === "transfer.failed" || stripeEventType === "transfer.reversed") {
      const transfer = event.data.object as Stripe.Transfer;
      const failureMessage =
        stripeEventType === "transfer.failed"
          ? ((transfer as Stripe.Transfer & { failure_message?: string | null })
              .failure_message ?? undefined)
          : "Transfer reversed";
      return {
        type:
          stripeEventType === "transfer.failed"
            ? "connect.transfer.failed"
            : "connect.transfer.reversed",
        providerId: "stripe",
        providerEventId: event.id,
        organisationId:
          transfer.metadata?.organisation_id ||
          transfer.metadata?.organisationId ||
          undefined,
        transferId: transfer.id,
        connectAccountId:
          typeof transfer.destination === "string"
            ? transfer.destination
            : transfer.destination?.id,
        amountCents: transfer.amount,
        currency: transfer.currency?.toUpperCase() as PaymentWebhookEvent["currency"],
        failureMessage: failureMessage ?? undefined,
        occurredAt: new Date(event.created * 1000),
        raw: transfer,
      };
    }

    // Acknowledge unknown events so Stripe does not retry (400) when the
    // Dashboard endpoint listens to extras beyond our handled set.
    return {
      type: "ignored",
      providerId: "stripe",
      providerEventId: event.id,
      occurredAt: new Date(event.created * 1000),
      raw: { ignoredStripeType: event.type, stripeEventId: event.id },
    };
  }

  async retrievePaidCheckoutSession(
    providerSessionId: string,
  ): Promise<PaymentWebhookEvent | null> {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(providerSessionId);

    if (session.payment_status !== "paid") {
      return null;
    }

    return mapCheckoutCompleted(session);
  }

  async healthCheck(_organisationId: string): Promise<ConnectorHealthResult> {
    const configured = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
    return {
      ok: configured,
      providerId: "stripe",
      message: configured
        ? "Stripe API key configured"
        : "STRIPE_SECRET_KEY not set",
      livemode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ?? false,
    };
  }
}

export const stripePaymentConnector = new StripePaymentConnector();

export const stripeConnectorManifest = {
  id: "stripe" as const,
  name: "Stripe",
  description: "Cards, Apple Pay, Google Pay, bank debits (AU)",
  supportedMethods: ["card", "apple_pay", "google_pay", "bank_transfer"] as PaymentMethod[],
  supportsSubscriptions: true,
  supportsRefunds: true,
  supportsPaymentLinks: true,
  webhookPath: "/api/webhooks/stripe",
};
