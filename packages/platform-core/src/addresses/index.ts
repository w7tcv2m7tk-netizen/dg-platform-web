import type { ParsedPropertyAddress } from "../properties/address";
import {
  needsAddressRefinement,
  parsePropertyAddress,
  resolvePropertyAddress,
} from "../properties/address";
import {
  coreLogicCredentialsConfigured,
  coreLogicMatchToAddressMetadata,
  isCoreLogicPropertyMatch,
  matchCoreLogicAddress,
} from "../connectors/corelogic";

export type { ParsedPropertyAddress } from "../properties/address";
export {
  geocodeAustralianAddress,
  isGeocodingConfigured,
} from "../properties/geocode";
export type { GeocodeResult } from "../properties/geocode";
export {
  needsAddressRefinement,
  parsePropertyAddress,
  resolvePropertyAddress,
} from "../properties/address";

export type ResolveAddressOptions = {
  geocode?: boolean;
  forceGeocode?: boolean;
  regionBias?: string;
  /**
   * Optional Cotality Address Match enrichment.
   * - `true` — attempt when credentials configured
   * - `false` — never call CoreLogic
   * - unset — attempt when credentials configured (same as true)
   */
  corelogic?: boolean;
};

export type ResolvedAddressPayload = ParsedPropertyAddress & {
  rawAddress: string;
  formatted: string;
  metadata: Record<string, unknown>;
};

export function formatResolvedAddress(parsed: ParsedPropertyAddress) {
  return `${parsed.addressLine1}, ${parsed.suburb} ${parsed.state} ${parsed.postcode}`;
}

export function addressMetadataFromParsed(
  parsed: ParsedPropertyAddress,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    address_confidence: parsed.confidence,
    ...(parsed.latitude != null ? { latitude: parsed.latitude } : {}),
    ...(parsed.longitude != null ? { longitude: parsed.longitude } : {}),
    ...(parsed.formattedAddress ? { formatted_address: parsed.formattedAddress } : {}),
    ...(parsed.geocodeSource ? { geocode_source: parsed.geocodeSource } : {}),
    ...extra,
  };
}

function applyCoreLogicMatchToParsed(
  parsed: ParsedPropertyAddress,
  matchAddress: {
    streetNumber?: string;
    street?: string;
    locality?: string;
    state?: string;
    postcode?: string;
    singleLine?: string;
    unitNumber?: string;
  },
): ParsedPropertyAddress {
  const lineParts = [
    matchAddress.unitNumber ? `${matchAddress.unitNumber}/` : "",
    matchAddress.streetNumber,
    matchAddress.street,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const next: ParsedPropertyAddress = { ...parsed };
  if (lineParts) next.addressLine1 = lineParts;
  if (matchAddress.locality) next.suburb = matchAddress.locality;
  if (matchAddress.state) next.state = matchAddress.state.toUpperCase();
  if (matchAddress.postcode) next.postcode = matchAddress.postcode;
  if (matchAddress.singleLine) next.formattedAddress = matchAddress.singleLine;
  if (
    next.confidence === "fallback" ||
    next.confidence === "partial" ||
    next.confidence === "inferred"
  ) {
    next.confidence = "full";
  }
  return next;
}

/** Unified address resolver for platform, API, and connector consumers */
export async function resolveAddress(
  rawAddress: string,
  options?: ResolveAddressOptions,
): Promise<ResolvedAddressPayload> {
  let parsed = await resolvePropertyAddress(rawAddress, options);
  let extraMeta: Record<string, unknown> = {};

  const wantCoreLogic = options?.corelogic !== false;
  if (wantCoreLogic && coreLogicCredentialsConfigured()) {
    const matchQuery =
      parsed.confidence === "full" || parsed.confidence === "geocoded"
        ? formatResolvedAddress(parsed)
        : rawAddress.trim();
    try {
      const matched = await matchCoreLogicAddress(matchQuery);
      if (matched.ok && isCoreLogicPropertyMatch(matched.match)) {
        extraMeta = {
          ...extraMeta,
          ...coreLogicMatchToAddressMetadata(matched.match),
        };
        if (matched.match.address) {
          parsed = applyCoreLogicMatchToParsed(parsed, matched.match.address);
        }
      } else if (matched.ok) {
        extraMeta = {
          ...extraMeta,
          corelogic_source: "address_match",
          corelogic_match_type: matched.match.matchType ?? "N",
        };
      } else {
        extraMeta = {
          ...extraMeta,
          corelogic_error: matched.message,
        };
      }
    } catch {
      extraMeta = {
        ...extraMeta,
        corelogic_error: "address_match_failed",
      };
    }
  }

  return {
    ...parsed,
    rawAddress: rawAddress.trim(),
    formatted: formatResolvedAddress(parsed),
    metadata: addressMetadataFromParsed(parsed, extraMeta),
  };
}

export function shouldAutoResolveAddress(rawAddress: string) {
  return needsAddressRefinement(parsePropertyAddress(rawAddress));
}

export function enrichLeadAddressMetadata(
  existing: Record<string, unknown> | null | undefined,
  resolved: ResolvedAddressPayload,
) {
  return {
    ...(existing ?? {}),
    property_address: resolved.rawAddress,
    property_suburb: resolved.suburb,
    property_state: resolved.state,
    property_postcode: resolved.postcode,
    property_formatted: resolved.formatted,
    ...resolved.metadata,
  };
}
