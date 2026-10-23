import {
  accrueMonthlyReferralCreditFromInvoice,
  accruePartnerCommissionFromInvoice,
  applyInvoicePaidRecovery,
  applyInvoicePaymentFailed,
  bootPaymentConnectors,
  getPlatformSubscriptionByStripeCustomer,
  handleConnectAccountUpdated,
  handleConnectTransferFailure,
  handlePlatformSubscriptionLifecycle,
  isCommerceCustomerSubscription,
  isPlatformCheckoutSession,
  isPlatformSubscription,
  PlatformSubscriptionWebhookHoldUnavailableError,
  prismaReceiptStore,
  processPaymentWebhookEvent,
  provisionFromPlatformCheckout,
  requirePaymentConnector,
  resolveOrganisationIdByConnectAccount,
  syncCommerceSubscriptionFromStripe,
  withWebhookReceiptState,
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
  // Fail safe: a platform billing customer must map to exactly one org.
  const orgs = await prisma.organisation.findMany({
    where: { billingCustomerId: customerId },
    select: { id: true },
    take: 2,
  });
  return orgs.length === 1 ? orgs[0].id : undefined;
}

type PlatformBillingDisposition = "platform" | "unrelated";

function stripeObjectId(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id;
  }
  return undefined;
}

function isPlatformBillingMetadata(metadata: Record<string, unknown> | null | undefined): boolean {
  return metadata?.dg_platform_subscription === "true" || Boolean(metadata?.dg_platform_tier);
}

function metadataOrganisationId(metadata: Record<string, unknown> | null | undefined): string | undefined {
  const identities = [metadata?.organisation_id, metadata?.organisationId]
    .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    .map((value) => value.trim());
  if (new Set(identities).size > 1) throw new Error("Conflicting organisation metadata aliases");
  return identities[0];
}

/** Customer identity is canonical evidence, not an entitlement or metadata claim. */
async function canonicalCustomerOwner(customerId?: string) {
  if (!customerId) return null;
  const { prisma } = await import("@dg/database");
  const [organisation, subscription] = await Promise.all([
    prisma.organisation.findUnique({ where: { billingCustomerId: customerId }, select: { id: true } }),
    prisma.platformSubscription.findUnique({
      where: { stripeCustomerId: customerId },
      select: { organisationId: true, stripeSubscriptionId: true },
    }),
  ]);
  if (organisation && subscription && organisation.id !== subscription.organisationId) {
    throw new Error("Conflicting canonical customer owners");
  }
  const organisationId = organisation?.id ?? subscription?.organisationId;
  return organisationId ? { organisationId, subscriptionId: subscription?.stripeSubscriptionId } : null;
}

async function verifyPlatformOwner(input: {
  organisationId?: string | null;
  customerId?: string;
  subscriptionId?: string;
}) {
  if (!input.organisationId) {
    throw new PlatformSubscriptionWebhookHoldUnavailableError(
      { cause: new Error("Platform billing event has no organisation identity") },
    );
  }
  if (!input.customerId) {
    throw new PlatformSubscriptionWebhookHoldUnavailableError(
      { cause: new Error("Platform billing event has no Stripe customer identity") },
    );
  }

  const { prisma } = await import("@dg/database");
  const organisation = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { id: true, billingCustomerId: true },
  });
  if (!organisation) {
    throw new PlatformSubscriptionWebhookHoldUnavailableError(
      { cause: new Error("Platform billing event references an unknown organisation") },
    );
  }

  if (input.customerId) {
    const [customerOrganisation, customerSubscription] = await Promise.all([
      prisma.organisation.findUnique({
        where: { billingCustomerId: input.customerId },
        select: { id: true },
      }),
      prisma.platformSubscription.findUnique({
        where: { stripeCustomerId: input.customerId },
        select: { organisationId: true },
      }),
    ]);
    if (
      (organisation.billingCustomerId && organisation.billingCustomerId !== input.customerId) ||
      (customerOrganisation && customerOrganisation.id !== input.organisationId) ||
      (customerSubscription && customerSubscription.organisationId !== input.organisationId)
    ) {
      throw new PlatformSubscriptionWebhookHoldUnavailableError(
        { cause: new Error("Platform billing customer ownership is inconsistent") },
      );
    }
  }

  if (input.subscriptionId) {
    const subscription = await prisma.platformSubscription.findUnique({
      where: { stripeSubscriptionId: input.subscriptionId },
      select: { organisationId: true, stripeCustomerId: true },
    });
    if (
      subscription &&
      (subscription.organisationId !== input.organisationId ||
        (input.customerId && subscription.stripeCustomerId && subscription.stripeCustomerId !== input.customerId))
    ) {
      throw new PlatformSubscriptionWebhookHoldUnavailableError(
        { cause: new Error("Platform billing subscription ownership is inconsistent") },
      );
    }
  }
}

