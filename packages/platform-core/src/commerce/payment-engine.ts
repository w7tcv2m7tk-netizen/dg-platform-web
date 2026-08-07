import type { Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import { platformEvents } from "../events";
import { bootPaymentConnectors, defaultPaymentProviderId, requirePaymentConnector } from "./connectors";
import type {
  CommerceCurrency,
  CommerceLineItem,
  CreatePaymentRequestInput,
  PaymentRequestResult,
} from "./types";
import { lineItemsWithTaxCents } from "./types";

bootPaymentConnectors();

function serializeLineItems(items: CommerceLineItem[]) {
  return items.map((item, index) => ({
    ...item,
    sortOrder: index,
  }));
}

function defaultCheckoutUrls(paymentRequestId: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://app.digitalgate.com.au";
  return {
    successUrl: `${base}/commerce/checkout/${paymentRequestId}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${base}/commerce/checkout/${paymentRequestId}/cancel`,
  };
}

/** Unified cross-app payment request — every app uses this */
export async function createPaymentRequest(
  input: CreatePaymentRequestInput,
): Promise<PaymentRequestResult> {
  const { prisma } = await import("@dg/database");

  const currency = (input.currency ?? "AUD") as CommerceCurrency;
  const lineItems = serializeLineItems(input.lineItems);
  const subtotalCents = lineItemsWithTaxCents(input.lineItems);
  const allowedMethods = input.allowedMethods ?? ["card"];
  const providerId = input.providerId ?? defaultPaymentProviderId();

  const paymentRequest = await prisma.commercePaymentRequest.create({
    data: {
      organisationId: input.organisationId,
      sourceApp: input.sourceApp,
      sourceEntityType: input.sourceEntity?.type,
      sourceEntityId: input.sourceEntity?.id,
      contactId: input.contactId,
      quoteId: input.quoteId,
      invoiceId: input.invoiceId,
      status: "pending",
      currency,
      subtotalCents,
      totalCents: subtotalCents,
      allowedMethods: allowedMethods as unknown as Prisma.InputJsonValue,
      providerId,
      description: input.description,
      dueAt: input.dueAt,
      metadata: {
        ...(input.metadata ?? {}),
        lineItems,
      } as Prisma.InputJsonValue,
    },
  });

  const connector = requirePaymentConnector(providerId);
  const resolvedUrls = defaultCheckoutUrls(paymentRequest.id);

  let customerEmail: string | undefined;
  if (input.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: input.contactId, organisationId: input.organisationId },
      select: { email: true },
    });
    customerEmail = contact?.email ?? undefined;
  }

  const checkout = await connector.createCheckoutSession({
    organisationId: input.organisationId,
    paymentRequestId: paymentRequest.id,
    lineItems: input.lineItems,
    currency,
    allowedMethods,
    customerEmail,
    successUrl: input.successUrl ?? resolvedUrls.successUrl,
    cancelUrl: input.cancelUrl ?? resolvedUrls.cancelUrl,
    metadata: {
      organisationId: input.organisationId,
      paymentRequestId: paymentRequest.id,
      sourceApp: input.sourceApp,
    },
  });

  const updated = await prisma.commercePaymentRequest.update({
    where: { id: paymentRequest.id },
    data: {
      status: "checkout_open",
      providerSessionId: checkout.providerSessionId,
      checkoutUrl: checkout.checkoutUrl,
      paymentLinkUrl: checkout.checkoutUrl,
      expiresAt: checkout.expiresAt,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "CommercePaymentRequest",
    entityId: updated.id,
    changes: { after: { totalCents: subtotalCents, sourceApp: input.sourceApp } },
  });

  await platformEvents.publish({
    type: "commerce.payment_request.created",
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "CommercePaymentRequest",
    entityId: updated.id,
    payload: {
      sourceApp: input.sourceApp,
      totalCents: subtotalCents,
      currency,
    },
    occurredAt: new Date(),
  });

  return {
    id: updated.id,
    status: updated.status as PaymentRequestResult["status"],
    totalCents: updated.totalCents,
    currency: updated.currency as CommerceCurrency,
    checkoutUrl: updated.checkoutUrl ?? undefined,
    paymentLinkUrl: updated.paymentLinkUrl ?? undefined,
    providerSessionId: updated.providerSessionId ?? undefined,
    expiresAt: updated.expiresAt?.toISOString(),
  };
}

