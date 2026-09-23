import type { CustomCommercialOffer } from "../billing/commercial-offer";
import { parseCustomCommercialOffer } from "../billing/commercial-offer";
import type { FoundingOpportunityMeta } from "./types";

/**
 * Legacy compatibility only.
 * Founding 10 no longer creates, applies or owns custom pricing.
 * Existing historical metadata can still be read during migration/audit.
 */
function asMeta(value: unknown): FoundingOpportunityMeta {
  if (!value || typeof value !== "object") return {};
  return value as FoundingOpportunityMeta;
}

export function foundingCommercialOfferFromMetadata(value: unknown): CustomCommercialOffer | null {
  return parseCustomCommercialOffer(asMeta(value).commercial_offer);
}

export function foundingCommercialOfferLocked(): boolean {
  return true;
}

export async function setFoundingCommercialOffer(): Promise<never> {
  throw new Error("Founding 10 pricing is no longer editable here. Use the general Custom Pricing offer on the CRM opportunity.");
}

export async function applyFoundingCommercialOfferToCustomer(): Promise<null> {
  return null;
}
