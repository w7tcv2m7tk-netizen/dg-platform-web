import {
  clearPropertyDocument,
  normalizePropertyDocument,
  savePropertyDocument,
  type PropertyDocument,
  type PropertyDocumentKind,
} from "./property-document";

/**
 * Disclosure statement attached to a property.
 * Honesty: presence of `url` means a real file was uploaded — never a bare flag.
 */
export type PropertyDisclosureStatement = PropertyDocument;

export const DISCLOSURE_STATEMENT_KIND: PropertyDocumentKind = {
  metadataKey: "disclosureStatement",
  historyKey: "disclosureStatementHistory",
  defaultFileName: "disclosure-statement.pdf",
  activitySaved: "disclosure_statement_saved",
  activityReplaced: "disclosure_statement_replaced",
  activityCleared: "disclosure_statement_cleared",
  titleSaved: "Disclosure statement saved",
  titleReplaced: "Disclosure statement replaced",
  titleCleared: "Disclosure statement cleared",
};

export function normalizePropertyDisclosureStatement(
  raw: Record<string, unknown> | PropertyDisclosureStatement | null | undefined,
): PropertyDisclosureStatement | undefined {
  return normalizePropertyDocument(raw, DISCLOSURE_STATEMENT_KIND.defaultFileName);
}

export async function savePropertyDisclosureStatement(
  organisationId: string,
  propertyId: string,
  document: PropertyDisclosureStatement,
  actorId?: string,
) {
  return savePropertyDocument(
    organisationId,
    propertyId,
    DISCLOSURE_STATEMENT_KIND,
    document,
    actorId,
  );
}

/** Soft-clear: keep last file on history, remove active disclosure statement. */
export async function clearPropertyDisclosureStatement(
  organisationId: string,
  propertyId: string,
  actorId?: string,
) {
  return clearPropertyDocument(
    organisationId,
    propertyId,
    DISCLOSURE_STATEMENT_KIND,
    actorId,
  );
}
