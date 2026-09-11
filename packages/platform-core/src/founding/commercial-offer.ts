import { createActivity } from "../activities";
import {
  parseNegotiatedCommercialOffer,
  setOrganisationCommercialOffer,
  type NegotiatedCommercialOffer,
} from "../billing/commercial-offer";
import { isFoundingPipeline, normaliseFoundingStage } from "./pipeline";
import type { FoundingOpportunityMeta } from "./types";

function asMeta(value: unknown): FoundingOpportunityMeta {
  if (!value || typeof value !== "object") return {};
  return value as FoundingOpportunityMeta;
}

export function foundingCommercialOfferFromMetadata(value: unknown): NegotiatedCommercialOffer | null {
  return parseNegotiatedCommercialOffer(asMeta(value).commercial_offer);
}

export function foundingCommercialOfferLocked(input: {
  stage?: string | null;
  metadata?: unknown;
}): boolean {
  const meta = asMeta(input.metadata);
  if (meta.agreement_signed_at) return true;
  const stage = normaliseFoundingStage(input.stage ?? "identified");
  return [
    "agreement_signed",
    "onboarding_invited",
    "onboarding_started",
    "onboarding_complete",
    "configuration",
    "implementation",
    "go_live",
    "thirty_day_review",
  ].includes(stage);
}

export async function setFoundingCommercialOffer(input: {
  organisationId: string;
  opportunityId: string;
  actorId?: string;
  offer: NegotiatedCommercialOffer;
}): Promise<NegotiatedCommercialOffer> {
  const offer = parseNegotiatedCommercialOffer(input.offer);
  if (!offer) throw new Error("Invalid negotiated commercial offer");
  const { prisma } = await import("@dg/database");
  const row = await prisma.opportunity.findFirst({
    where: { id: input.opportunityId, organisationId: input.organisationId },
    select: { id: true, pipelineId: true, stage: true, metadata: true },
  });
  if (!row || !isFoundingPipeline(row.pipelineId)) throw new Error("Founding opportunity not found");
  if (foundingCommercialOfferLocked({ stage: row.stage, metadata: row.metadata })) {
    throw new Error("Commercial terms are locked because the agreement has already been signed.");
  }
  const meta = asMeta(row.metadata);
  await prisma.opportunity.update({
    where: { id: row.id },
    data: {
      metadata: {
        ...meta,
        commercial_offer: offer,
      } as import("@dg/database").Prisma.InputJsonValue,
    },
  });
  await createActivity({
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "Opportunity",
    entityId: row.id,
    activityType: "founding_commercial_offer_set",
    title: "Negotiated commercial offer set",
    body: `${offer.label} · A$${(offer.amountCents / 100).toLocaleString("en-AU")} ${offer.cadence}`,
    sourceApp: "founding",
  });
  return offer;
}

export async function applyFoundingCommercialOfferToCustomer(input: {
  customerOrganisationId: string;
  opportunityMetadata: unknown;
}): Promise<NegotiatedCommercialOffer | null> {
  const offer = foundingCommercialOfferFromMetadata(input.opportunityMetadata);
  if (!offer) return null;
  return setOrganisationCommercialOffer({
    organisationId: input.customerOrganisationId,
    offer,
  });
}