/**
 * Resolve the exact webhook paths that can write platform subscription state.
 * Stripe's signed marker is only accepted together with a real organisation
 * and non-conflicting canonical Stripe customer/subscription ownership.
 * Database lookup failures fail closed before any receipt is claimed.
 */
async function resolvePlatformBillingDisposition(
  event: ParsedStripeEvent,
): Promise<PlatformBillingDisposition> {
  if (event.connectAccountId) return "unrelated";
  const guardedEventType = [
    "subscription.created",
    "subscription.updated",
    "subscription.cancelled",
    "checkout.completed",
    "invoice.payment_failed",
    "invoice.payment_action_required",
    "invoice.paid",
  ].includes(event.type);
  if (!guardedEventType) return "unrelated";

  try {
    const { prisma } = await import("@dg/database");
    if (["subscription.created", "subscription.updated", "subscription.cancelled"].includes(event.type)) {
      const subscription = event.raw as Stripe.Subscription | null;
      if (!subscription) throw new Error("Subscription lifecycle event has no subscription object");
      const subscriptionId = subscription.id || event.stripeSubscriptionId;
      const customerId = stripeObjectId(subscription.customer) || event.providerCustomerId;
      const canonical = subscriptionId
        ? await prisma.platformSubscription.findUnique({
            where: { stripeSubscriptionId: subscriptionId },
            select: { organisationId: true, stripeCustomerId: true },
          })
        : null;
      const metadata = subscription.metadata as Record<string, unknown> | undefined;
      const organisationId = metadataOrganisationId(metadata) || canonical?.organisationId;
      if (canonical || isPlatformSubscription(subscription)) {
        if (!subscriptionId) throw new Error("Platform subscription event has no subscription identity");
        await verifyPlatformOwner({ organisationId, customerId, subscriptionId });
        return "platform";
      }
      return "unrelated";
    }

    if (event.type === "checkout.completed") {
      const session = event.raw as Stripe.Checkout.Session | null;
      if (!session) throw new Error("Checkout completion has no session object");
      if (session.mode !== "subscription") {
        if (isPlatformCheckoutSession(session)) throw new Error("Platform checkout has an invalid mode");
        return "unrelated";
      }
      const subscriptionId = stripeObjectId(session.subscription);
      const customerId = stripeObjectId(session.customer);
      const canonical = subscriptionId
        ? await prisma.platformSubscription.findUnique({
            where: { stripeSubscriptionId: subscriptionId },
            select: { organisationId: true, stripeCustomerId: true },
          })
        : null;
      if (!isPlatformCheckoutSession(session) && !canonical) return "unrelated";
      let organisationId = metadataOrganisationId(session.metadata) || canonical?.organisationId;
      if (!organisationId) {
        const customerOwner = await canonicalCustomerOwner(customerId);
        const email = (session.customer_details?.email ?? session.customer_email ?? session.metadata?.contact_email ?? "")
          .trim().toLowerCase();
        const memberships = email ? await prisma.membership.findMany({
          where: { email }, select: { organisationId: true }, distinct: ["organisationId"], take: 2,
        }) : [];
        if (!customerOwner || memberships.length !== 1 || memberships[0].organisationId !== customerOwner.organisationId) {
          throw new Error("Legacy checkout email and canonical customer ownership are unresolved");
        }
        organisationId = customerOwner.organisationId;
      }
      if (!subscriptionId) throw new Error("Platform checkout completion has no subscription identity");
      await verifyPlatformOwner({ organisationId, customerId, subscriptionId });
      // Carry the verified identity into receipt bookkeeping and provisioning;
      // do not let the handler independently select the newest email membership.
      event.organisationId = organisationId;
      return "platform";
    }

    if (["invoice.payment_failed", "invoice.payment_action_required", "invoice.paid"].includes(event.type)) {
      const invoice = event.raw as Stripe.Invoice | null;
      if (!invoice) throw new Error("Invoice event has no invoice object");
      const subscriptionId = event.stripeSubscriptionId || stripeObjectId(invoice.subscription);
      const customerId = event.providerCustomerId || stripeObjectId(invoice.customer);
      const canonical = subscriptionId
        ? await prisma.platformSubscription.findUnique({
            where: { stripeSubscriptionId: subscriptionId },
            select: { organisationId: true, stripeCustomerId: true },
          })
        : null;
      const subscriptionMetadata = invoice.subscription_details?.metadata as Record<string, unknown> | undefined;
      const invoiceMetadata = invoice.metadata as Record<string, unknown> | undefined;
      const metadata = { ...invoiceMetadata, ...subscriptionMetadata };
      const organisationClaims = new Set([metadataOrganisationId(invoiceMetadata), metadataOrganisationId(subscriptionMetadata)]
        .filter((id): id is string => Boolean(id)));
      if (organisationClaims.size > 1) throw new Error("Conflicting invoice organisation identities");
      const markedPlatform = [invoiceMetadata, subscriptionMetadata].some(isPlatformBillingMetadata);
      const markedCommerce = [invoiceMetadata, subscriptionMetadata].some(
        (source) => source?.dg_commerce_subscription === "true" || source?.dg_commerce === "true",
      );
      if (markedCommerce && (canonical || markedPlatform)) throw new Error("Conflicting invoice billing classes");
      const customerOwner = await canonicalCustomerOwner(customerId);
      if (markedCommerce && !customerOwner) return "unrelated";
      if (!canonical && !markedPlatform && subscriptionId) {
        const commerce = await prisma.commerceSubscription.findMany({
          where: { providerId: "stripe", providerSubscriptionId: subscriptionId },
          select: { organisationId: true, metadata: true }, take: 2,
        });
        if (commerce.length > 0) {
          const ownerMetadata = commerce[0].metadata as Record<string, unknown> | null;
          if (commerce.length !== 1 || !customerId || ownerMetadata?.customerId !== customerId ||
              (metadataOrganisationId(metadata) && metadataOrganisationId(metadata) !== commerce[0].organisationId)) {
            throw new Error("Commerce invoice ownership is unresolved");
          }
          // A shared customer is allowed, but the commerce marker must not
          // conceal an unprojected platform invoice. Require a known, distinct
          // platform subscription as well as the corroborated commerce record.
          if (customerOwner && (!customerOwner.subscriptionId || customerOwner.subscriptionId === subscriptionId)) {
            throw new Error("Shared invoice customer has unresolved subscription ownership");
          }
          return "unrelated";
        }
      }
      if (markedCommerce) throw new Error("Commerce marker conflicts with canonical platform customer ownership");
      if (!canonical && !markedPlatform && !customerOwner) {
        if (subscriptionId) throw new Error("Subscription invoice ownership is unresolved");
        return "unrelated";
      }
      if (!canonical && customerOwner?.subscriptionId && customerOwner.subscriptionId !== subscriptionId) {
        throw new Error("Invoice subscription conflicts with canonical customer subscription");
      }
      const organisationId = metadataOrganisationId(metadata) || canonical?.organisationId || customerOwner?.organisationId;
      if (!subscriptionId) throw new Error("Platform invoice event has no subscription identity");
      await verifyPlatformOwner({ organisationId, customerId, subscriptionId });
      event.organisationId = organisationId;
      return "platform";
    }

    return "unrelated";
  } catch (error) {
    if (error instanceof PlatformSubscriptionWebhookHoldUnavailableError) throw error;
    throw new PlatformSubscriptionWebhookHoldUnavailableError({ cause: error });
  }
}

