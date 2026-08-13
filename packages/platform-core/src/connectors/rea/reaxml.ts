/**
 * Pure REAXML builder (no network / auth) — unit-testable.
 *
 * Residential (sale) is the supported path for Roe Realty. Rental is emitted only when
 * metadata.listing_type === "rent" and required rent fields are present.
 * Commercial / rural / land / project: not mapped — fail closed with a clear error.
 *
 * @see https://partner.realestate.com.au/listing-upload/usage/
 * @see https://partner.realestate.com.au/listing-upload/examples/
 * @see docs/connectors/REA.md
 */

import { createHash } from "node:crypto";

export type ReaListingContact = {
  name: string;
  email?: string;
  telephone?: string;
};

export type ReaPropertyLike = {
  id: string;
  addressLine1: string;
  addressLine2?: string | null;
  suburb: string;
  state: string;
  postcode: string;
  country?: string | null;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  listingPriceCents?: number | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  updatedAt?: Date | string | null;
};

export type ReaListingXmlStatus = "current" | "sold" | "withdrawn" | "leased";

export type ReaXmlBuildSuccess = {
  ok: true;
  xml: string;
  listingType: "residential" | "rental";
  status: ReaListingXmlStatus;
};

export type ReaXmlBuildFailure = {
  ok: false;
  errors: string[];
};

export type ReaXmlBuildResult = ReaXmlBuildSuccess | ReaXmlBuildFailure;

/** Valid residential/rental category `name` values (REA Partner catalog). */
const RESIDENTIAL_CATEGORIES = new Set([
  "House",
  "Unit",
  "Townhouse",
  "Villa",
  "Apartment",
  "Flat",
  "Studio",
  "Warehouse",
  "DuplexSemi-detached",
  "Alpine",
  "AcreageSemi-rural",
  "BlockOfUnits",
  "Terrace",
  "Retirement",
  "ServicedApartment",
  "Other",
]);

const CATEGORY_MAP: Record<string, string> = {
  house: "House",
  home: "House",
  apartment: "Apartment",
  unit: "Unit",
  flat: "Flat",
  townhouse: "Townhouse",
  villa: "Villa",
  terrace: "Terrace",
  duplex: "DuplexSemi-detached",
  duplexsemidetached: "DuplexSemi-detached",
  studio: "Studio",
  warehouse: "Warehouse",
  alpine: "Alpine",
  acreage: "AcreageSemi-rural",
  acreagesemirural: "AcreageSemi-rural",
  semirural: "AcreageSemi-rural",
  blockofunits: "BlockOfUnits",
  retirement: "Retirement",
  servicedapartment: "ServicedApartment",
  penthouse: "Apartment",
  other: "Other",
};

/** Property types that need a different REAXML root — not residential. */
const UNSUPPORTED_LISTING_ROOTS = new Set([
  "land",
  "vacantland",
  "rural",
  "farm",
  "commercial",
  "office",
  "retail",
  "industrial",
]);

const STATE_MAP: Record<string, string> = {
  nsw: "nsw",
  "new south wales": "nsw",
  vic: "vic",
  victoria: "vic",
  qld: "qld",
  queensland: "qld",
  sa: "sa",
  "south australia": "sa",
  wa: "wa",
  "western australia": "wa",
  tas: "tas",
  tasmania: "tas",
  nt: "nt",
  "northern territory": "nt",
  act: "act",
  "australian capital territory": "act",
};

