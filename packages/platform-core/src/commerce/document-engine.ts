import type { Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import { platformEvents } from "../events";
import { getOrganisationBusinessProfile } from "../org/onboarding-profile";
import {
  computeDocumentTotals,
  resolveOrgTaxDefaults,
  withDefaultLineTax,
} from "./tax";
import type {
  CommerceCurrency,
  CommerceLineItem,
  CreateInvoiceInput,
  CreateQuoteInput,
  InvoiceStatus,
  QuoteStatus,
} from "./types";

function serializeLineItems(items: CommerceLineItem[]) {
  return items.map((item, index) => ({ ...item, sortOrder: index }));
}

function nextDocNumber(prefix: string, count: number) {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}

function buildDocumentMetadata(
  input: {
    taxInclusive?: boolean;
    buyer?: CreateQuoteInput["buyer"];
    metadata?: Record<string, unknown>;
  },
  taxInclusive: boolean,
) {
  return {
    ...(input.metadata ?? {}),
    taxInclusive,
    ...(input.buyer ? { buyer: input.buyer } : {}),
  } as unknown as Prisma.InputJsonValue;
}

async function prepareLineItems(
  organisationId: string,
  lineItems: CommerceLineItem[],
  taxInclusiveOverride?: boolean,
) {
  const profile = await getOrganisationBusinessProfile(organisationId);
  const defaults = resolveOrgTaxDefaults(profile);
  const items = withDefaultLineTax(lineItems, defaults);
  const taxInclusive = taxInclusiveOverride ?? defaults.pricesIncludeTax;
  const totals = computeDocumentTotals(items, { taxInclusive });
  return { items, taxInclusive, totals, defaults };
}

export async function createQuote(input: CreateQuoteInput) {
  const { prisma } = await import("@dg/database");
  const currency = (input.currency ?? "AUD") as CommerceCurrency;
  const { items, taxInclusive, totals } = await prepareLineItems(
    input.organisationId,
    input.lineItems,
    input.taxInclusive,
  );
  const lineItems = serializeLineItems(items);

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
      subtotalCents: totals.subtotalCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
      validUntil: input.validUntil,
      notes: input.notes,
      lineItems: lineItems as unknown as Prisma.InputJsonValue,
      metadata: buildDocumentMetadata(input, taxInclusive),
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
  const { items, taxInclusive, totals } = await prepareLineItems(
    input.organisationId,
    input.lineItems,
    input.taxInclusive,
  );
  const lineItems = serializeLineItems(items);

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
      subtotalCents: totals.subtotalCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
      dueAt: input.dueAt,
      notes: input.notes,
      lineItems: lineItems as unknown as Prisma.InputJsonValue,
      metadata: buildDocumentMetadata(input, taxInclusive),
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
  if (quote.status === "accepted" || quote.status === "void" || quote.status === "declined") {
    return null;
  }

  const lineItems = quote.lineItems as unknown as CommerceLineItem[];
  const meta = (quote.metadata ?? {}) as Record<string, unknown>;
  const taxInclusive = Boolean(meta.taxInclusive);
  const buyer = meta.buyer as CreateInvoiceInput["buyer"] | undefined;

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
    taxInclusive,
    buyer,
    metadata: { convertedFromQuote: quote.id },
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

export async function listQuotesForEntity(
  organisationId: string,
  entityType: string,
  entityId: string,
) {
  const { prisma } = await import("@dg/database");
  return prisma.commerceQuote.findMany({
    where: { organisationId, sourceEntityType: entityType, sourceEntityId: entityId },
    orderBy: { createdAt: "desc" },
    take: 20,
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

export async function listInvoicesForEntity(
  organisationId: string,
  entityType: string,
  entityId: string,
) {
  const { prisma } = await import("@dg/database");
  return prisma.commerceInvoice.findMany({
    where: { organisationId, sourceEntityType: entityType, sourceEntityId: entityId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getQuote(organisationId: string, quoteId: string) {
  const { prisma } = await import("@dg/database");
  return prisma.commerceQuote.findFirst({
    where: { id: quoteId, organisationId },
  });
}

export async function getInvoice(organisationId: string, invoiceId: string) {
  const { prisma } = await import("@dg/database");
  return prisma.commerceInvoice.findFirst({
    where: { id: invoiceId, organisationId },
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

export async function sendQuote(
  organisationId: string,
  quoteId: string,
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");
  const quote = await prisma.commerceQuote.findFirst({
    where: { id: quoteId, organisationId },
  });
  if (!quote) return null;

  const updated = await prisma.commerceQuote.update({
    where: { id: quoteId },
    data: { status: quote.status === "draft" ? "sent" : quote.status },
  });

  await writeAuditLog({
    organisationId,
    actorId,
    action: "update",
    entityType: "CommerceQuote",
    entityId: quoteId,
    changes: { status: updated.status },
  });

  return updated;
}

export async function declineQuote(
  organisationId: string,
  quoteId: string,
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");
  const quote = await prisma.commerceQuote.findFirst({
    where: { id: quoteId, organisationId },
  });
  if (!quote) return null;
  if (quote.status === "accepted" || quote.status === "void") return null;

  const updated = await prisma.commerceQuote.update({
    where: { id: quoteId },
    data: { status: "declined" satisfies QuoteStatus },
  });

  await writeAuditLog({
    organisationId,
    actorId,
    action: "update",
    entityType: "CommerceQuote",
    entityId: quoteId,
    changes: { status: "declined" },
  });

  return updated;
}

export async function voidInvoice(
  organisationId: string,
  invoiceId: string,
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");
  const invoice = await prisma.commerceInvoice.findFirst({
    where: { id: invoiceId, organisationId },
  });
  if (!invoice) return null;
  if (invoice.status === "paid") return null;

  const updated = await prisma.commerceInvoice.update({
    where: { id: invoiceId },
    data: { status: "void" satisfies InvoiceStatus },
  });

  await writeAuditLog({
    organisationId,
    actorId,
    action: "update",
    entityType: "CommerceInvoice",
    entityId: invoiceId,
    changes: { status: "void" },
  });

  return updated;
}

export async function markInvoicePaid(
  organisationId: string,
  invoiceId: string,
  actorId?: string,
  paidAt?: Date,
) {
  const { prisma } = await import("@dg/database");
  const invoice = await prisma.commerceInvoice.findFirst({
    where: { id: invoiceId, organisationId },
  });
  if (!invoice) return null;
  if (invoice.status === "void") return null;

  const updated = await prisma.commerceInvoice.update({
    where: { id: invoiceId },
    data: {
      status: "paid" satisfies InvoiceStatus,
      paidAt: paidAt ?? new Date(),
    },
  });

  await writeAuditLog({
    organisationId,
    actorId,
    action: "update",
    entityType: "CommerceInvoice",
    entityId: invoiceId,
    changes: { status: "paid" },
  });

  return updated;
}
