/**
 * ABR connector types — verify / enrich only (not registration).
 * @see https://abr.business.gov.au/Documentation/WebServiceMethods
 */

export const ABR_CONNECTOR_ID = "abr" as const;

/** Preferred env keys (server-only). Never expose to clients. */
export const ABR_GUID_ENV_KEYS = [
  "ABN_LOOKUP_GUID",
  "ABR_GUID",
  "ABR_AUTHENTICATION_GUID",
] as const;

export type AbrGuidEnvKey = (typeof ABR_GUID_ENV_KEYS)[number];

export type AbrConnectorStatus = "configured" | "not_configured" | "error";

export type AbrLookupMethod = "SearchByABNv202001" | "SearchByASICv201408";

export type AbrBusinessName = {
  organisationName: string;
  effectiveFrom?: string;
  effectiveTo?: string;
};

export type AbrEntityType = {
  code?: string;
  description?: string;
};

export type AbrPhysicalAddress = {
  stateCode?: string;
  postcode?: string;
  country?: string;
};

/** Normalised ABR entity snapshot (provider-neutral fields live in Business Identity). */
export type AbrEntitySnapshot = {
  method: AbrLookupMethod;
  abn?: string;
  abnStatus?: string;
  acn?: string;
  entityStatus?: string;
  entityType?: AbrEntityType;
  legalName?: string;
  tradingNames: string[];
  businessNames: AbrBusinessName[];
  gstRegistered?: boolean;
  gstEffectiveFrom?: string;
  address?: AbrPhysicalAddress;
  retrievedAt: string;
  rawException?: string;
};

export type AbrLookupOk = {
  ok: true;
  entity: AbrEntitySnapshot;
};

export type AbrLookupErr = {
  ok: false;
  code:
    | "not_configured"
    | "invalid_identifier"
    | "not_found"
    | "upstream_error"
    | "auth_failed";
  message: string;
};

export type AbrLookupResult = AbrLookupOk | AbrLookupErr;
