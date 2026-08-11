/**
 * Cotality Address Match — resolve free-text AU address → propertyId.
 *
 * GET {searchBase}/au/matcher/address?q=...&clientName=...&matchProfileId=1
 *
 * Sandbox Postman: Search API / Address Matcher / Address Matcher AU
 * Recommended address format:
 *   [unitNumber] / [streetNumber] [streetName] [streetType] [suburb] [stateCode] [postcode]
 */

import {
  coreLogicApiGet,
  ensureCoreLogicAccessToken,
  getCoreLogicOAuthConfig,
} from "./auth";

export type CoreLogicMatchType =
  | "E" // Exact
  | "A" // Alias
  | "P" // Partial
  | "F" // Fuzzy
  | "B" // Building
  | "S" // Street
  | "X" // Postal
  | "D" // Duplicate
  | "M" // Unmatched (sandbox Address Match)
  | "N" // Non-match
  | (string & {});

export type CoreLogicAddressMatchResult = {
  propertyId?: number | string;
  matchType?: CoreLogicMatchType;
  matchRule?: string | number;
  /** Best-effort normalised address fields from the response (when present). */
  address?: {
    unitNumber?: string;
    streetNumber?: string;
    street?: string;
    locality?: string;
    state?: string;
    postcode?: string;
    singleLine?: string;
  };
  raw: unknown;
};

export type CoreLogicAddressMatchOptions = {
  /** Override Address Match clientName query (defaults to CORELOGIC_CLIENT_NAME). */
  clientName?: string;
  matchProfileId?: string | number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

function pickId(obj: Record<string, unknown>): number | string | undefined {
  for (const key of ["propertyId", "property_id", "id"]) {
    const v = obj[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/** Normalise Cotality Address Match payloads (shape varies slightly by API version). */
export function parseCoreLogicAddressMatchResponse(
  data: unknown,
): CoreLogicAddressMatchResult {
  const root = asRecord(data);
  // Live sandbox Search Address Match returns { matchDetails: { propertyId, matchType, matchRule, ... } }
  const candidate =
    root &&
    (asRecord(root.matchDetails) ||
      asRecord(root.match_details) ||
      asRecord(root.match) ||
      asRecord(root.result) ||
      asRecord(root.data) ||
      (Array.isArray(root.matches) ? asRecord(root.matches[0]) : null) ||
      root);

  if (!candidate) {
    return { raw: data };
  }

  const addressBlob =
    asRecord(candidate.address) ||
    asRecord(candidate.propertyAddress) ||
    asRecord(candidate.matchedAddress) ||
    asRecord(root?.address) ||
    null;

  return {
    propertyId: pickId(candidate) ?? (root ? pickId(root) : undefined),
    matchType: pickString(candidate, ["matchType", "match_type", "matchCode"]) as
      | CoreLogicMatchType
      | undefined,
    matchRule: pickString(candidate, ["matchRule", "match_rule", "matchRuleId"]),
    address: addressBlob
      ? {
          unitNumber: pickString(addressBlob, ["unitNumber", "unit", "unitNo"]),
          streetNumber: pickString(addressBlob, ["streetNumber", "streetNo", "houseNumber"]),
          street: pickString(addressBlob, ["street", "streetName", "road"]),
          locality: pickString(addressBlob, ["locality", "suburb", "town"]),
          state: pickString(addressBlob, ["state", "stateCode"]),
          postcode: pickString(addressBlob, ["postcode", "postCode", "postalCode"]),
          singleLine: pickString(addressBlob, [
            "singleLine",
            "fullAddress",
            "formatted",
            "display",
          ]),
        }
      : undefined,
    raw: data,
  };
}

export function isCoreLogicPropertyMatch(
  result: CoreLogicAddressMatchResult,
): boolean {
  if (result.propertyId == null || result.propertyId === "") return false;
  const t = (result.matchType || "").toUpperCase();
  // Documented non-match. Sandbox unmatched responses use "M" without a propertyId
  // (already filtered above); do not reject when an id is present.
  if (t === "N") return false;
  return true;
}

/**
 * Call Address Match. Returns structured result; does not throw on HTTP errors
 * (caller decides how to degrade).
 */
export async function matchCoreLogicAddress(
  address: string,
  options?: CoreLogicAddressMatchOptions,
): Promise<
  | { ok: true; match: CoreLogicAddressMatchResult }
  | { ok: false; status: number; message: string; data?: unknown }
> {
  const q = address.trim();
  if (!q) {
    return { ok: false, status: 422, message: "address is required" };
  }

  const cfg = getCoreLogicOAuthConfig();
  if (!cfg.ok) return { ok: false, status: 503, message: cfg.message };

  const token = await ensureCoreLogicAccessToken();
  if (!token.ok) {
    return { ok: false, status: token.status, message: token.message };
  }

  const params = new URLSearchParams();
  params.set("q", q);
  params.set("clientName", options?.clientName?.trim() || cfg.config.clientName);
  const profile = options?.matchProfileId ?? process.env.CORELOGIC_MATCH_PROFILE_ID?.trim();
  if (profile != null && String(profile).length > 0) {
    params.set("matchProfileId", String(profile));
  } else {
    params.set("matchProfileId", "1");
  }

  const path = `/au/matcher/address?${params.toString()}`;
  const res = await coreLogicApiGet(path, token.accessToken, { base: "search" });
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: res.message,
      data: res.data,
    };
  }

  return { ok: true, match: parseCoreLogicAddressMatchResponse(res.data) };
}

/** Metadata keys safe to merge into address resolve payloads (no full raw dump). */
export function coreLogicMatchToAddressMetadata(
  match: CoreLogicAddressMatchResult,
): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    corelogic_source: "address_match",
  };
  if (match.propertyId != null) meta.corelogic_property_id = match.propertyId;
  if (match.matchType) meta.corelogic_match_type = match.matchType;
  if (match.matchRule != null) meta.corelogic_match_rule = match.matchRule;
  if (match.address?.singleLine) {
    meta.corelogic_matched_address = match.address.singleLine;
  }
  return meta;
}
