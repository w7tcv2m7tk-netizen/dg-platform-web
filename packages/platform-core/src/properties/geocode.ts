import type { ParsedPropertyAddress } from "./address";

export type GeocodeResult =
  | {
      ok: true;
      address: ParsedPropertyAddress & {
        latitude?: number;
        longitude?: number;
        formattedAddress?: string;
        geocodeSource: "google" | "nominatim";
      };
    }
  | { ok: false; code: "missing_query" | "not_found" | "provider_error"; message: string };

type GoogleGeocodeResponse = {
  status: string;
  results?: Array<{
    formatted_address?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }>;
  error_message?: string;
};

type NominatimResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    postcode?: string;
  };
};

function buildGeocodeQuery(raw: string, regionBias = "Gold Coast, QLD, Australia") {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/australia/i.test(trimmed)) return trimmed;
  if (/\b(QLD|NSW|VIC|SA|WA|TAS|NT|ACT|Queensland|New South Wales)\b/i.test(trimmed)) {
    return `${trimmed}, Australia`;
  }
  return `${trimmed}, ${regionBias}`;
}

type GoogleGeocodeResult = NonNullable<GoogleGeocodeResponse["results"]>[number];

function component(
  components: GoogleGeocodeResult["address_components"],
  type: string,
) {
  return components?.find((c) => c.types.includes(type));
}

function parseGoogleResult(result: GoogleGeocodeResult): Extract<GeocodeResult, { ok: true }>["address"] {
  const components = result.address_components ?? [];
  const streetNumber = component(components, "street_number")?.short_name ?? "";
  const route = component(components, "route")?.long_name ?? "";
  const addressLine1 = [streetNumber, route].filter(Boolean).join(" ").trim();
  const suburb =
    component(components, "locality")?.long_name ??
    component(components, "postal_town")?.long_name ??
    component(components, "sublocality")?.long_name ??
    component(components, "neighborhood")?.long_name ??
    "Gold Coast";
  const state = component(components, "administrative_area_level_1")?.short_name ?? "QLD";
  const postcode = component(components, "postal_code")?.short_name ?? "0000";

  return {
    addressLine1: addressLine1 || result.formatted_address?.split(",")[0]?.trim() || "Address TBC",
    suburb,
    state: state.toUpperCase(),
    postcode,
    confidence: "geocoded",
    latitude: result.geometry?.location?.lat,
    longitude: result.geometry?.location?.lng,
    formattedAddress: result.formatted_address,
    geocodeSource: "google",
  };
}

function parseNominatimResult(result: NominatimResult): Extract<GeocodeResult, { ok: true }>["address"] {
  const addr = result.address ?? {};
  const addressLine1 = [addr.house_number, addr.road].filter(Boolean).join(" ").trim();
  const suburb =
    addr.suburb ?? addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? "Gold Coast";
  const stateMatch = addr.state?.match(/\b(QLD|NSW|VIC|SA|WA|TAS|NT|ACT)\b/i);
  const state = stateMatch?.[1]?.toUpperCase() ?? "QLD";

  return {
    addressLine1: addressLine1 || result.display_name?.split(",")[0]?.trim() || "Address TBC",
    suburb,
    state,
    postcode: addr.postcode ?? "0000",
    confidence: "geocoded",
    latitude: result.lat ? Number(result.lat) : undefined,
    longitude: result.lon ? Number(result.lon) : undefined,
    formattedAddress: result.display_name,
    geocodeSource: "nominatim",
  };
}

async function geocodeWithGoogle(query: string): Promise<GeocodeResult> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, code: "provider_error", message: "Google Geocoding API key not configured" };
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("components", "country:AU");
  url.searchParams.set("region", "au");

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = (await res.json()) as GoogleGeocodeResponse;

    if (!res.ok || data.status === "REQUEST_DENIED" || data.status === "INVALID_REQUEST") {
      return {
        ok: false,
        code: "provider_error",
        message: data.error_message ?? `Google Geocoding returned ${data.status}`,
      };
    }

    if (data.status === "ZERO_RESULTS" || !data.results?.length) {
      return { ok: false, code: "not_found", message: "No matching address found" };
    }

    return { ok: true, address: parseGoogleResult(data.results[0]) };
  } catch {
    return { ok: false, code: "provider_error", message: "Google Geocoding request failed" };
  }
}

