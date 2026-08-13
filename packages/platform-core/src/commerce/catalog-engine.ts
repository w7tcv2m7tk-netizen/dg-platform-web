/**
 * Commerce product catalogue + subscription/MRR reads.
 * Products: CRUD for quote/invoice line sourcing.
 * Subscriptions: org-scoped list + MRR rollup (no cancel/pause UI yet).
 */

import type { Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import type { CommerceCurrency, SubscriptionStatus } from "./types";

export type CommerceProductRow = {
  id: string;
  organisationId: string;
  name: string;
  description: string | null;
  sku: string | null;
  unitAmountCents: number;
  currency: string;
  taxCode: string | null;
  taxRateBps: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CommerceSubscriptionRow = {
  id: string;
  organisationId: string;
  contactId: string | null;
  providerId: string;
  providerSubscriptionId: string;
  status: string;
  currency: string;
  amountCents: number;
  interval: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProductInput = {
  organisationId: string;
  actorId?: string;
  name: string;
  description?: string;
  sku?: string;
  unitAmountCents: number;
  currency?: CommerceCurrency | string;
  taxCode?: string;
  taxRateBps?: number | null;
  active?: boolean;
  metadata?: Record<string, unknown>;
};

export type UpdateProductInput = {
  organisationId: string;
  productId: string;
  actorId?: string;
  name?: string;
  description?: string | null;
  sku?: string | null;
  unitAmountCents?: number;
  currency?: string;
  taxCode?: string | null;
  taxRateBps?: number | null;
  active?: boolean;
  metadata?: Record<string, unknown>;
};

/** Normalise billing interval amounts to monthly cents for MRR. */
export function amountToMonthlyMrrCents(amountCents: number, interval: string): number {
  const cents = Math.max(0, Math.round(amountCents));
  switch ((interval || "month").toLowerCase()) {
    case "day":
      return Math.round(cents * 30);
    case "week":
      return Math.round(cents * (52 / 12));
    case "year":
    case "annual":
      return Math.round(cents / 12);
    case "month":
    default:
      return cents;
  }
}

export async function listProducts(
  organisationId: string,
  options: { includeInactive?: boolean } = {},
): Promise<CommerceProductRow[]> {
  const { prisma } = await import("@dg/database");
  return prisma.commerceProduct.findMany({
    where: {
      organisationId,
      deletedAt: null,
      ...(options.includeInactive ? {} : { active: true }),
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export async function getProduct(
  organisationId: string,
  productId: string,
): Promise<CommerceProductRow | null> {
  const { prisma } = await import("@dg/database");
  return prisma.commerceProduct.findFirst({
    where: { id: productId, organisationId, deletedAt: null },
  });
}

export async function createProduct(input: CreateProductInput): Promise<CommerceProductRow> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Product name is required");
  }
  if (!Number.isFinite(input.unitAmountCents) || input.unitAmountCents < 0) {
    throw new Error("unitAmountCents must be a non-negative integer");
  }

  const { prisma } = await import("@dg/database");
  const product = await prisma.commerceProduct.create({
    data: {
      organisationId: input.organisationId,
      name,
      description: input.description?.trim() || null,
      sku: input.sku?.trim() || null,
      unitAmountCents: Math.round(input.unitAmountCents),
      currency: (input.currency || "AUD").toUpperCase(),
      taxCode: input.taxCode?.trim() || null,
      taxRateBps:
        typeof input.taxRateBps === "number" ? Math.round(input.taxRateBps) : null,
      active: input.active !== false,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "CommerceProduct",
    entityId: product.id,
    changes: { name: product.name, unitAmountCents: product.unitAmountCents },
  });

  return product;
}

export async function updateProduct(input: UpdateProductInput): Promise<CommerceProductRow> {
  const existing = await getProduct(input.organisationId, input.productId);
  if (!existing) {
    throw new Error("Product not found");
  }

  const data: Prisma.CommerceProductUpdateInput = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Product name is required");
    data.name = name;
  }
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.sku !== undefined) data.sku = input.sku?.trim() || null;
  if (input.unitAmountCents !== undefined) {
    if (!Number.isFinite(input.unitAmountCents) || input.unitAmountCents < 0) {
      throw new Error("unitAmountCents must be a non-negative integer");
    }
    data.unitAmountCents = Math.round(input.unitAmountCents);
  }
  if (input.currency !== undefined) data.currency = input.currency.toUpperCase();
  if (input.taxCode !== undefined) data.taxCode = input.taxCode?.trim() || null;
  if (input.taxRateBps !== undefined) {
    data.taxRateBps =
      typeof input.taxRateBps === "number" ? Math.round(input.taxRateBps) : null;
  }
  if (input.active !== undefined) data.active = input.active;
  if (input.metadata !== undefined) {
    data.metadata = input.metadata as Prisma.InputJsonValue;
  }

  const { prisma } = await import("@dg/database");
  const product = await prisma.commerceProduct.update({
    where: { id: existing.id },
    data,
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "CommerceProduct",
    entityId: product.id,
    changes: { active: product.active, name: product.name },
  });

  return product;
}

/** Soft-delete — keeps historical quote line productId references intact. */
export async function archiveProduct(input: {
  organisationId: string;
  productId: string;
  actorId?: string;
}): Promise<CommerceProductRow> {
  const existing = await getProduct(input.organisationId, input.productId);
  if (!existing) {
    throw new Error("Product not found");
  }

  const { prisma } = await import("@dg/database");
  const product = await prisma.commerceProduct.update({
    where: { id: existing.id },
    data: { active: false, deletedAt: new Date() },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "archive",
    entityType: "CommerceProduct",
    entityId: product.id,
  });

  return product;
}

const ACTIVE_MRR_STATUSES: SubscriptionStatus[] = ["trialing", "active", "past_due"];

export async function listSubscriptions(
  organisationId: string,
  options: { status?: string; limit?: number } = {},
): Promise<CommerceSubscriptionRow[]> {
  const { prisma } = await import("@dg/database");
  return prisma.commerceSubscription.findMany({
    where: {
      organisationId,
      ...(options.status ? { status: options.status } : {}),
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: Math.min(options.limit ?? 100, 250),
  });
}

export async function getOrganisationMrr(organisationId: string): Promise<{
  mrrCents: number;
  activeCount: number;
  subscriptions: CommerceSubscriptionRow[];
}> {
  const subscriptions = await listSubscriptions(organisationId);
  const active = subscriptions.filter((s) =>
    ACTIVE_MRR_STATUSES.includes(s.status as SubscriptionStatus),
  );
  const mrrCents = active.reduce(
    (sum, s) => sum + amountToMonthlyMrrCents(s.amountCents, s.interval),
    0,
  );
  return { mrrCents, activeCount: active.length, subscriptions };
}

/**
 * Upsert a customer subscription row (Stripe Connect / webhook sync).
 * Does not create Stripe subscriptions — mirrors provider state into Commerce.
 */
export async function upsertCommerceSubscription(input: {
  organisationId: string;
  providerId: string;
  providerSubscriptionId: string;
  status: string;
  amountCents: number;
  currency?: string;
  interval?: string;
  contactId?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelledAt?: Date | null;
  metadata?: Record<string, unknown>;
}): Promise<CommerceSubscriptionRow> {
  const { prisma } = await import("@dg/database");
  return prisma.commerceSubscription.upsert({
    where: {
      organisationId_providerSubscriptionId: {
        organisationId: input.organisationId,
        providerSubscriptionId: input.providerSubscriptionId,
      },
    },
    create: {
      organisationId: input.organisationId,
      contactId: input.contactId ?? null,
      providerId: input.providerId,
      providerSubscriptionId: input.providerSubscriptionId,
      status: input.status,
      currency: (input.currency || "AUD").toUpperCase(),
      amountCents: Math.round(input.amountCents),
      interval: input.interval || "month",
      currentPeriodStart: input.currentPeriodStart ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      cancelledAt: input.cancelledAt ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
    update: {
      contactId: input.contactId ?? undefined,
      status: input.status,
      currency: (input.currency || "AUD").toUpperCase(),
      amountCents: Math.round(input.amountCents),
      interval: input.interval || "month",
      currentPeriodStart: input.currentPeriodStart ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      cancelledAt: input.cancelledAt ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