const FEATURE_BOOL_ALIASES: Array<{ keys: string[]; element: string }> = [
  { keys: ["air conditioning", "airconditioning", "air con", "a/c", "ac"], element: "airConditioning" },
  { keys: ["alarm", "alarm system", "security alarm"], element: "alarmSystem" },
  { keys: ["balcony"], element: "balcony" },
  { keys: ["broadband", "nbn", "fibre"], element: "broadband" },
  { keys: ["built in robe", "built-in robe", "builtin robe", "bir", "built in wardrobe"], element: "builtInRobes" },
  { keys: ["courtyard"], element: "courtyard" },
  { keys: ["deck"], element: "deck" },
  { keys: ["dishwasher"], element: "dishwasher" },
  { keys: ["ducted cooling"], element: "ductedCooling" },
  { keys: ["ducted heating"], element: "ductedHeating" },
  { keys: ["evaporative cooling", "evaporative"], element: "evaporativeCooling" },
  { keys: ["floorboard", "timber floor", "hardwood floor"], element: "floorboards" },
  { keys: ["fully fenced", "fully-fenced", "fenced"], element: "fullyFenced" },
  { keys: ["gas heating"], element: "gasHeating" },
  { keys: ["gym", "gymnasium"], element: "gym" },
  { keys: ["hydronic heating", "hydronic"], element: "hydronicHeating" },
  { keys: ["intercom"], element: "intercom" },
  { keys: ["inside spa", "indoor spa"], element: "insideSpa" },
  { keys: ["open fireplace", "open fire", "fireplace"], element: "openFirePlace" },
  { keys: ["outdoor entertainment", "outdoor living", "alfresco"], element: "outdoorEnt" },
  { keys: ["outside spa", "outdoor spa"], element: "outsideSpa" },
  { keys: ["pay tv", "foxtel"], element: "payTV" },
  { keys: ["pool above ground", "above ground pool"], element: "poolAboveGround" },
  { keys: ["pool", "in ground pool", "inground pool", "swimming pool"], element: "poolInGround" },
  { keys: ["remote garage", "remote control garage"], element: "remoteGarage" },
  { keys: ["reverse cycle", "reverse-cycle"], element: "reverseCycleAircon" },
  { keys: ["rumpus", "rumpus room"], element: "rumpusRoom" },
  { keys: ["secure parking", "secure car"], element: "secureParking" },
  { keys: ["shed"], element: "shed" },
  { keys: ["split system air", "split-system air", "split system a/c"], element: "splitsystemAircon" },
  { keys: ["split system heat", "split-system heat"], element: "splitsystemHeating" },
  { keys: ["study", "home office"], element: "study" },
  { keys: ["tennis court"], element: "tennisCourt" },
  { keys: ["vacuum", "ducted vacuum"], element: "vacuumSystem" },
  { keys: ["workshop"], element: "workshop" },
];

const IMG_IDS = [
  "m",
  ..."abcdefghijklmnopqrstuvwxyz".split("").filter((c) => c !== "m"),
  ..."abcdefghij".split("").map((c) => `a${c}`),
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Strip HTML so REA parser does not treat rich text as poorly formed XML. */
export function stripHtmlForReaxml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function mapCategory(raw?: string | null): string | null {
  if (!raw?.trim()) return "House";
  const key = raw.trim().toLowerCase().replace(/[_\s-]+/g, "");
  const mapped = CATEGORY_MAP[key];
  if (mapped && RESIDENTIAL_CATEGORIES.has(mapped)) return mapped;
  // Pass through already-valid REA names
  const titled = raw.trim();
  if (RESIDENTIAL_CATEGORIES.has(titled)) return titled;
  return null;
}

export function normaliseReaState(state: string): string | null {
  const key = state.trim().toLowerCase();
  return STATE_MAP[key] ?? null;
}

function normaliseCountry(country?: string | null): string {
  const raw = (country ?? "AU").trim().toUpperCase();
  if (!raw || raw === "AU" || raw === "AUS" || raw === "AUSTRALIA") return "AUS";
  return raw.slice(0, 3);
}

/** REAXML-ish timestamp: 2009-01-01-12:30:00 */
export function formatReaModTime(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Split "Unit 2/55 Pyrmont Street" into REAXML address parts. */
export function splitReaStreetAddress(addressLine1: string): {
  subNumber?: string;
  streetNumber?: string;
  street: string;
} {
  const raw = addressLine1.trim();
  if (!raw) return { street: "" };

  const unitMatch = raw.match(
    /^(?:unit|apt|apartment|suite)\s*([A-Za-z0-9\-]+)\s*[\/,]?\s*(.+)$/i,
  );
  let subNumber: string | undefined;
  let rest = raw;
  if (unitMatch) {
    subNumber = unitMatch[1];
    rest = unitMatch[2].trim();
  } else {
    const slashUnit = raw.match(/^([A-Za-z0-9\-]+)\s*\/\s*(.+)$/);
    if (slashUnit && /^\d/.test(slashUnit[2])) {
      subNumber = slashUnit[1];
      rest = slashUnit[2].trim();
    }
  }

  const numbered = rest.match(/^(\d+[A-Za-z]?)\s+(.+)$/);
  if (numbered) {
    return { subNumber, streetNumber: numbered[1], street: numbered[2].trim() };
  }
  // LOT-style street numbers without a conventional house number
  const lot = rest.match(/^(lot\s*[A-Za-z0-9\-]+)\s+(.+)$/i);
  if (lot) {
    return { subNumber, streetNumber: lot[1], street: lot[2].trim() };
  }
  return { subNumber, street: rest };
}

function metaRecord(meta: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return meta && typeof meta === "object" ? meta : {};
}

function marketingOf(meta: Record<string, unknown>): Record<string, unknown> {
  const m = meta.marketing;
  return m && typeof m === "object" ? (m as Record<string, unknown>) : {};
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t || undefined;
}

function asPositiveInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return undefined;
}

function parseAreaMeters(raw: unknown): { value: number; unit: string } | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return { value: raw, unit: "squareMeter" };
  }
  if (typeof raw !== "string" || !raw.trim()) return null;
  const s = raw.trim().toLowerCase().replace(/,/g, "");
  const m = s.match(/^([\d.]+)\s*(m2|m²|sqm|sq\.?\s*m|square\s*meters?|square\s*metres?)?$/i);
  if (m) {
    const value = Number(m[1]);
    if (!Number.isFinite(value) || value <= 0) return null;
    const unitHint = (m[2] ?? "squareMeter").toLowerCase();
    if (unitHint.includes("acre")) return { value, unit: "acre" };
    if (unitHint.includes("hectare") || unitHint === "ha") return { value, unit: "hectare" };
    if (unitHint === "square" || unitHint === "sq") return { value, unit: "square" };
    return { value, unit: "squareMeter" };
  }
  const acres = s.match(/^([\d.]+)\s*(acres?|ac)$/i);
  if (acres) {
    const value = Number(acres[1]);
    return Number.isFinite(value) && value > 0 ? { value, unit: "acre" } : null;
  }
  return null;
}

