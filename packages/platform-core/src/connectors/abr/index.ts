/**
 * ABR connector — Business Services (verify / enrich only).
 * Not business-name registration. Shares GUID with Business Discovery.
 *
 * Env (server-only, never client): ABN_LOOKUP_GUID | ABR_GUID | ABR_AUTHENTICATION_GUID
 *
 * Methods: SearchByABNv202001, SearchByASICv201408
 *
 * @see docs/foundations/BUSINESS-SETUP.md
 * @see https://abr.business.gov.au/Documentation/WebServiceMethods
 */

export {
  ABR_CONNECTOR_ID,
  ABR_GUID_ENV_KEYS,
  type AbrBusinessName,
  type AbrConnectorStatus,
  type AbrEntitySnapshot,
  type AbrEntityType,
  type AbrGuidEnvKey,
  type AbrLookupErr,
  type AbrLookupMethod,
  type AbrLookupOk,
  type AbrLookupResult,
  type AbrPhysicalAddress,
} from "./types";

export {
  abrCredentialsConfigured,
  abrGuidEnvKeyPresent,
  isValidAbnFormat,
  isValidAcnFormat,
  normalizeAbn,
  normalizeAcn,
  resolveAbrGuid,
  searchByAbn,
  searchByAcn,
  verifyAbn,
} from "./client";

import {
  abrCredentialsConfigured,
  searchByAbn,
} from "./client";
import type { AbrConnectorStatus, AbrLookupResult } from "./types";

export type AbrVerifyRequest = { abn: string };

/** @deprecated Prefer AbrLookupResult */
export type AbrVerifyResult = AbrLookupResult;

export function getAbrConnectorStatus(): AbrConnectorStatus {
  return abrCredentialsConfigured() ? "configured" : "not_configured";
}

/** Verify ABN via SearchByABNv202001 when GUID is configured. */
export async function verifyAbnForBusinessSetup(
  req: AbrVerifyRequest,
): Promise<AbrLookupResult> {
  return searchByAbn(req.abn);
}
