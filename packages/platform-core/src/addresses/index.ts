import type { ParsedPropertyAddress } from "../properties/address";
import {
  needsAddressRefinement,
  parsePropertyAddress,
  resolvePropertyAddress,
} from "../properties/address";

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

/** Unified address resolver for platform, API, and connector consumers */
export async function resolveAddress(
  rawAddress: string,
  options?: ResolveAddressOptions,
): Promise<ResolvedAddressPayload> {
  const parsed = await resolvePropertyAddress(rawAddress, options);
  return {
    ...parsed,
    rawAddress: rawAddress.trim(),
    formatted: formatResolvedAddress(parsed),
    metadata: addressMetadataFromParsed(parsed),
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