/** Record successful payment from connector webhook (idempotent) */
export async function recordPaymentFromWebhook(input: {
  organisationId: string;
  paymentRequestId: string;
  providerId: string;
  providerPaymentId: string;
  amountCents: number;
  currency: CommerceCurrency;
  paymentMethod?: string;
  paidAt?: Date;
}) {
  const { prisma } = await import("@dg/database");

  const existing = await prisma.commercePayment.findFirst({
    where: {
      organisationId: input.organisationId,
      providerPaymentId: input.providerPaymentId,
    },
  });
  if (existing) return existing;

  const paymentRequest = await prisma.commercePaymentRequest.findFirst({
    where: {
      id: input.paymentRequestId,
      organisationId: input.organisationId,
    },
  });
  if (!paymentRequest) return null;

  const payment = await prisma.commercePayment.create({
    data: {
      organisationId: input.organisationId,
      paymentRequestId: input.paymentRequestId,
      contactId: paymentRequest.contactId,
      providerId: input.providerId,
      providerPaymentId: input.providerPaymentId,
      status: "succeeded",
      amountCents: input.amountCents,
      currency: input.currency,
      paymentMethod: input.paymentMethod,
      paidAt: input.paidAt ?? new Date(),
    },
  });

  await prisma.commercePaymentRequest.update({
    where: { id: input.paymentRequestId },
    data: { status: "paid", paidAt: payment.paidAt },
  });

  if (paymentRequest.invoiceId) {
    await prisma.commerceInvoice.updateMany({
      where: {
        id: paymentRequest.invoiceId,
        organisationId: input.organisationId,
      },
      data: { status: "paid", paidAt: payment.paidAt },
    });
  }

  await platformEvents.publish({
    type: "commerce.payment.completed",
    organisationId: input.organisationId,
    entityType: "CommercePayment",
    entityId: payment.id,
    payload: {
      paymentRequestId: input.paymentRequestId,
      amountCents: input.amountCents,
      currency: input.currency,
      sourceApp: paymentRequest.sourceApp,
    },
    occurredAt: payment.paidAt ?? new Date(),
  });

  const { runAutomationForEvent } = await import("../automation");
  await runAutomationForEvent({
    type: "commerce.payment.completed",
    organisationId: input.organisationId,
    entityType: "CommercePayment",
    entityId: payment.id,
    payload: {
      paymentRequestId: input.paymentRequestId,
      amountCents: input.amountCents,
      sourceApp: paymentRequest.sourceApp,
    },
    occurredAt: payment.paidAt ?? new Date(),
  });

  return payment;
}