/** Southern Gold Coast bounding box — keeps Nominatim results local to Roe */
const GOLD_COAST_VIEWBOX = "153.25,-27.95,153.55,-28.25";

function regionUsesGoldCoastBias(regionBias: string) {
  return /gold coast|currumbin|tugun|palm beach|elanora|coolangatta|qld|queensland/i.test(
    regionBias,
  );
}

async function geocodeWithNominatim(
  query: string,
  raw: string,
  regionBias: string,
): Promise<GeocodeResult> {
  const attempts: URL[] = [];

  const freeText = new URL("https://nominatim.openstreetmap.org/search");
  freeText.searchParams.set("q", query);
  freeText.searchParams.set("format", "json");
  freeText.searchParams.set("addressdetails", "1");
  freeText.searchParams.set("countrycodes", "au");
  freeText.searchParams.set("limit", "1");
  if (regionUsesGoldCoastBias(regionBias)) {
    freeText.searchParams.set("viewbox", GOLD_COAST_VIEWBOX);
    freeText.searchParams.set("bounded", "1");
  }
  attempts.push(freeText);

  if (!raw.includes(",") && regionBias) {
    const city = regionBias.split(",")[0]?.trim() ?? "Gold Coast";
    const structured = new URL("https://nominatim.openstreetmap.org/search");
    structured.searchParams.set("street", raw.trim());
    structured.searchParams.set("city", city);
    structured.searchParams.set("state", "Queensland");
    structured.searchParams.set("country", "Australia");
    structured.searchParams.set("format", "json");
    structured.searchParams.set("addressdetails", "1");
    structured.searchParams.set("limit", "1");
    attempts.push(structured);
  }

  for (const url of attempts) {
    try {
      const res = await fetch(url.toString(), {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": "DigitalGate-Platform/1.0 (support@digitalgate.com.au)",
        },
      });

      if (!res.ok) continue;

      const data = (await res.json()) as NominatimResult[];
      if (!data.length) continue;

      const parsed = parseNominatimResult(data[0]);
      const hasCoords =
        parsed.latitude != null &&
        parsed.longitude != null &&
        Number.isFinite(parsed.latitude) &&
        Number.isFinite(parsed.longitude);
      if (!hasCoords) continue;
      // Suburb lookups often omit postcode (e.g. Currumbin). Accept coords.
      if (!regionUsesGoldCoastBias(regionBias)) {
        return { ok: true, address: parsed };
      }
      if (parsed.postcode.startsWith("4") || parsed.state === "QLD") {
        return { ok: true, address: parsed };
      }
      if (
        parsed.latitude! <= -27.7 &&
        parsed.latitude! >= -28.4 &&
        parsed.longitude! >= 153.1 &&
        parsed.longitude! <= 153.6
      ) {
        return { ok: true, address: parsed };
      }
    } catch {
      continue;
    }
  }

  return { ok: false, code: "not_found", message: "No matching address found" };
}

/** Geocode an Australian address — Google if configured, else OpenStreetMap Nominatim */
export async function geocodeAustralianAddress(
  raw: string,
  regionBias = "Gold Coast, QLD, Australia",
): Promise<GeocodeResult> {
  const query = buildGeocodeQuery(raw, regionBias);
  if (!query) {
    return { ok: false, code: "missing_query", message: "Address query is empty" };
  }

  if (process.env.GOOGLE_GEOCODING_API_KEY?.trim()) {
    const google = await geocodeWithGoogle(query);
    if (google.ok) return google;
  }

  return geocodeWithNominatim(query, raw.trim(), regionBias);
}

export function isGeocodingConfigured() {
  return {
    google: Boolean(process.env.GOOGLE_GEOCODING_API_KEY?.trim()),
    nominatim: true,
  };
}