/**
 * Event handling, separated from receipt bookkeeping so a failed handler can
 * release its idempotency claim and remain retryable (H-7).
 */
type ParsedStripeEvent = Awaited<
  ReturnType<ReturnType<typeof requirePaymentConnector>["parseWebhook"]>
>;

async function handleStripeEvent(
  event: ParsedStripeEvent,
  platformBillingDisposition: PlatformBillingDisposition,
): Promise<NextResponse> {
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
    if (event.connectAccountId) {
      return NextResponse.json({ received: true, skipped: "connected_account_checkout" });
    }
    const session = event.raw as Stripe.Checkout.Session;
    if (!event.connectAccountId && platformBillingDisposition === "platform" && isPlatformCheckoutSession(session)) {
      const platformResult = await provisionFromPlatformCheckout({
        ...session, metadata: { ...session.metadata, organisation_id: event.organisationId! },
      });
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

    // H-8: a subscription enters the PlatformSubscription state machine only on
    // the DigitalGate platform Stripe account (no connected account) AND with an
    // explicit platform marker. A connected/Stripe Connect account is always a
    // commerce/customer subscription — regardless of copied platform metadata —
    // and a subscription with no explicit marker is never a platform subscription.
    const onConnectedAccount = Boolean(event.connectAccountId);

    if (!onConnectedAccount && isPlatformSubscription(subscription)) {
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
    } else if (onConnectedAccount) {
      // Connected-account subscription: the owner is the organisation that owns
      // event.account in our trusted mapping. Tenant-controlled
      // subscription.metadata.organisation_id is NOT trusted and cannot select
      // the tenant; an unknown/ambiguous account performs no mutation.
      const ownerOrganisationId = await resolveOrganisationIdByConnectAccount(
        event.connectAccountId,
      );
      if (!ownerOrganisationId) {
        result.commerce = { ok: false, reason: "unknown_connect_account" };
        console.warn(
          "[stripe webhook] connected-account subscription for unmapped account:",
          event.connectAccountId,
        );
      } else {
        const commerce = await syncCommerceSubscriptionFromStripe({
          subscription,
          organisationId: ownerOrganisationId,
        });
        result.commerce = commerce;
        console.info("[stripe webhook] commerce subscription:", event.type, commerce);
      }
    } else if (isCommerceCustomerSubscription(subscription)) {
      // Commerce subscription on the DigitalGate platform account (not a platform
      // seat). Platform-account metadata is server-set — a tenant cannot write it
      // — so event.organisationId is trusted here.
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
    if (platformBillingDisposition !== "platform") {
      return NextResponse.json({ received: true, skipped: "not_a_verified_platform_subscription" });
    }
    let organisationId = event.organisationId;
    if (!organisationId) {
      organisationId = await resolveOrgIdFromStripeCustomer(event.providerCustomerId);
    }
    if (organisationId && !event.connectAccountId) {
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
    // Connected-account invoices are the tenant's own commerce billing and must
    // never drive DigitalGate platform recovery, referral, or partner accrual
    // (H-8: platform-account events only). Fail safe: no tenant mutation.
    if (event.connectAccountId) {
      return NextResponse.json({
        received: true,
        skipped: "connected_account_invoice",
      });
    }

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

    // Connected-account invoices already returned above, so this is a
    // platform-account invoice; the H-8 !connectAccountId gate is preserved by
    // the early return.
    if (organisationId && platformBillingDisposition === "platform") {
      await applyInvoicePaidRecovery({
        organisationId,
        stripeSubscriptionId: event.stripeSubscriptionId,
        stripeCustomerId: event.providerCustomerId,
        stripeEventId: event.providerEventId,
      });
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
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY?.trim() || !process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    console.error("[stripe webhook] Stripe webhook secrets are not configured");
    return NextResponse.json(
      { error: { code: "stripe_webhook_not_configured", message: "Stripe webhook is not configured." } },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }

  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  try {
    const connector = requirePaymentConnector("stripe");
    const event = await connector.parseWebhook(rawBody, headers);

    // Local payment requests belong to the platform account.
    // Connected-account metadata must not authorize platform-account payment
    // mutations or receipt claims.
    if (event.connectAccountId && ["checkout.completed", "checkout.expired", "payment.failed"].includes(event.type)) {
      return NextResponse.json({ received: true, skipped: event.type.startsWith("checkout.")
        ? "connected_account_checkout" : "connected_account_payment_event" });
    }

    // Classify platform subscription events before claiming their receipts.
    // The store atomically checks the shared hold and claims the receipt.
    const platformBillingDisposition = await resolvePlatformBillingDisposition(event);
    const requireSubscriptionWebhookOpen = platformBillingDisposition === "platform";

    // H-7: atomic claim → processing → processed / failed, with stale-claim
    // recovery. A handler that throws leaves the receipt `failed` and rethrows
    // so Stripe retries; a crash leaves it `processing` until the stale
    // threshold, after which a later delivery can reclaim it.
    const outcome = await withWebhookReceiptState({
      store: prismaReceiptStore(),
      eventId: event.providerEventId,
      eventType: event.type,
      organisationId: event.organisationId ?? null,
      requireSubscriptionWebhookOpen,
      handle: () => handleStripeEvent(event, platformBillingDisposition),
    });

    if (outcome.status === "held") {
      return NextResponse.json(
        { error: { code: "subscription_webhook_cutover_hold", message: "Subscription event is temporarily deferred." } },
        { status: 503, headers: { "Retry-After": "60" } },
      );
    }

    if (outcome.status === "duplicate") {
      return NextResponse.json({
        received: true,
        duplicate: true,
        reason: outcome.reason,
      });
    }

    if (outcome.status === "exhausted") {
      // Poison event: acknowledged so Stripe stops retrying, and left `failed`
      // in the receipt table for alerting rather than looping forever.
      console.error(
        "[stripe webhook] event exhausted retries:",
        event.providerEventId,
        outcome.attempts,
      );
      return NextResponse.json({
        received: true,
        skipped: "retries_exhausted",
        attempts: outcome.attempts,
      });
    }

    return outcome.result;
  } catch (err) {
    if (err instanceof PlatformSubscriptionWebhookHoldUnavailableError) {
      return NextResponse.json(
        { error: { code: "subscription_webhook_hold_unavailable", message: "Subscription event is temporarily deferred." } },
        { status: 503, headers: { "Retry-After": "60" } },
      );
    }
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
