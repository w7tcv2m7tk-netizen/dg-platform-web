import type { Prisma } from "@dg/database";

import { updateBuyerLeadStage, updateLeadStage, type VendorStage } from "../leads";

export type ReOfferStatus =
  | "draft"
  | "submitted"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface ReOffer {
  id: string;
  buyerLeadId?: string;
  buyerName?: string;
  amountCents: number;
  currency: string;
  status: ReOfferStatus;
  conditions?: string;
  submittedAt?: string;
  acceptedAt?: string;
  createdAt: string;
}

function parseOffers(metadata: Record<string, unknown> | null | undefined): ReOffer[] {
  const raw = metadata?.offers;
  if (!Array.isArray(raw)) return [];
  return raw as ReOffer[];
}

export async function listPropertyOffers(organisationId: string, propertyId: string) {
  const { prisma } = await import("@dg/database");
  const property = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!property) return null;
  const metadata = (property.metadata as Record<string, unknown> | null) ?? {};
  return parseOffers(metadata);
}

export async function createPropertyOffer(
  organisationId: string,
  propertyId: string,
  input: {
    buyerLeadId?: string;
    buyerName?: string;
    amountCents: number;
    currency?: string;
    conditions?: string;
    actorId?: string;
  },
) {
  const { prisma } = await import("@dg/database");

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!property) return null;

  const metadata = (property.metadata as Record<string, unknown> | null) ?? {};
  const offers = parseOffers(metadata);
  const offer: ReOffer = {
    id: `offer_${Date.now()}`,
    buyerLeadId: input.buyerLeadId,
    buyerName: input.buyerName,
    amountCents: input.amountCents,
    currency: input.currency ?? "AUD",
    status: "submitted",
    conditions: input.conditions,
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  offers.unshift(offer);

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      metadata: { ...metadata, offers } as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId,
      entityType: "Property",
      entityId: propertyId,
      activityType: "offer_submitted",
      title: "Offer submitted",
      body: `$${(input.amountCents / 100).toLocaleString("en-AU")}`,
      sourceApp: "real-estate",
      createdBy: input.actorId,
      metadata: { offerId: offer.id } as Prisma.InputJsonValue,
    },
  });

  return offer;
}

export async function updatePropertyOfferStatus(
  organisationId: string,
  propertyId: string,
  offerId: string,
  status: ReOfferStatus,
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!property) return null;

  const metadata = (property.metadata as Record<string, unknown> | null) ?? {};
  const offers = parseOffers(metadata);
  const index = offers.findIndex((o) => o.id === offerId);
  if (index < 0) return null;

  const offer = { ...offers[index], status };
  if (status === "accepted") {
    offer.acceptedAt = new Date().toISOString();
  }
  offers[index] = offer;

  if (status === "accepted") {
    if (property.leadId) {
      await updateLeadStage(
        organisationId,
        property.leadId,
        "sale" as VendorStage,
        actorId,
        { skipPropertySync: true },
      );
    }

    if (offer.buyerLeadId) {
      await updateBuyerLeadStage(organisationId, offer.buyerLeadId, "offer", actorId);
    }

    const checklist = (metadata.settlement_checklist as Record<string, boolean> | undefined) ?? {};
    const prevContract =
      (metadata.contract as PropertyContract | Record<string, unknown> | undefined) ?? {};

    await prisma.property.update({
      where: { id: propertyId },
      data: {
        status: "under_offer",
        listingPriceCents: offer.amountCents,
        metadata: {
          ...metadata,
          offers,
          accepted_offer_id: offerId,
          // camelCase matches PropertyContract / UI readers
          contract: {
            ...prevContract,
            purchasePriceCents: offer.amountCents,
            buyerLeadId: offer.buyerLeadId,
            buyerName: offer.buyerName,
          },
          settlement_checklist: checklist,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  } else {
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        metadata: { ...metadata, offers } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  await prisma.activity.create({
    data: {
      organisationId,
      entityType: "Property",
      entityId: propertyId,
      activityType: "offer_status",
      title: `Offer ${status.replace(/_/g, " ")}`,
      sourceApp: "real-estate",
      createdBy: actorId,
      metadata: { offerId, status } as Prisma.InputJsonValue,
    },
  });

  return offer;
}

export interface PropertyContract {
  signedAt?: string;
  settlementDate?: string;
  purchasePriceCents?: number;
  buyerLeadId?: string;
  buyerName?: string;
  specialConditions?: string;
}

/** Normalize legacy snake_case contract keys written by older accept-offer paths. */
export function normalizePropertyContract(
  raw: Record<string, unknown> | PropertyContract | null | undefined,
): PropertyContract | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const purchasePriceCents =
    typeof r.purchasePriceCents === "number"
      ? r.purchasePriceCents
      : typeof r.purchase_price_cents === "number"
        ? r.purchase_price_cents
        : undefined;
  const buyerLeadId =
    typeof r.buyerLeadId === "string"
      ? r.buyerLeadId
      : typeof r.buyer_lead_id === "string"
        ? r.buyer_lead_id
        : undefined;
  const buyerName =
    typeof r.buyerName === "string"
      ? r.buyerName
      : typeof r.buyer_name === "string"
        ? r.buyer_name
        : undefined;
  const signedAt = typeof r.signedAt === "string" ? r.signedAt : undefined;
  const settlementDate =
    typeof r.settlementDate === "string"
      ? r.settlementDate
      : typeof r.settlement_date === "string"
        ? r.settlement_date
        : undefined;
  const specialConditions =
    typeof r.specialConditions === "string"
      ? r.specialConditions
      : typeof r.special_conditions === "string"
        ? r.special_conditions
        : undefined;

  if (
    purchasePriceCents == null &&
    !buyerLeadId &&
    !buyerName &&
    !signedAt &&
    !settlementDate &&
    !specialConditions
  ) {
    return undefined;
  }

  return {
    signedAt,
    settlementDate,
    purchasePriceCents,
    buyerLeadId,
    buyerName,
    specialConditions,
  };
}

export async function updatePropertyContract(
  organisationId: string,
  propertyId: string,
  contract: PropertyContract,
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!property) return null;

  const metadata = (property.metadata as Record<string, unknown> | null) ?? {};
  const checklist = (metadata.settlement_checklist as Record<string, boolean> | undefined) ?? {};

  if (contract.signedAt) {
    checklist.contract_signed = true;
  }

  const updated = await prisma.property.update({
    where: { id: propertyId },
    data: {
      metadata: {
        ...metadata,
        contract: { ...(metadata.contract as object | undefined), ...contract },
        settlement_checklist: checklist,
      } as Prisma.InputJsonValue,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId,
      entityType: "Property",
      entityId: propertyId,
      activityType: "contract_updated",
      title: contract.signedAt ? "Contract signed" : "Contract updated",
      sourceApp: "real-estate",
      createdBy: actorId,
    },
  });

  return updated;
}