function imageUrls(meta: Record<string, unknown>): string[] {
  const fromImages = Array.isArray(meta.images)
    ? meta.images.filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u.trim()))
    : [];
  const featured = asTrimmedString(meta.featured_image);
  const urls = [...fromImages];
  if (featured && /^https?:\/\//i.test(featured) && !urls.includes(featured)) {
    urls.unshift(featured);
  }
  return urls.slice(0, 35);
}

function floorplanUrls(meta: Record<string, unknown>): string[] {
  const raw = meta.floorplans ?? meta.floor_plans;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u.trim()))
    .slice(0, 2);
}

function imageFormat(url: string): "jpg" | "png" | "gif" {
  const lower = url.toLowerCase();
  if (lower.includes(".png")) return "png";
  if (lower.includes(".gif")) return "gif";
  return "jpg";
}

function boolAttr(value: boolean): "yes" | "no" {
  return value ? "yes" : "no";
}

function deriveListingRoot(
  property: ReaPropertyLike,
): { listingType: "residential" | "rental" } | { error: string } {
  const meta = metaRecord(property.metadata);
  const listingTypeRaw = (
    asTrimmedString(meta.listing_type) ??
    asTrimmedString(meta.listingType) ??
    "sale"
  ).toLowerCase();

  const typeKey = (property.propertyType ?? "").trim().toLowerCase().replace(/[_\s-]+/g, "");
  if (UNSUPPORTED_LISTING_ROOTS.has(typeKey)) {
    return {
      error: `Property type "${property.propertyType}" maps to a REAXML root (land/rural/commercial) that Gen 2 has not mapped yet — residential/rental only`,
    };
  }

  if (listingTypeRaw === "rent" || listingTypeRaw === "rental" || listingTypeRaw === "lease") {
    return { listingType: "rental" };
  }
  return { listingType: "residential" };
}

function deriveReaStatus(
  property: ReaPropertyLike,
  listingType: "residential" | "rental",
  override?: ReaListingXmlStatus,
): ReaListingXmlStatus {
  if (override) return override;
  const s = (property.status ?? "").toLowerCase();
  if (s === "withdrawn") return "withdrawn";
  if (listingType === "rental" && (s === "leased" || s === "sold")) return "leased";
  if (s === "sold") return "sold";
  return "current";
}

