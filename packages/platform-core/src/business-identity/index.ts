/**
 * Business Identity Service — Core orchestration over registry connectors.
 */

import {
  abrCredentialsConfigured,
  searchByAbn,
  searchByAcn,
  type AbrLookupResult,
} from "../connectors/abr";
import {
  abrEntityToBusinessProfilePatch,
  identityFromAbr,
  type BusinessIdentityRecord,
} from "./types";
import type { BusinessProfilePatch } from "../org/business-profile-types";

export * from "./types";

export type BusinessIdentityLookupResponse = {
  configured: boolean;
  identity: BusinessIdentityRecord | null;
  profilePatch: BusinessProfilePatch | null;
  abr: AbrLookupResult;
};

async function toLookupResponse(
  abr: AbrLookupResult,
  organisationId?: string,
): Promise<BusinessIdentityLookupResponse> {
  if (!abr.ok) {
    return {
      configured: abrCredentialsConfigured(),
      identity: null,
      profilePatch: null,
      abr,
    };
  }
  const identity = identityFromAbr(abr.entity, organisationId);
  return {
    configured: true,
    identity,
    profilePatch: abrEntityToBusinessProfilePatch(abr.entity),
    abr,
  };
}

/** Lookup by ABN via ABR SearchByABNv202001 → Business Identity record. */
export async function lookupBusinessIdentityByAbn(
  abn: string,
  organisationId?: string,
): Promise<BusinessIdentityLookupResponse> {
  if (!abrCredentialsConfigured()) {
    return {
      configured: false,
      identity: null,
      profilePatch: null,
      abr: {
        ok: false,
        code: "not_configured",
        message:
          "ABR GUID not configured. Paste ABN_LOOKUP_GUID (or ABR_GUID) into server .env.local.",
      },
    };
  }
  const abr = await searchByAbn(abn);
  return toLookupResponse(abr, organisationId);
}

/** Lookup by ACN via ABR SearchByASICv201408 → Business Identity record. */
export async function lookupBusinessIdentityByAcn(
  acn: string,
  organisationId?: string,
): Promise<BusinessIdentityLookupResponse> {
  if (!abrCredentialsConfigured()) {
    return {
      configured: false,
      identity: null,
      profilePatch: null,
      abr: {
        ok: false,
        code: "not_configured",
        message:
          "ABR GUID not configured. Paste ABN_LOOKUP_GUID (or ABR_GUID) into server .env.local.",
      },
    };
  }
  const abr = await searchByAcn(acn);
  return toLookupResponse(abr, organisationId);
}
