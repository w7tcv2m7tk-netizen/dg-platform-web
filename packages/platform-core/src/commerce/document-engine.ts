import type { Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import { platformEvents } from "../events";
import type {
  CommerceCurrency,
  CommerceLineItem,
  CreateInvoiceInput,
  CreateQuoteInput,
} from "./types";
import { lineItemsWithTaxCents, sumLineItemsCents } from "./types";

function serializeLineItems(items: CommerceLineItem[]) {
  return items.map((item, index) => ({ ...item, sortOrder: index }));
}

function nextDocNumber(prefix: string, count: number) {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function createQuote(input: CreateQuoteInput) {
  const { prisma } = await import("@dg/database");
  const currency = (input.currency ?? "AUD") as CommerceCurrency;
  const lineItems = serializeLineItems(input.lineItems);
  const subtotalCents = sumLineItemsCents(lineItems);
  const totalCents = lineItemsWithTaxCents(input.lineItems);

  const count = await prisma.commerceQuote.count({
    where: { organisationId: input.organisationId },
  });

  const quote = await prisma.commerceQuote.create({
    data: {
      organisationId: input.organisationId,
      contactId: input.contactId,
      quoteNumber: nextDocNumber("Q", count),
      status: "draft",
      sourceApp: input.sourceApp,
      sourceEntityType: input.sourceEntity?.type,
      sourceEntityId: input.sourceEntity?.id,
      currency,
      subtotalCents,
      taxCents: totalCents - subtotalCents,
      totalCents,
      validUntil: input.validUntil,
      notes: input.notes,
      lineItems: lineItems as unknown as Prisma.InputJsonValue,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "CommerceQuote",
    entityId: quote.id,
  });

  return quote;
}

export async function createInvoice(input: CreateInvoiceInput) {
  const { prisma } = await import("@dg/database");
  const currency = (input.currency ?? "AUD") as CommerceCurrency;
  const lineItems = serializeLineItems(input.lineItems);
  const subtotalCents = sumLineItemsCents(lineItems);
  const totalCents = lineItemsWithTaxCents(input.lineItems);

  const count = await prisma.commerceInvoice.count({
    where: { organisationId: input.organisationId },
  });

  const invoice = await prisma.commerceInvoice.create({
    data: {
      organisationId: input.organisationId,
      contactId: input.contactId,
      quoteId: input.quoteId,
      invoiceNumber: nextDocNumber("INV", count),
      status: "draft",
      sourceApp: input.sourceApp,
      sourceEntityType: input.sourceEntity?.type,
      sourceEntityId: input.sourceEntity?.id,
      currency,
      subtotalCents,
      taxCents: totalCents - subtotalCents,
      totalCents,
      dueAt: input.dueAt,
      notes: input.notes,
      lineItems: lineItems as unknown as Prisma.InputJsonValue,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "CommerceInvoice",
    entityId: invoice.id,
  });

  return invoice;
}

export async function acceptQuote(
  organisationId: string,
  quoteId: string,
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");

  const quote = await prisma.commerceQuote.findFirst({
    where: { id: quoteId, organisationId },
  });
  if (!quote) return null;

  const lineItems = quote.lineItems as unknown as CommerceLineItem[];

  const invoice = await createInvoice({
    organisationId,
    actorId,
    contactId: quote.contactId ?? undefined,
    quoteId: quote.id,
    sourceApp: quote.sourceApp ?? "commerce",
    sourceEntity:
      quote.sourceEntityType && quote.sourceEntityId
        ? { type: quote.sourceEntityType, id: quote.sourceEntityId }
        : undefined,
    lineItems,
    currency: quote.currency as CommerceCurrency,
    notes: quote.notes ?? undefined,
    dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await prisma.commerceQuote.update({
    where: { id: quoteId },
    data: { status: "accepted", acceptedAt: new Date() },
  });

  await platformEvents.publish({
    type: "commerce.quote.accepted",
    organisationId,
    actorId,
    entityType: "CommerceQuote",
    entityId: quoteId,
    payload: { invoiceId: invoice.id, totalCents: quote.totalCents },
    occurredAt: new Date(),
  });

  const { runAutomationForEvent } = await import("../automation");
  await runAutomationForEvent({
    type: "commerce.quote.accepted",
    organisationId,
    actorId,
    entityType: "CommerceQuote",
    entityId: quoteId,
    payload: { invoiceId: invoice.id, totalCents: quote.totalCents },
    occurredAt: new Date(),
  });

  return { quote, invoice };
}

export async function listQuotes(organisationId: string, limit = 50) {
  const { prisma } = await import("@dg/database");
  return prisma.commerceQuote.findMany({
    where: { organisationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listInvoices(organisationId: string, limit = 50) {
  const { prisma } = await import("@dg/database");
  return prisma.commerceInvoice.findMany({
    where: { organisationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function sendInvoice(
  organisationId: string,
  invoiceId: string,
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");
  const invoice = await prisma.commerceInvoice.findFirst({
    where: { id: invoiceId, organisationId },
  });
  if (!invoice) return null;

  const updated = await prisma.commerceInvoice.update({
    where: { id: invoiceId },
    data: { status: invoice.status === "draft" ? "sent" : invoice.status },
  });

  await platformEvents.publish({
    type: "commerce.invoice.sent",
    organisationId,
    actorId,
    entityType: "CommerceInvoice",
    entityId: invoiceId,
    payload: { totalCents: invoice.totalCents },
    occurredAt: new Date(),
  });

  return updated;
}