function resolveAuthority(meta: Record<string, unknown>): {
  authority: "auction" | "sale" | "setsale";
  auctionDate?: string;
} {
  const raw = (
    asTrimmedString(meta.authority) ??
    asTrimmedString(marketingOf(meta).authority) ??
    ""
  )
    .toLowerCase()
    .replace(/[_\s-]+/g, "");

  const auctionDate =
    asTrimmedString(meta.auction_date) ?? asTrimmedString(meta.auctionDate);
  const setSaleDate =
    asTrimmedString(meta.set_sale_date) ?? asTrimmedString(meta.setSaleDate);

  if (raw === "auction") {
    return { authority: "auction", auctionDate: auctionDate ?? setSaleDate };
  }
  if (raw === "setsale") {
    return { authority: "setsale", auctionDate: setSaleDate ?? auctionDate };
  }
  // Infer auction when an auction date is present and authority omitted
  if (!raw && auctionDate) {
    return { authority: "auction", auctionDate };
  }
  // Deprecated exclusive/multilist/conjunctional/open → sale
  return { authority: "sale" };
}

function parseFeatureFlags(featuresText: string | undefined): Record<string, true> {
  const out: Record<string, true> = {};
  if (!featuresText?.trim()) return out;
  const normalised = featuresText.toLowerCase();
  for (const row of FEATURE_BOOL_ALIASES) {
    if (row.keys.some((k) => normalised.includes(k))) {
      // Prefer specific pool types over generic pool
      if (row.element === "poolInGround" && out.poolAboveGround) continue;
      out[row.element] = true;
    }
  }
  return out;
}

function otherFeaturesText(featuresText: string | undefined, used: Set<string>): string | undefined {
  if (!featuresText?.trim()) return undefined;
  const parts = featuresText
    .split(/[\n,;|]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => {
      const lower = p.toLowerCase();
      return !FEATURE_BOOL_ALIASES.some((row) => row.keys.some((k) => lower.includes(k)));
    });
  if (!parts.length) return undefined;
  void used;
  return parts.join(", ").slice(0, 100);
}

function statementOfInformationUrl(
  meta: Record<string, unknown>,
  state: string,
): { url: string; id: string } | null {
  const explicitUrl =
    asTrimmedString(meta.statement_of_information_url) ??
    asTrimmedString(meta.statementOfInformationUrl);

  const soiDoc =
    meta.statementOfInformation && typeof meta.statementOfInformation === "object"
      ? (meta.statementOfInformation as Record<string, unknown>)
      : null;
  const disclosure =
    meta.disclosureStatement && typeof meta.disclosureStatement === "object"
      ? (meta.disclosureStatement as Record<string, unknown>)
      : null;

  const soiDocUrl =
    soiDoc && typeof soiDoc.clearedAt !== "string"
      ? asTrimmedString(soiDoc.url)
      : undefined;
  // VIC: treat Gen 2 disclosure statement PDF as Statement of Information when present
  const disclosureUrl =
    state === "vic" &&
    disclosure &&
    typeof disclosure.clearedAt !== "string" &&
    String(disclosure.contentType ?? "").includes("pdf")
      ? asTrimmedString(disclosure.url)
      : undefined;

  const url = explicitUrl ?? soiDocUrl ?? disclosureUrl;
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const id = createHash("sha1").update(url).digest("hex");
  return { url, id };
}

function indentLines(xml: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return xml
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => `${pad}${l.trim()}`)
    .join("\n");
}

function buildFeaturesXml(input: {
  bedroomsXml: string;
  bathrooms: number;
  ensuites?: number;
  garages?: number;
  carports?: number;
  openSpaces?: number;
  flags: Record<string, true>;
  otherFeatures?: string;
}): string {
  const lines: string[] = [
    `<bedrooms>${input.bedroomsXml}</bedrooms>`,
    `<bathrooms>${input.bathrooms}</bathrooms>`,
  ];
  if (input.ensuites != null && input.ensuites > 0) {
    lines.push(`<ensuite>${input.ensuites}</ensuite>`);
  }
  if (input.garages != null && input.garages >= 0) {
    lines.push(`<garages>${input.garages}</garages>`);
  }
  if (input.carports != null && input.carports >= 0) {
    lines.push(`<carports>${input.carports}</carports>`);
  }
  if (input.openSpaces != null && input.openSpaces >= 0) {
    lines.push(`<openSpaces>${input.openSpaces}</openSpaces>`);
  }
  for (const [el] of Object.entries(input.flags)) {
    lines.push(`<${el}>true</${el}>`);
  }
  if (input.otherFeatures) {
    lines.push(`<otherFeatures>${escapeXml(input.otherFeatures)}</otherFeatures>`);
  }
  return `<features>\n${indentLines(lines.join("\n"), 2)}\n</features>`;
}

