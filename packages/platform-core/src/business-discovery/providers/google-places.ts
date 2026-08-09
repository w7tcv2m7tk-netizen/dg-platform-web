import type { DiscoveryCandidate } from "../types";
import { candidateKey, type BusinessDataProvider, type ProviderSearchContext } from "./types";

type PlacesSearchResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    types?: string[];
  }>;
  error?: { message?: string; status?: string };
};

function placesApiKey(): string | undefined {
  return (
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.GOOGLE_GEOCODING_API_KEY?.trim() ||
    undefined
  );
}

/**
 * Google Places Text Search (New).
 * Persist only place_id (+ user-selected contact fields on import) — never a Places dump DB.
 */
export const googlePlacesProvider: BusinessDataProvider = {
  id: "google_places",
  label: "Google Places",
  isConfigured() {
    return Boolean(placesApiKey());
  },
  unavailableReason() {
    if (placesApiKey()) return undefined;
    return "Set GOOGLE_PLACES_API_KEY (or GOOGLE_GEOCODING_API_KEY with Places API enabled)";
  },
  async search(ctx: ProviderSearchContext): Promise<DiscoveryCandidate[]> {
    const apiKey = placesApiKey();
    if (!apiKey) return [];

    const body: Record<string, unknown> = {
      textQuery: ctx.textQuery,
      maxResultCount: Math.min(Math.max(ctx.limit, 1), 20),
      languageCode: "en",
      regionCode: "AU",
    };

    if (
      typeof ctx.latitude === "number" &&
      typeof ctx.longitude === "number" &&
      ctx.radiusKm
    ) {
      body.locationBias = {
        circle: {
          center: { latitude: ctx.latitude, longitude: ctx.longitude },
          radius: ctx.radiusKm * 1000,
        },
      };
    }

    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri,places.types",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    const json = (await res.json().catch(() => null)) as PlacesSearchResponse | null;
    if (!res.ok) {
      const msg =
        json && typeof json === "object" && "error" in json
          ? String((json as { error?: { message?: string } }).error?.message ?? res.status)
          : `Places HTTP ${res.status}`;
      throw new Error(msg);
    }

    const places = json?.places ?? [];
    return places
      .map((place): DiscoveryCandidate | null => {
        const placeId = place.id?.replace(/^places\//, "") || place.id;
        if (!placeId || !place.displayName?.text) return null;
        return {
          key: candidateKey("google_places", placeId),
          provider: "google_places",
          externalId: placeId,
          businessName: place.displayName.text.trim(),
          location: place.formattedAddress?.trim() || ctx.location,
          phone:
            place.nationalPhoneNumber?.trim() ||
            place.internationalPhoneNumber?.trim() ||
            undefined,
          websiteUrl: place.websiteUri?.trim() || undefined,
          rating: typeof place.rating === "number" ? place.rating : undefined,
          ratingCount:
            typeof place.userRatingCount === "number" ? place.userRatingCount : undefined,
          businessType: place.types?.[0]?.replace(/_/g, " "),
          providerRefs: {
            googlePlaceId: placeId,
            mapsUri: place.googleMapsUri,
          },
          confidence: 0.85,
        };
      })
      .filter((c): c is DiscoveryCandidate => Boolean(c));
  },
};
