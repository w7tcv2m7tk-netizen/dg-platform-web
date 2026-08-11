/**
 * Business Identity Service — Core orchestration over registry connectors.
 */

import { abnLookupProvider } from "../business-discovery/providers/abn-lookup";
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

export type BusinessIdentityNameMatch = {
  abn: string;
  businessName: string;
  location?: string;
};

export type BusinessIdentityNameSearchResponse = {
  configured: boolean;
  query: string;
  matches: BusinessIdentityNameMatch[];
  /** Honest note — name search lists entities; it is not ASIC availability */
  note: string;
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

/**
 * Name search via ABR ABRSearchByNameAdvancedSimpleProtocol2017 (Discovery adapter).
 * Returns shortlist candidates — never invents ASIC name availability.
 */
export async function searchBusinessIdentityByName(
  query: string,
  limit = 10,
): Promise<BusinessIdentityNameSearchResponse> {
  const trimmed = query.trim();
  const note =
    "Matches existing ABR entities only — not business-name availability or registration.";

  if (!abrCredentialsConfigured()) {
    return { configured: false, query: trimmed, matches: [], note };
  }
  if (trimmed.length < 3) {
    return { configured: true, query: trimmed, matches: [], note };
  }

  const candidates = await abnLookupProvider.search({
    textQuery: trimmed,
    limit: Math.min(Math.max(limit, 1), 20),
  });

  const matches: BusinessIdentityNameMatch[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    const abn = c.providerRefs.abn?.replace(/\s+/g, "") ?? c.externalId;
    if (!abn || seen.has(abn)) continue;
    seen.add(abn);
    matches.push({
      abn,
      businessName: c.businessName,
      location: c.location,
    });
  }

  return { configured: true, query: trimmed, matches, note };
}