function buildImagesXml(urls: string[], modTime: string): string {
  const lines = urls.map((url, i) => {
    const id = IMG_IDS[i] ?? `x${i}`;
    return `<img id="${id}" modTime="${modTime}" url="${escapeXml(url)}" format="${imageFormat(url)}"/>`;
  });
  return `<images>\n${indentLines(lines.join("\n"), 2)}\n</images>`;
}

function buildFloorplansXml(urls: string[], modTime: string): string | null {
  if (!urls.length) return null;
  const lines = urls.map(
    (url, i) =>
      `<floorplan id="${i + 1}" modTime="${modTime}" url="${escapeXml(url)}" format="${imageFormat(url)}"/>`,
  );
  return `<objects>\n${indentLines(lines.join("\n"), 2)}\n</objects>`;
}

function buildInspectionTimesXml(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const lines = raw
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((l) => `<inspection>${escapeXml(l.slice(0, 120))}</inspection>`);
  if (!lines.length) return null;
  return `<inspectionTimes>\n${indentLines(lines.join("\n"), 2)}\n</inspectionTimes>`;
}

function buildSoldDetailsXml(property: ReaPropertyLike, meta: Record<string, unknown>): {
  xml: string | null;
  errors: string[];
} {
  const errors: string[] = [];
  const soldCents =
    asPositiveInt(meta.sold_price_cents) ??
    asPositiveInt(meta.soldPriceCents) ??
    (typeof property.listingPriceCents === "number" && property.listingPriceCents > 0
      ? property.listingPriceCents
      : undefined);
  if (soldCents == null) {
    errors.push("Sold listings require sold price (metadata.sold_price_cents or listingPriceCents)");
    return { xml: null, errors };
  }
  const dollars = Math.round(soldCents / 100);
  if (dollars <= 2900) {
    errors.push("Sold price must be greater than $2,900 (REA residential price rule)");
  }
  const soldDateRaw =
    asTrimmedString(meta.sold_date) ??
    asTrimmedString(meta.soldDate) ??
    (property.updatedAt
      ? formatReaModTime(
          property.updatedAt instanceof Date
            ? property.updatedAt
            : new Date(property.updatedAt),
        )
      : formatReaModTime());
  const display =
    meta.sold_price_display === false || meta.soldPriceDisplay === false ? "no" : "yes";
  const xml = `<soldDetails>
  <soldPrice display="${display}">${dollars}</soldPrice>
  <soldDate>${escapeXml(soldDateRaw)}</soldDate>
</soldDetails>`;
  return { xml, errors };
}

/**
 * Build validated REAXML for residential (sale) or rental listings.
 * Fails closed — never returns stub XML missing mandatory create fields.
 */
