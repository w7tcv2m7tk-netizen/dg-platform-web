/**
 * Known AU localities for discovery radius bias when Nominatim is blocked
 * (common from Vercel) or omits a postcode.
 */

export type KnownLocality = {
  suburb: string;
  state: "QLD" | "NSW" | "VIC" | "SA" | "WA" | "TAS" | "NT" | "ACT";
  postcode: string;
  latitude: number;
  longitude: number;
};

const LOCALITIES: Array<{ needles: string[] } & KnownLocality> = [
  {
    needles: ["currumbin valley"],
    suburb: "Currumbin Valley",
    state: "QLD",
    postcode: "4223",
    latitude: -28.137,
    longitude: 153.429,
  },
  {
    needles: ["currumbin waters"],
    suburb: "Currumbin Waters",
    state: "QLD",
    postcode: "4223",
    latitude: -28.154,
    longitude: 153.472,
  },
  {
    needles: ["currumbin"],
    suburb: "Currumbin",
    state: "QLD",
    postcode: "4223",
    latitude: -28.137,
    longitude: 153.48,
  },
  {
    needles: ["tugun"],
    suburb: "Tugun",
    state: "QLD",
    postcode: "4224",
    latitude: -28.143,
    longitude: 153.496,
  },
  {
    needles: ["palm beach"],
    suburb: "Palm Beach",
    state: "QLD",
    postcode: "4221",
    latitude: -28.117,
    longitude: 153.472,
  },
  {
    needles: ["elanora"],
    suburb: "Elanora",
    state: "QLD",
    postcode: "4221",
    latitude: -28.136,
    longitude: 153.45,
  },
  {
    needles: ["coolangatta"],
    suburb: "Coolangatta",
    state: "QLD",
    postcode: "4225",
    latitude: -28.167,
    longitude: 153.534,
  },
  {
    needles: ["burleigh heads", "burleigh"],
    suburb: "Burleigh Heads",
    state: "QLD",
    postcode: "4220",
    latitude: -28.09,
    longitude: 153.455,
  },
  {
    needles: ["gold coast"],
    suburb: "Gold Coast",
    state: "QLD",
    postcode: "4217",
    latitude: -28.017,
    longitude: 153.4,
  },
  {
    needles: ["brisbane"],
    suburb: "Brisbane",
    state: "QLD",
    postcode: "4000",
    latitude: -27.47,
    longitude: 153.026,
  },
];

const STATE_FROM_TEXT: Array<{
  re: RegExp;
  state: KnownLocality["state"];
}> = [
  { re: /queensland|\bqld\b/i, state: "QLD" },
  { re: /new south wales|\bnsw\b/i, state: "NSW" },
  { re: /\bvictoria\b|\bvic\b/i, state: "VIC" },
  { re: /south australia|\bsa\b/i, state: "SA" },
  { re: /western australia|\bwa\b/i, state: "WA" },
  { re: /\btasmania\b|\btas\b/i, state: "TAS" },
  { re: /northern territory|\bnt\b/i, state: "NT" },
  { re: /australian capital|\bact\b/i, state: "ACT" },
];

export function resolveKnownLocality(raw?: string | null): KnownLocality | null {
  const hay = raw?.trim().toLowerCase();
  if (!hay) return null;
  for (const row of LOCALITIES) {
    if (row.needles.some((n) => hay.includes(n))) {
      return {
        suburb: row.suburb,
        state: row.state,
        postcode: row.postcode,
        latitude: row.latitude,
        longitude: row.longitude,
      };
    }
  }
  return null;
}

export function stateCodeFromLocation(raw?: string | null): KnownLocality["state"] | undefined {
  const known = resolveKnownLocality(raw);
  if (known) return known.state;
  const hay = raw?.trim() ?? "";
  if (!hay) return undefined;
  for (const row of STATE_FROM_TEXT) {
    if (row.re.test(hay)) return row.state;
  }
  return undefined;
}

export function postcodeFromLocation(raw?: string | null): string | undefined {
  const known = resolveKnownLocality(raw);
  if (known) return known.postcode;
  const m = raw?.match(/\b(\d{4})\b/);
  return m?.[1];
}
