import { geocodeAustralianAddress } from "../properties/geocode";
import { buildDiscoveryTextQuery } from "./industry-packs";
import { abnLookupProvider } from "./providers/abn-lookup";
import { googlePlacesProvider } from "./providers/google-places";
import type { BusinessDataProvider } from "./providers/types";
import type {
  DiscoveryCandidate,
  DiscoveryProviderStatus,
  DiscoverySearchInput,
  DiscoverySearchResult,
} from "./types";

const PROVIDERS: BusinessDataProvider[] = [googlePlacesProvider, abnLookupProvider];

function providerStatus(p: BusinessDataProvider): DiscoveryProviderStatus {
  const available = p.isConfigured();
  return {
    id: p.id,
    label: p.label,
    available,
    reason: available ? undefined : p.unavailableReason(),
  };
}

function dedupeCandidates(candidates: DiscoveryCandidate[]): DiscoveryCandidate[] {
  const byKey = new Map<string, DiscoveryCandidate>();
  const byPlace = new Map<string, DiscoveryCandidate>();
  const byAbn = new Map<string, DiscoveryCandidate>();
  const byNameLoc = new Map<string, DiscoveryCandidate>();

  for (const c of candidates) {
    if (byKey.has(c.key)) continue;

    const placeId = c.providerRefs.googlePlaceId;
    if (placeId && byPlace.has(placeId)) {
      const existing = byPlace.get(placeId)!;
      byKey.set(existing.key, mergeCandidate(existing, c));
      continue;
    }
    const abn = c.providerRefs.abn;
    if (abn && byAbn.has(abn)) {
      const existing = byAbn.get(abn)!;
      byKey.set(existing.key, mergeCandidate(existing, c));
      continue;
    }

    const nameKey = `${c.businessName.toLowerCase()}|${(c.location ?? "").toLowerCase()}`;
    if (byNameLoc.has(nameKey)) {
      const existing = byNameLoc.get(nameKey)!;
      const merged = mergeCandidate(existing, c);
      byKey.set(existing.key, merged);
      byNameLoc.set(nameKey, merged);
      continue;
    }

    byKey.set(c.key, c);
    if (placeId) byPlace.set(placeId, c);
    if (abn) byAbn.set(abn, c);
    byNameLoc.set(nameKey, c);
  }

  return [...byKey.values()].sort((a, b) => {
    const ratingDelta = (b.rating ?? 0) - (a.rating ?? 0);
    if (ratingDelta !== 0) return ratingDelta;
    return b.confidence - a.confidence;
  });
}

function mergeCandidate(
  a: DiscoveryCandidate,
  b: DiscoveryCandidate,
): DiscoveryCandidate {
  return {
    ...a,
    phone: a.phone || b.phone,
    websiteUrl: a.websiteUrl || b.websiteUrl,
    email: a.email || b.email,
    location: a.location || b.location,
    rating: a.rating ?? b.rating,
    ratingCount: a.ratingCount ?? b.ratingCount,
    industry: a.industry || b.industry,
    businessType: a.businessType || b.businessType,
    providerRefs: { ...b.providerRefs, ...a.providerRefs },
    confidence: Math.max(a.confidence, b.confidence),
  };
}

/** Search configured business-data providers (ephemeral candidates). */
export async function searchBusinessDiscovery(
  input: DiscoverySearchInput,
): Promise<DiscoverySearchResult> {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 40);
  const textQuery = buildDiscoveryTextQuery(input);
  const providers = PROVIDERS.map(providerStatus);
  const warnings: string[] = [];

  if (!PROVIDERS.some((p) => p.isConfigured())) {
    return {
      query: input,
      textQuery,
      candidates: [],
      providers,
      warnings: [
        "No discovery providers configured. Set GOOGLE_PLACES_API_KEY and/or ABN_LOOKUP_GUID.",
      ],
    };
  }

  let latitude: number | undefined;
  let longitude: number | undefined;
  let postcode: string | undefined;
  let stateCode: string | undefined;
  if (input.location?.trim() && input.radiusKm) {
    const geo = await geocodeAustralianAddress(input.location.trim());
    if (geo.ok && geo.address.latitude != null && geo.address.longitude != null) {
      latitude = geo.address.latitude;
      longitude = geo.address.longitude;
      if (/^\d{4}$/.test(geo.address.postcode)) postcode = geo.address.postcode;
      if (/^(QLD|NSW|VIC|SA|WA|TAS|NT|ACT)$/i.test(geo.address.state)) {
        stateCode = geo.address.state.toUpperCase();
      }
    } else {
      warnings.push("Could not geocode location for radius bias — searching by text only.");
    }
  }

  const ctx = {
    textQuery,
    location: input.location?.trim(),
    radiusKm: input.radiusKm,
    latitude,
    longitude,
    postcode,
    stateCode,
    industry: input.industry?.trim(),
    businessType: input.businessType?.trim(),
    limit,
  };

  const batches = await Promise.all(
    PROVIDERS.map(async (provider) => {
      if (!provider.isConfigured()) return [] as DiscoveryCandidate[];
      // Prefer Places for geo discovery; ABR only when query looks name-like or Places missing
      if (provider.id === "abn_lookup") {
        const placesOk = googlePlacesProvider.isConfigured();
        const looksLikeName = Boolean(input.q?.trim()) || !input.location?.trim();
        if (placesOk && input.location?.trim() && !input.q?.trim()) {
          return [];
        }
        if (!looksLikeName && placesOk) return [];
      }
      try {
        return await provider.search(ctx);
      } catch (err) {
        warnings.push(
          `${provider.label}: ${err instanceof Error ? err.message : "search failed"}`,
        );
        return [];
      }
    }),
  );

  const candidates = dedupeCandidates(batches.flat()).slice(0, limit);

  return {
    query: input,
    textQuery,
    candidates,
    providers,
    warnings,
  };
}

export function listDiscoveryProviderStatuses(): DiscoveryProviderStatus[] {
  return PROVIDERS.map(providerStatus);
}
