/**
 * Build honest listing-description AI context from Gen 2 property + Cotality snapshot.
 * Cotality Property Details does not return marketing description / headline / guide price —
 * drafts are AI-composed from factual attributes only.
 */

import type { CrmAssistEntity } from "../org/business-context";
import type { CoreLogicPropertyDetailsSnapshot } from "../connectors/corelogic";
import {
  formatPropertyAddress,
  getPropertyCotalityDetails,
} from "../properties";

export type ListingDescriptionDraftInput = {
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  carSpaces?: number | null;
  landSize?: string | null;
  buildingSize?: string | null;
  yearBuilt?: string | number | null;
  headline?: string | null;
  description?: string | null;
  features?: string | null;
  listingPriceCents?: number | null;
};

type PropertyForListingAssist = {
  id: string;
  addressLine1: string;
  addressLine2?: string | null;
  suburb: string;
  state: string;
  postcode: string;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  listingPriceCents?: number | null;
  currency?: string | null;
  metadata?: Record<string, unknown> | null;
};

function metaString(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  const v = meta?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function metaNumber(meta: Record<string, unknown> | null | undefined, key: string): number | null {
  const v = meta?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function featuresFromSnapshot(snapshot: CoreLogicPropertyDetailsSnapshot | null): string | null {
  if (!snapshot) return null;
  const lines: string[] = [];
  if (snapshot.features?.length) {
    for (const f of snapshot.features) {
      if (f.trim()) lines.push(f.trim());
    }
  }
  if (snapshot.featureAttributes?.length) {
    for (const fa of snapshot.featureAttributes) {
      const line = `${fa.name}: ${fa.value}`.trim();
      if (line) lines.push(line);
    }
  }
  return lines.length ? lines.join("\n") : null;
}

function formatSaleLine(sale: {
  price?: number;
  contractDate?: string;
  settlementDate?: string;
  type?: string;
  isPriceWithheld?: boolean;
}): string | null {
  const date = sale.contractDate || sale.settlementDate;
  const price =
    sale.isPriceWithheld || sale.price == null
      ? sale.isPriceWithheld
        ? "price withheld"
        : null
      : `$${sale.price.toLocaleString("en-AU")}`;
  const parts = [date, price, sale.type].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Collect factual lines for prompts / template drafts (no invented valuations). */
export function collectListingDescriptionFacts(
  property: PropertyForListingAssist,
  draft?: ListingDescriptionDraftInput | null,
): string[] {
  const meta = property.metadata ?? {};
  const marketing = (meta.marketing as Record<string, unknown> | undefined) ?? {};
  const cotality = getPropertyCotalityDetails(property);

  const propertyType =
    draft?.propertyType?.trim() ||
    property.propertyType ||
    cotality?.core?.propertySubType ||
    cotality?.core?.propertyType ||
    null;
  const bedrooms =
    draft?.bedrooms ?? property.bedrooms ?? cotality?.core?.beds ?? null;
  const bathrooms =
    draft?.bathrooms ?? property.bathrooms ?? cotality?.core?.baths ?? null;
  const carSpaces =
    draft?.carSpaces ??
    metaNumber(meta, "car_spaces") ??
    cotality?.core?.carSpaces ??
    null;
  const landSize =
    draft?.landSize?.trim() ||
    metaString(meta, "land_size") ||
    (cotality?.core?.landArea != null ? `${cotality.core.landArea} m²` : null);
  const buildingSize =
    draft?.buildingSize?.trim() ||
    metaString(meta, "building_size") ||
    (cotality?.additional?.floorArea != null
      ? `${cotality.additional.floorArea} m²`
      : null);
  const yearBuilt =
    draft?.yearBuilt ??
    (typeof meta.year_built === "string" || typeof meta.year_built === "number"
      ? meta.year_built
      : null) ??
    cotality?.additional?.yearBuilt ??
    null;
  const features =
    draft?.features?.trim() ||
    (typeof marketing.features === "string" ? marketing.features.trim() : null) ||
    featuresFromSnapshot(cotality);
  const headline =
    draft?.headline?.trim() ||
    (typeof marketing.headline === "string" ? marketing.headline.trim() : null);
  const existingDescription =
    draft?.description?.trim() ||
    (typeof marketing.description === "string" ? marketing.description.trim() : null);
  const listingPriceCents =
    draft?.listingPriceCents ?? property.listingPriceCents ?? null;

  const lines: string[] = [];
  lines.push(`Address: ${formatPropertyAddress(property)}`);
  if (propertyType) lines.push(`Property type: ${propertyType}`);
  if (bedrooms != null) lines.push(`Bedrooms: ${bedrooms}`);
  if (bathrooms != null) lines.push(`Bathrooms: ${bathrooms}`);
  if (carSpaces != null) lines.push(`Car spaces: ${carSpaces}`);
  if (landSize) lines.push(`Land size: ${landSize}`);
  if (buildingSize) lines.push(`Building size: ${buildingSize}`);
  if (yearBuilt != null && String(yearBuilt).trim()) {
    lines.push(`Year built: ${yearBuilt}`);
  }
  if (metaString(meta, "land_use") || cotality?.site?.landUsePrimary) {
    lines.push(
      `Land use: ${metaString(meta, "land_use") || cotality!.site!.landUsePrimary}`,
    );
  }
  if (metaString(meta, "zone_description") || cotality?.site?.zoneDescriptionLocal) {
    lines.push(
      `Zone: ${metaString(meta, "zone_description") || cotality!.site!.zoneDescriptionLocal}`,
    );
  }
  if (features) {
    lines.push("Features:");
    for (const f of features.split("\n").map((s) => s.trim()).filter(Boolean)) {
      lines.push(`- ${f}`);
    }
  }
  if (listingPriceCents != null && listingPriceCents > 0) {
    lines.push(
      `Agent guide price (listing field, not Cotality): $${(listingPriceCents / 100).toLocaleString("en-AU")}`,
    );
  }
  if (cotality?.lastSale) {
    const saleLine = formatSaleLine(cotality.lastSale);
    if (saleLine) {
      lines.push(`Prior sale on record (historical Cotality fact, not a guide price): ${saleLine}`);
    }
  }
  if (headline) lines.push(`Existing headline: ${headline}`);
  if (existingDescription) {
    lines.push("Existing description (revise if updating):");
    lines.push(existingDescription);
  }

  lines.push(
    "Note: Cotality Property Details does not supply marketing description, headline, or guide price. Draft only from the facts above — do not invent amenities, schools, or valuations.",
  );

  return lines;
}

/** Deterministic template when no LLM is configured. */
export function templateListingDescriptionFromFacts(facts: string[]): string {
  const pick = (prefix: string) =>
    facts.find((l) => l.startsWith(prefix))?.slice(prefix.length).trim() || null;

  const address = pick("Address:");
  const type = pick("Property type:");
  const beds = pick("Bedrooms:");
  const baths = pick("Bathrooms:");
  const cars = pick("Car spaces:");
  const land = pick("Land size:");
  const building = pick("Building size:");
  const year = pick("Year built:");

  const featureStart = facts.findIndex((l) => l === "Features:");
  const featureLines: string[] = [];
  if (featureStart >= 0) {
    for (let i = featureStart + 1; i < facts.length; i++) {
      const line = facts[i];
      if (!line.startsWith("- ")) break;
      featureLines.push(line.slice(2).trim());
    }
  }

  const specBits = [
    beds != null ? `${beds} bedroom` : null,
    baths != null ? `${baths} bathroom` : null,
    type,
  ].filter(Boolean);
  const sizeBits = [land ? `land ${land}` : null, building ? `building ${building}` : null]
    .filter(Boolean)
    .join(", ");

  const paras: string[] = [];
  paras.push(
    [
      address ? `Located at ${address}` : "This property",
      specBits.length ? `is a ${specBits.join(", ")} home` : "offers a well-presented residence",
      sizeBits ? `with ${sizeBits}` : null,
      year ? `built around ${year}` : null,
      cars != null ? `and ${cars} car space${cars === "1" ? "" : "s"}` : null,
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim() + ".",
  );

  if (featureLines.length) {
    paras.push(
      `Key features include ${featureLines.slice(0, 8).join(", ")}${featureLines.length > 8 ? ", and more" : ""}.`,
    );
  }

  paras.push(
    "This is an AI draft from Cotality and listing facts — review and edit before publishing. It is not a valuation.",
  );

  return paras.join("\n\n");
}

export function buildListingDescriptionAssistEntity(
  property: PropertyForListingAssist,
  draft?: ListingDescriptionDraftInput | null,
): { entity: CrmAssistEntity; facts: string[] } {
  const facts = collectListingDescriptionFacts(property, draft);
  const address = formatPropertyAddress(property);
  const existingDescription =
    draft?.description?.trim() ||
    (typeof (property.metadata?.marketing as Record<string, unknown> | undefined)?.description ===
    "string"
      ? String(
          (property.metadata!.marketing as Record<string, unknown>).description,
        ).trim()
      : null);

  return {
    facts,
    entity: {
      kind: "property",
      id: property.id,
      title: address,
      propertyAddress: address,
      description: existingDescription,
      notes: facts,
    },
  };
}
