export type ParsedPropertyAddress = {
  addressLine1: string;
  suburb: string;
  state: string;
  postcode: string;
  confidence: "full" | "partial" | "inferred" | "fallback";
};

/** Roe / southern Gold Coast suburbs — longest match wins */
const GOLD_COAST_SUBURB_HINTS: Array<{
  suburb: string;
  postcode: string;
  pattern: RegExp;
}> = [
  { suburb: "Currumbin Valley", postcode: "4223", pattern: /\bcurrumbin valley\b/i },
  { suburb: "Currumbin Waters", postcode: "4223", pattern: /\bcurrumbin waters\b/i },
  { suburb: "Currumbin", postcode: "4223", pattern: /\bcurrumbin\b/i },
  { suburb: "Tallebudgera", postcode: "4228", pattern: /\btallebudgera\b/i },
  { suburb: "Palm Beach", postcode: "4221", pattern: /\bpalm beach\b/i },
  { suburb: "Elanora", postcode: "4221", pattern: /\belanora\b/i },
  { suburb: "Tugun", postcode: "4224", pattern: /\btugun\b/i },
  { suburb: "Coolangatta", postcode: "4225", pattern: /\bcoolangatta\b/i },
  { suburb: "Bilinga", postcode: "4225", pattern: /\bbilinga\b/i },
  { suburb: "Burleigh Heads", postcode: "4220", pattern: /\bburleigh heads\b/i },
  { suburb: "Burleigh", postcode: "4220", pattern: /\bburleigh\b/i },
  { suburb: "Mermaid Beach", postcode: "4218", pattern: /\bmermaid beach\b/i },
  { suburb: "Robina", postcode: "4226", pattern: /\brobina\b/i },
];

/** Streets Roe commonly works with — street-only WP vendor leads */
const ROE_STREET_LOCATIONS: Record<
  string,
  { suburb: string; state: string; postcode: string }
> = {
  "kianga court": { suburb: "Currumbin Valley", state: "QLD", postcode: "4223" },
  "dinjirra court": { suburb: "Tugun", state: "QLD", postcode: "4224" },
  "currumbin chase": { suburb: "Currumbin", state: "QLD", postcode: "4223" },
};

const AU_STATES = "QLD|NSW|VIC|SA|WA|TAS|NT|ACT";

function normalizeStreetKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function inferFromStreetName(addressLine1: string): ParsedPropertyAddress | null {
  const normalized = normalizeStreetKey(addressLine1);
  for (const [street, location] of Object.entries(ROE_STREET_LOCATIONS)) {
    if (normalized === street || normalized.endsWith(` ${street}`)) {
      return {
        addressLine1: addressLine1.trim(),
        suburb: location.suburb,
        state: location.state,
        postcode: location.postcode,
        confidence: "inferred",
      };
    }
  }
  return null;
}

function inferFromSuburbHint(addressLine1: string): ParsedPropertyAddress | null {
  for (const hint of GOLD_COAST_SUBURB_HINTS) {
    if (hint.pattern.test(addressLine1)) {
      return {
        addressLine1: addressLine1.trim(),
        suburb: hint.suburb,
        state: "QLD",
        postcode: hint.postcode,
        confidence: "inferred",
      };
    }
  }
  return null;
}

/** Parse Roe / AU vendor lead addresses into property fields */
export function parsePropertyAddress(raw: string): ParsedPropertyAddress {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      addressLine1: "Address TBC",
      suburb: "Gold Coast",
      state: "QLD",
      postcode: "0000",
      confidence: "fallback",
    };
  }

  const fullMatch = trimmed.match(
    new RegExp(`^(.+?),\\s*(.+?)\\s+(${AU_STATES})\\s+(\\d{4})$`, "i"),
  );
  if (fullMatch) {
    return {
      addressLine1: fullMatch[1].trim(),
      suburb: fullMatch[2].trim(),
      state: fullMatch[3].toUpperCase(),
      postcode: fullMatch[4],
      confidence: "full",
    };
  }

  const streetStatePostcode = trimmed.match(
    new RegExp(`^(.+?)\\s+(${AU_STATES})\\s+(\\d{4})$`, "i"),
  );
  if (streetStatePostcode) {
    const line1 = streetStatePostcode[1].trim();
    const fromStreet = inferFromStreetName(line1) ?? inferFromSuburbHint(line1);
    return {
      addressLine1: line1,
      suburb: fromStreet?.suburb ?? "Gold Coast",
      state: streetStatePostcode[2].toUpperCase(),
      postcode: streetStatePostcode[3],
      confidence: fromStreet ? "partial" : "partial",
    };
  }

  const streetSuburbState = trimmed.match(
    new RegExp(`^(.+?),\\s*(.+?)\\s+(${AU_STATES})$`, "i"),
  );
  if (streetSuburbState) {
    const suburbHint = inferFromSuburbHint(streetSuburbState[2]);
    return {
      addressLine1: streetSuburbState[1].trim(),
      suburb: streetSuburbState[2].trim(),
      state: streetSuburbState[3].toUpperCase(),
      postcode: suburbHint?.postcode ?? "0000",
      confidence: "partial",
    };
  }

  const streetSuburb = trimmed.match(/^(.+?),\s*(.+)$/);
  if (streetSuburb) {
    const suburbHint = inferFromSuburbHint(streetSuburb[2]);
    return {
      addressLine1: streetSuburb[1].trim(),
      suburb: streetSuburb[2].trim(),
      state: "QLD",
      postcode: suburbHint?.postcode ?? "0000",
      confidence: "partial",
    };
  }

  const fromStreet = inferFromStreetName(trimmed);
  if (fromStreet) return fromStreet;

  const fromSuburb = inferFromSuburbHint(trimmed);
  if (fromSuburb) return fromSuburb;

  return {
    addressLine1: trimmed,
    suburb: "Gold Coast",
    state: "QLD",
    postcode: "0000",
    confidence: "fallback",
  };
}

export function needsAddressRefinement(parsed: ParsedPropertyAddress) {
  return (
    parsed.confidence === "fallback" ||
    parsed.suburb === "Unknown" ||
    parsed.suburb === "Gold Coast" ||
    parsed.postcode === "0000"
  );
}