export async function listOrganisationPaymentRequests(organisationId: string, limit = 50) {
  const { prisma } = await import("@dg/database");

  const items = await prisma.commercePaymentRequest.findMany({
    where: { organisationId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
  });

  return items.map((row) => ({
    id: row.id,
    status: row.status,
    totalCents: row.totalCents,
    currency: row.currency,
    checkoutUrl: row.checkoutUrl,
    paymentLinkUrl: row.paymentLinkUrl,
    description: row.description,
    sourceApp: row.sourceApp,
    sourceEntityType: row.sourceEntityType,
    sourceEntityId: row.sourceEntityId,
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function listPaymentRequestsForEntity(
  organisationId: string,
  entityType: string,
  entityId: string,
) {
  const { prisma } = await import("@dg/database");

  const items = await prisma.commercePaymentRequest.findMany({
    where: { organisationId, sourceEntityType: entityType, sourceEntityId: entityId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return items.map((row) => ({
    id: row.id,
    status: row.status,
    totalCents: row.totalCents,
    currency: row.currency,
    checkoutUrl: row.checkoutUrl,
    paymentLinkUrl: row.paymentLinkUrl,
    description: row.description,
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function processPaymentWebhookEvent(
  event: import("./connectors/types").PaymentWebhookEvent,
) {
  const { prisma } = await import("@dg/database");

  if (event.type === "ignored") {
    return { ok: false as const, reason: "ignored_event" };
  }

  if (event.type === "checkout.completed") {
    if (!event.organisationId || !event.paymentRequestId || !event.providerPaymentId) {
      return { ok: false as const, reason: "missing_metadata" };
    }
    const amountCents = event.amountCents ?? 0;
    const currency = (event.currency ?? "AUD") as CommerceCurrency;
    await recordPaymentFromWebhook({
      organisationId: event.organisationId,
      paymentRequestId: event.paymentRequestId,
      providerId: event.providerId,
      providerPaymentId: event.providerPaymentId,
      amountCents,
      currency,
      paymentMethod: event.paymentMethod,
      paidAt: event.occurredAt,
    });
    return { ok: true as const };
  }

  if (event.type === "checkout.expired" && event.paymentRequestId && event.organisationId) {
    await prisma.commercePaymentRequest.updateMany({
      where: {
        id: event.paymentRequestId,
        organisationId: event.organisationId,
        status: { in: ["pending", "checkout_open"] },
      },
      data: { status: "expired" },
    });
    return { ok: true as const };
  }

  if (event.type === "payment.failed" && event.paymentRequestId && event.organisationId) {
    await prisma.commercePaymentRequest.updateMany({
      where: { id: event.paymentRequestId, organisationId: event.organisationId },
      data: { status: "failed" },
    });
    await platformEvents.publish({
      type: "commerce.payment.failed",
      organisationId: event.organisationId,
      entityType: "CommercePaymentRequest",
      entityId: event.paymentRequestId,
      payload: { providerPaymentId: event.providerPaymentId },
      occurredAt: event.occurredAt,
    });
    return { ok: true as const };
  }

  return { ok: false as const, reason: "unhandled_event" };
}

/** Confirm payment on success redirect when webhook is delayed or misconfigured */
export async function confirmCheckoutSession(input: {
  paymentRequestId: string;
  providerSessionId: string;
}) {
  const { prisma } = await import("@dg/database");

  const paymentRequest = await prisma.commercePaymentRequest.findUnique({
    where: { id: input.paymentRequestId },
  });

  if (!paymentRequest) {
    return { ok: false as const, reason: "not_found" };
  }

  if (paymentRequest.status === "paid") {
    return { ok: true as const, alreadyPaid: true };
  }

  if (paymentRequest.providerSessionId !== input.providerSessionId) {
    return { ok: false as const, reason: "session_mismatch" };
  }

  const connector = requirePaymentConnector(paymentRequest.providerId ?? defaultPaymentProviderId());
  if (!connector.retrievePaidCheckoutSession) {
    return { ok: false as const, reason: "connector_unsupported" };
  }

  const event = await connector.retrievePaidCheckoutSession(input.providerSessionId);
  if (!event) {
    return { ok: false as const, reason: "not_paid" };
  }

  return processPaymentWebhookEvent(event);
}

export async function getCommerceFinancialSnapshot(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [paymentsMtd, paymentsYtd, openInvoices, overdueInvoices, subscriptions] =
    await Promise.all([
      prisma.commercePayment.aggregate({
        where: {
          organisationId,
          status: "succeeded",
          paidAt: { gte: monthStart },
        },
        _sum: { amountCents: true },
      }),
      prisma.commercePayment.aggregate({
        where: {
          organisationId,
          status: "succeeded",
          paidAt: { gte: yearStart },
        },
        _sum: { amountCents: true },
      }),
      prisma.commerceInvoice.aggregate({
        where: {
          organisationId,
          status: { in: ["sent", "viewed", "partially_paid", "overdue"] },
        },
        _sum: { totalCents: true },
      }),
      prisma.commerceInvoice.aggregate({
        where: {
          organisationId,
          status: "overdue",
        },
        _sum: { totalCents: true },
      }),
      prisma.commerceSubscription.count({
        where: { organisationId, status: "active" },
      }),
    ]);

  return {
    organisationId,
    capturedAt: now,
    revenueMtdCents: paymentsMtd._sum.amountCents ?? 0,
    revenueYtdCents: paymentsYtd._sum.amountCents ?? 0,
    outstandingArCents: openInvoices._sum.totalCents ?? 0,
    overdueArCents: overdueInvoices._sum.totalCents ?? 0,
    mrrCents: 0,
    activeSubscriptions: subscriptions,
    failedPayments30d: 0,
    refunds30dCents: 0,
    avgPaymentDays: null,
    paymentMethodBreakdown: {},
    topCustomers: [],
  };
}