export function buildReaListingXml(input: {
  reaAgencyId: string;
  uniqueId: string;
  property: ReaPropertyLike;
  contact: ReaListingContact;
  status?: ReaListingXmlStatus;
}): ReaXmlBuildResult {
  const errors: string[] = [];
  const property = input.property;
  const meta = metaRecord(property.metadata);
  const marketing = marketingOf(meta);
  const modTime = formatReaModTime();

  const agencyId = input.reaAgencyId.trim();
  if (!/^[A-Za-z]{6}$/.test(agencyId)) {
    errors.push("agentID must be exactly 6 alphabetic characters (REA agency id)");
  }

  const uniqueId = input.uniqueId.trim().slice(0, 50);
  if (!uniqueId || /\s/.test(uniqueId)) {
    errors.push("uniqueID is required (max 50 chars, no spaces)");
  }

  const root = deriveListingRoot(property);
  if ("error" in root) {
    return { ok: false, errors: [root.error] };
  }
  const { listingType } = root;
  const status = deriveReaStatus(property, listingType, input.status);

  // Minimal withdraw / leased payloads
  if (status === "withdrawn" || (listingType === "rental" && status === "leased")) {
    if (errors.length) return { ok: false, errors };
    const tag = listingType === "rental" ? "rental" : "residential";
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE propertyList SYSTEM "http://reaxml.realestate.com.au/propertyList.dtd">
<propertyList date="${modTime}">
  <${tag} modTime="${modTime}" status="${status}">
    <agentID>${escapeXml(agencyId)}</agentID>
    <uniqueID>${escapeXml(uniqueId)}</uniqueID>
  </${tag}>
</propertyList>
`;
    return { ok: true, xml, listingType, status };
  }

  if (status === "sold" && listingType === "residential") {
    const sold = buildSoldDetailsXml(property, meta);
    errors.push(...sold.errors);
    if (errors.length || !sold.xml) return { ok: false, errors };
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE propertyList SYSTEM "http://reaxml.realestate.com.au/propertyList.dtd">
<propertyList date="${modTime}">
  <residential modTime="${modTime}" status="sold">
    <agentID>${escapeXml(agencyId)}</agentID>
    <uniqueID>${escapeXml(uniqueId)}</uniqueID>
${indentLines(sold.xml, 4)}
  </residential>
</propertyList>
`;
    return { ok: true, xml, listingType, status };
  }

  // —— current (create/update) path ——
  const contactName = input.contact.name?.trim();
  if (!contactName) errors.push("listingAgent/name is required");

  const suburb = property.suburb?.trim();
  const postcode = property.postcode?.trim();
  const state = normaliseReaState(property.state ?? "");
  if (!suburb) errors.push("address/suburb is required");
  if (!state) {
    errors.push("address/state must be a valid AU state (nsw, vic, qld, sa, wa, tas, nt, act)");
  }
  if (!postcode || !/^\d{4}$/.test(postcode)) {
    errors.push("address/postcode must be a 4-digit Australian postcode");
  }

  const { subNumber, streetNumber, street } = splitReaStreetAddress(
    property.addressLine1 ?? "",
  );
  if (!street?.trim()) errors.push("address/street is required");
  if (!streetNumber || streetNumber === "0") {
    errors.push(
      "address/streetNumber is required for residential/rental (could not parse from address line 1)",
    );
  }

  const category = mapCategory(property.propertyType);
  if (!category) {
    errors.push(
      `category is required — unsupported propertyType "${property.propertyType}" for residential REAXML`,
    );
  }

  const headlineRaw =
    asTrimmedString(marketing.headline) ||
    `${property.addressLine1}, ${property.suburb}`.trim();
  const headline = stripHtmlForReaxml(headlineRaw).slice(0, 150);
  if (!headline) errors.push("headline is required (max 150 chars)");

  const descriptionRaw =
    asTrimmedString(marketing.description) || headline;
  const description = stripHtmlForReaxml(descriptionRaw).slice(0, 65535);
  if (!description) errors.push("description is required");

  const isStudio = category === "Studio";
  let bedroomsXml: string | null = null;
  if (isStudio && (property.bedrooms == null || property.bedrooms === 0)) {
    bedroomsXml = "Studio";
  } else if (typeof property.bedrooms === "number" && property.bedrooms > 0) {
    if (property.bedrooms > 30) errors.push("bedrooms cannot exceed 30");
    bedroomsXml = String(property.bedrooms);
  } else {
    errors.push("bedrooms is required for new residential/rental listings (use Studio category for studios)");
  }

  let bathrooms: number | null = null;
  if (typeof property.bathrooms === "number" && property.bathrooms > 0) {
    if (property.bathrooms > 20) errors.push("bathrooms cannot exceed 20");
    bathrooms = Math.round(property.bathrooms);
  } else {
    errors.push("bathrooms is required for new residential/rental listings (must be > 0)");
  }

  const images = imageUrls(meta);
  if (!images.length) {
    errors.push("At least one image URL is required (metadata.images) with main id=m");
  }

  const displayAsContactAgent = meta.display_as_contact_agent === true;
  const priceView =
    asTrimmedString(marketing.priceView) ??
    asTrimmedString(meta.price_view) ??
    asTrimmedString(meta.priceView) ??
    (displayAsContactAgent ? "Contact Agent" : undefined);

  const priceCents = property.listingPriceCents;
  const priceDollars =
    typeof priceCents === "number" && Number.isFinite(priceCents) && priceCents > 0
      ? Math.round(priceCents / 100)
      : undefined;

  let rentXml: string | null = null;
  let bondXml: string | null = null;
  let dateAvailableXml: string | null = null;
  let allowancesXml: string | null = null;
  let priceXml: string | null = null;
  let priceViewXml: string | null = null;
  let authorityXml: string | null = null;
  let auctionXml: string | null = null;
  let underOfferXml: string | null = null;

  if (listingType === "rental") {
    const rentCents =
      asPositiveInt(meta.rent_cents) ??
      asPositiveInt(meta.rentCents) ??
      priceCents ??
      undefined;
    const rentPeriod =
      asTrimmedString(meta.rent_period) ??
      asTrimmedString(meta.rentPeriod) ??
      "week";
    if (rentCents == null || rentCents <= 0) {
      errors.push("rental listings require rent (metadata.rent_cents or listingPriceCents)");
    } else {
      const rentDollars = Math.round(rentCents / 100);
      rentXml = `<rent period="${escapeXml(rentPeriod)}">${rentDollars}</rent>`;
    }
    const bondCents = asPositiveInt(meta.bond_cents) ?? asPositiveInt(meta.bondCents);
    if (bondCents != null && bondCents > 0) {
      bondXml = `<bond>${Math.round(bondCents / 100)}</bond>`;
    }
    const dateAvailable =
      asTrimmedString(meta.date_available) ?? asTrimmedString(meta.dateAvailable);
    if (!dateAvailable) {
      errors.push("rental listings require dateAvailable (metadata.date_available)");
    } else {
      dateAvailableXml = `<dateAvailable>${escapeXml(dateAvailable)}</dateAvailable>`;
    }
    const petFriendly = meta.pet_friendly === true || meta.petFriendly === true;
    const furnished = meta.furnished === true;
    const smokers = meta.smokers === true || meta.smoker === true;
    allowancesXml = `<allowances>
  <petFriendly>${petFriendly}</petFriendly>
  <furnished>${furnished}</furnished>
  <smokers>${smokers}</smokers>
</allowances>`;
  } else {
    // Residential sale — price is mandatory (> 2900)
    if (priceDollars == null) {
      errors.push("price is required (listingPriceCents) for residential create");
    } else if (priceDollars <= 2900) {
      errors.push("price must be greater than $2,900 (REA residential validation)");
    } else {
      const display = displayAsContactAgent ? "no" : "yes";
      priceXml = `<price display="${display}">${priceDollars}</price>`;
    }
    if (priceView) {
      priceViewXml = `<priceView>${escapeXml(priceView.slice(0, 50))}</priceView>`;
    } else if (displayAsContactAgent) {
      priceViewXml = `<priceView>Contact Agent</priceView>`;
    }

    const { authority, auctionDate } = resolveAuthority(meta);
    authorityXml = `<authority value="${authority}"/>`;
    if (authority === "auction" || authority === "setsale") {
      if (!auctionDate) {
        errors.push(
          authority === "auction"
            ? "auction date is required when authority is auction (metadata.auction_date)"
            : "set-sale date is required when authority is setsale (metadata.set_sale_date)",
        );
      } else {
        auctionXml = `<auction date="${escapeXml(auctionDate)}"/>`;
      }
    }

    const underOffer = (property.status ?? "").toLowerCase() === "under_offer";
    underOfferXml = `<underOffer value="${boolAttr(underOffer)}"/>`;
  }

  const addressDisplay =
    meta.address_display === false || meta.addressDisplay === false ? "no" : "yes";
  const streetview =
    meta.streetview === false || meta.street_view === false ? "no" : "yes";

  const garages =
    asPositiveInt(meta.lock_up_garages) ?? asPositiveInt(meta.lockUpGarages);
  const carSpaces = asPositiveInt(meta.car_spaces) ?? asPositiveInt(meta.carSpaces);
  let openSpaces: number | undefined;
  let carports: number | undefined;
  if (garages != null && carSpaces != null && carSpaces > garages) {
    openSpaces = carSpaces - garages;
  } else if (garages == null && carSpaces != null) {
    openSpaces = carSpaces;
  }
  carports = asPositiveInt(meta.carports);

  const featuresText =
    typeof marketing.features === "string"
      ? marketing.features
      : Array.isArray(marketing.features)
        ? marketing.features.map(String).join(", ")
        : undefined;
  const flags = parseFeatureFlags(featuresText);
  const other = otherFeaturesText(featuresText, new Set(Object.keys(flags)));

  const land = parseAreaMeters(meta.land_size ?? meta.landSize);
  const building = parseAreaMeters(meta.building_size ?? meta.buildingSize);
  const energyRating =
    typeof meta.energy_rating === "number"
      ? meta.energy_rating
      : typeof marketing.energyRating === "number"
        ? marketing.energyRating
        : undefined;

  const soi =
    state && listingType === "residential"
      ? statementOfInformationUrl(meta, state)
      : null;

  if (errors.length) {
    return { ok: false, errors };
  }

  const featuresXml = buildFeaturesXml({
    bedroomsXml: bedroomsXml!,
    bathrooms: bathrooms!,
    garages,
    carports,
    openSpaces,
    flags,
    otherFeatures: other,
  });

  const imagesXml = buildImagesXml(images, modTime);
  const floorplansXml = buildFloorplansXml(floorplanUrls(meta), modTime);
  const inspectionXml = buildInspectionTimesXml(
    asTrimmedString(meta.inspection_times) ?? asTrimmedString(meta.inspectionTimes),
  );

  const landXml = land
    ? `<landDetails>
  <area unit="${escapeXml(land.unit)}">${land.value}</area>
</landDetails>`
    : null;

  const buildingParts: string[] = [];
  if (building) {
    buildingParts.push(`<area unit="${escapeXml(building.unit)}">${building.value}</area>`);
  }
  if (typeof energyRating === "number" && energyRating >= 0 && energyRating <= 10) {
    buildingParts.push(`<energyRating>${energyRating}</energyRating>`);
  }
  const buildingXml = buildingParts.length
    ? `<buildingDetails>\n${indentLines(buildingParts.join("\n"), 2)}\n</buildingDetails>`
    : null;

  const mediaXml = soi
    ? `<media>
  <attachment usage="statementOfInformation" id="${escapeXml(soi.id)}" url="${escapeXml(soi.url)}"/>
</media>`
    : null;

  const telephone = asTrimmedString(input.contact.telephone);
  const email = asTrimmedString(input.contact.email);
  const listingAgentXml = `<listingAgent id="1">
  <name>${escapeXml(contactName!.slice(0, 65))}</name>
  ${telephone ? `<telephone type="mobile">${escapeXml(telephone.slice(0, 40))}</telephone>` : ""}
  ${email ? `<email>${escapeXml(email.slice(0, 60))}</email>` : ""}
</listingAgent>`;

  // Prefer separate subNumber + streetNumber (REA: do not duplicate unit inside streetNumber)
  const addressInner = [
    subNumber ? `<subNumber>${escapeXml(subNumber.slice(0, 20))}</subNumber>` : "",
    `<streetNumber>${escapeXml(String(streetNumber).slice(0, 20))}</streetNumber>`,
    `<street>${escapeXml(street.trim())}</street>`,
    `<suburb display="yes">${escapeXml(suburb!.toUpperCase())}</suburb>`,
    `<state>${escapeXml(state!)}</state>`,
    `<postcode>${escapeXml(postcode!)}</postcode>`,
    `<country>${escapeXml(normaliseCountry(property.country))}</country>`,
  ]
    .filter(Boolean)
    .join("\n");

  const addressXml = `<address display="${addressDisplay}" streetview="${streetview}">
${indentLines(addressInner, 2)}
</address>`;

  const bodyParts = [
    `<agentID>${escapeXml(agencyId)}</agentID>`,
    `<uniqueID>${escapeXml(uniqueId)}</uniqueID>`,
    listingType === "residential" ? authorityXml : null,
    listingType === "residential" ? underOfferXml : `<depositTaken value="no"/>`,
    listingAgentXml,
    listingType === "rental" ? dateAvailableXml : null,
    listingType === "rental" ? rentXml : priceXml,
    listingType === "rental" ? bondXml : priceViewXml,
    listingType === "residential" ? auctionXml : null,
    addressXml,
    `<category name="${escapeXml(category!)}"/>`,
    `<headline>${escapeXml(headline)}</headline>`,
    `<description>${escapeXml(description)}</description>`,
    listingType === "rental" ? allowancesXml : null,
    featuresXml,
    landXml,
    buildingXml,
    inspectionXml,
    imagesXml,
    floorplansXml,
    mediaXml,
  ].filter((p): p is string => Boolean(p));

  const tag = listingType === "rental" ? "rental" : "residential";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE propertyList SYSTEM "http://reaxml.realestate.com.au/propertyList.dtd">
<propertyList date="${modTime}">
  <${tag} modTime="${modTime}" status="${status}">
${indentLines(bodyParts.join("\n"), 4)}
  </${tag}>
</propertyList>
`;

  return { ok: true, xml, listingType, status };
}

/**
 * @deprecated Prefer {@link buildReaListingXml} (Result). Throws on validation failure.
 */
export function buildReaResidentialListingXml(input: {
  reaAgencyId: string;
  uniqueId: string;
  property: ReaPropertyLike;
  contact: ReaListingContact;
  status?: "current" | "sold" | "withdrawn";
}): string {
  const result = buildReaListingXml(input);
  if (!result.ok) {
    throw new Error(`REAXML validation failed: ${result.errors.join("; ")}`);
  }
  return result.xml;
}
