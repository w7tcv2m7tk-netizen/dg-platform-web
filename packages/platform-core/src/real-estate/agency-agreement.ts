import {
  clearPropertyDocument,
  normalizePropertyDocument,
  savePropertyDocument,
  type PropertyDocument,
  type PropertyDocumentKind,
} from "./property-document";

/**
 * Signed agency / listing authority agreement attached to a property.
 * Honesty: presence of `url` means a real file was uploaded — never a bare signed flag.
 */
export type PropertyAgencyAgreement = PropertyDocument;

export const AGENCY_AGREEMENT_KIND: PropertyDocumentKind = {
  metadataKey: "agencyAgreement",
  historyKey: "agencyAgreementHistory",
  defaultFileName: "agency-agreement.pdf",
  activitySaved: "agency_agreement_saved",
  activityReplaced: "agency_agreement_replaced",
  activityCleared: "agency_agreement_cleared",
  titleSaved: "Agency agreement saved",
  titleReplaced: "Agency agreement replaced",
  titleCleared: "Agency agreement cleared",
};

export function normalizePropertyAgencyAgreement(
  raw: Record<string, unknown> | PropertyAgencyAgreement | null | undefined,
): PropertyAgencyAgreement | undefined {
  return normalizePropertyDocument(raw, AGENCY_AGREEMENT_KIND.defaultFileName);
}

export async function savePropertyAgencyAgreement(
  organisationId: string,
  propertyId: string,
  agreement: PropertyAgencyAgreement,
  actorId?: string,
) {
  return savePropertyDocument(
    organisationId,
    propertyId,
    AGENCY_AGREEMENT_KIND,
    agreement,
    actorId,
  );
}

/** Soft-clear: keep last file on history, remove active agreement. */
export async function clearPropertyAgencyAgreement(
  organisationId: string,
  propertyId: string,
  actorId?: string,
) {
  return clearPropertyDocument(
    organisationId,
    propertyId,
    AGENCY_AGREEMENT_KIND,
    actorId,
  );
}
