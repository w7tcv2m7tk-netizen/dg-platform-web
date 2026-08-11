import type { Property, Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import { platformEvents } from "../events";
import { updateLeadStage, type VendorStage } from "../leads";
import { leadStageForPropertyStatus } from "../real-estate/pipeline";
import { maybeAutoPublishPropertyToWordPress } from "../connectors/wordpress/sync-property-publish";
import {
  addressMetadataFromParsed,
  resolveAddress,
  shouldAutoResolveAddress,
  type ResolvedAddressPayload,
} from "../addresses";
import {
  coreLogicCredentialsConfigured,
  coreLogicMatchToAddressMetadata,
  fetchCoreLogicPropertyDetails,
  isCoreLogicPropertyMatch,
  matchCoreLogicAddress,
  type CoreLogicPropertyDetailsSnapshot,
} from "../connectors/corelogic";
import { parsePropertyAddress, resolvePropertyAddress } from "./address";

export { parsePropertyAddress, needsAddressRefinement, resolvePropertyAddress } from "./address";
export type { ParsedPropertyAddress } from "./address";
export { geocodeAustralianAddress, isGeocodingConfigured } from "./geocode";
export type { GeocodeResult } from "./geocode";

/** Cotality / CoreLogic property id from externalRefs (preferred) or metadata. */
export function getPropertyCotalityId(property: {
  metadata?: Record<string, unknown> | null;
  externalRefs?: Record<string, unknown> | null;
}): string | number | null {
  const fromRefs = property.externalRefs?.corelogic_property_id;
  if (fromRefs != null && fromRefs !== "") return fromRefs as string | number;
  const fromMeta = property.metadata?.corelogic_property_id;
  if (fromMeta != null && fromMeta !== "") return fromMeta as string | number;
  return null;
}

function mergeCotalityIntoPropertyData(
  existingMeta: Record<string, unknown> | null | undefined,
  existingRefs: Record<string, unknown> | null | undefined,
  cotalityMeta: Record<string, unknown>,
): {
  metadata: Record<string, unknown>;
  externalRefs: Record<string, unknown>;
} {
  const metadata = { ...(existingMeta ?? {}), ...cotalityMeta };
  const externalRefs = { ...(existingRefs ?? {}) };
  const id = cotalityMeta.corelogic_property_id;
  if (id != null && id !== "") {
    externalRefs.corelogic_property_id = id;
    metadata.corelogic_property_id = id;
  }
  return { metadata, externalRefs };
}

export const PROPERTY_STATUSES = [
  "prospect",
  "appraisal",
  "listed",
  "under_offer",
  "sold",
  "withdrawn",
] as const;

export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

const WEBSITE_PUBLISH_STATUSES = new Set(["listed", "under_offer", "sold", "withdrawn"]);

export interface CreatePropertyInput {
  organisationId: string;
  actorId?: string;
  addressLine1: string;
  addressLine2?: string;
  suburb: string;
  state: string;
  postcode: string;
  country?: string;
  status?: PropertyStatus;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  ownerContactId?: string;
  leadId?: string;
  listingPriceCents?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface ListPropertiesOptions {
  organisationId: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface CreatePropertyFromLeadInput {
  organisationId: string;
  actorId?: string;
  leadId: string;
  addressLine1?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
}

function serializeProperty(property: Property) {
  return {
    id: property.id,
    organisationId: property.organisationId,
    addressLine1: property.addressLine1,
    addressLine2: property.addressLine2,
    suburb: property.suburb,
    state: property.state,
    postcode: property.postcode,
    country: property.country,
    status: property.status as PropertyStatus,
    propertyType: property.propertyType,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    ownerContactId: property.ownerContactId,
    leadId: property.leadId,
    listingPriceCents: property.listingPriceCents,
    currency: property.currency,
    metadata: property.metadata as Record<string, unknown> | null,
    externalRefs: property.externalRefs as Record<string, unknown> | null,
    createdAt: property.createdAt.toISOString(),
    updatedAt: property.updatedAt.toISOString(),
  };
}

export function formatPropertyAddress(property: {
  addressLine1: string;
  addressLine2?: string | null;
  suburb: string;
  state: string;
  postcode: string;
}) {
  const line1 = [property.addressLine1, property.addressLine2].filter(Boolean).join(", ");
  return `${line1}, ${property.suburb} ${property.state} ${property.postcode}`;
}

export async function listProperties(options: ListPropertiesOptions) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options.limit ?? 50, 100);
  const offset = options.offset ?? 0;

  const where: Prisma.PropertyWhereInput = {
    organisationId: options.organisationId,
    deletedAt: null,
  };
  if (options.status) where.status = options.status;

  const [items, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.property.count({ where }),
  ]);

  return {
    items: items.map(serializeProperty),
    meta: { total, limit, offset },
  };
}

export async function getProperty(organisationId: string, propertyId: string) {
  const { prisma } = await import("@dg/database");
  const property = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  return property ? serializeProperty(property) : null;
}

async function mergeResolvedAddress(input: CreatePropertyInput): Promise<CreatePropertyInput> {
  if (input.metadata?.skip_geocode === true) return input;

  const raw = input.addressLine1.trim();
  if (!raw) return input;

  const resolved = await resolveAddress(raw, { geocode: true });
  const keepManualSuburb =
    Boolean(input.suburb?.trim()) &&
    input.postcode?.trim() !== "0000" &&
    !shouldAutoResolveAddress(raw);

  return {
    ...input,
    addressLine1: resolved.addressLine1,
    suburb: keepManualSuburb ? input.suburb.trim() : resolved.suburb,
    state: (input.state?.trim() || resolved.state).toUpperCase(),
    postcode:
      input.postcode?.trim() && input.postcode.trim() !== "0000"
        ? input.postcode.trim()
        : resolved.postcode,
    metadata: {
      ...(input.metadata ?? {}),
      ...resolved.metadata,
    },
  };
}

export async function createProperty(input: CreatePropertyInput) {
  const { prisma } = await import("@dg/database");
  const resolvedInput = await mergeResolvedAddress(input);

  const meta = resolvedInput.metadata ?? {};
  const cotalityId = meta.corelogic_property_id;
  const externalRefs =
    cotalityId != null && cotalityId !== ""
      ? ({ corelogic_property_id: cotalityId } as Record<string, unknown>)
      : undefined;

  const property = await prisma.property.create({
    data: {
      organisationId: resolvedInput.organisationId,
      addressLine1: resolvedInput.addressLine1.trim(),
      addressLine2: resolvedInput.addressLine2?.trim() || null,
      suburb: resolvedInput.suburb.trim(),
      state: resolvedInput.state.trim().toUpperCase(),
      postcode: resolvedInput.postcode.trim(),
      country: resolvedInput.country ?? "AU",
      status: resolvedInput.status ?? "prospect",
      propertyType: resolvedInput.propertyType,
      bedrooms: resolvedInput.bedrooms,
      bathrooms: resolvedInput.bathrooms,
      ownerContactId: resolvedInput.ownerContactId,
      leadId: resolvedInput.leadId,
      listingPriceCents: resolvedInput.listingPriceCents,
      currency: resolvedInput.currency ?? "AUD",
      metadata: meta as Prisma.InputJsonValue,
      ...(externalRefs
        ? { externalRefs: externalRefs as Prisma.InputJsonValue }
        : {}),
    },
  });

  const address = formatPropertyAddress(property);

  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "Property",
      entityId: property.id,
      activityType: "created",
      title: "Property created",
      body: address,
      sourceApp: "real-estate",
      createdBy: input.actorId,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "Property",
    entityId: property.id,
    changes: { after: serializeProperty(property) } as unknown as Prisma.InputJsonValue,
  });

  await platformEvents.publish({
    type: "property.created",
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "Property",
    entityId: property.id,
    payload: { address, status: property.status },
    occurredAt: new Date(),
  });

  return serializeProperty(property);
}

async function applyResolvedAddressToProperty(
  organisationId: string,
  propertyId: string,
  resolved: ResolvedAddressPayload,
  actorId?: string,
  activityTitle = "Property address updated",
) {
  const { prisma } = await import("@dg/database");

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!property) return null;

  const { metadata, externalRefs } = mergeCotalityIntoPropertyData(
    {
      ...((property.metadata as Record<string, unknown> | null) ?? {}),
      ...resolved.metadata,
      address_refreshed_at: new Date().toISOString(),
    },
    (property.externalRefs as Record<string, unknown> | null) ?? {},
    resolved.metadata,
  );

  const updated = await prisma.property.update({
    where: { id: propertyId },
    data: {
      addressLine1: resolved.addressLine1,
      suburb: resolved.suburb,
      state: resolved.state,
      postcode: resolved.postcode,
      metadata: metadata as Prisma.InputJsonValue,
      externalRefs: externalRefs as Prisma.InputJsonValue,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId,
      entityType: "Property",
      entityId: propertyId,
      activityType: "address_updated",
      title: activityTitle,
      body: formatPropertyAddress(updated),
      sourceApp: "real-estate",
      createdBy: actorId,
      metadata: {
        geocode_source: resolved.geocodeSource ?? null,
        address_confidence: resolved.confidence,
        corelogic_property_id: metadata.corelogic_property_id ?? null,
      } as Prisma.InputJsonValue,
    },
  });

  return serializeProperty(updated);
}

export async function createPropertyFromLead(input: CreatePropertyFromLeadInput) {
  const { prisma } = await import("@dg/database");

  const lead = await prisma.lead.findFirst({
    where: { id: input.leadId, organisationId: input.organisationId },
  });
  if (!lead) return null;

  const existing = await prisma.property.findFirst({
    where: {
      organisationId: input.organisationId,
      leadId: input.leadId,
      deletedAt: null,
    },
  });
  if (existing) return serializeProperty(existing);

  const metadata = (lead.metadata as Record<string, unknown> | null) ?? {};
  const rawAddress =
    input.addressLine1 ??
    (metadata.property_address as string | undefined) ??
    lead.title ??
    "Address TBC";

  const parsed = await resolvePropertyAddress(rawAddress, { geocode: true });

  const leadCotality: Record<string, unknown> = {};
  if (metadata.corelogic_property_id != null && metadata.corelogic_property_id !== "") {
    leadCotality.corelogic_property_id = metadata.corelogic_property_id;
    if (metadata.corelogic_match_type != null) {
      leadCotality.corelogic_match_type = metadata.corelogic_match_type;
    }
    if (metadata.corelogic_matched_address != null) {
      leadCotality.corelogic_matched_address = metadata.corelogic_matched_address;
    }
    leadCotality.corelogic_source =
      metadata.corelogic_source ?? "lead_address_match";
  }

  const property = await createProperty({
    organisationId: input.organisationId,
    actorId: input.actorId,
    addressLine1: parsed.addressLine1,
    suburb:
      input.suburb ??
      (metadata.suburb as string | undefined) ??
      (metadata.property_suburb as string | undefined) ??
      parsed.suburb,
    state:
      input.state ??
      (metadata.state as string | undefined) ??
      (metadata.property_state as string | undefined) ??
      parsed.state,
    postcode:
      input.postcode ??
      (metadata.postcode as string | undefined) ??
      (metadata.property_postcode as string | undefined) ??
      parsed.postcode,
    status: "appraisal",
    ownerContactId: lead.contactId ?? undefined,
    leadId: lead.id,
    metadata: addressMetadataFromParsed(parsed, {
      source_lead_id: lead.id,
      ...leadCotality,
    }),
  });

  const leadMetadata = (lead.metadata as Record<string, unknown> | null) ?? {};
  const currentStage = (leadMetadata.stage as string | undefined) ?? "vendor_lead";
  if (currentStage !== "appraisal") {
    await updateLeadStage(
      input.organisationId,
      input.leadId,
      "appraisal",
      input.actorId,
    );
  }

  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "Lead",
      entityId: lead.id,
      activityType: "property_linked",
      title: "Appraisal property created",
      body: formatPropertyAddress(property),
      sourceApp: "real-estate",
      createdBy: input.actorId,
      metadata: { propertyId: property.id } as Prisma.InputJsonValue,
    },
  });

  return property;
}

/** Re-parse property location from linked lead — fixes street-only Roe imports */
export async function refreshPropertyAddressFromLead(
  organisationId: string,
  propertyId: string,
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!property?.leadId) return null;

  const lead = await prisma.lead.findFirst({
    where: { id: property.leadId, organisationId },
  });
  if (!lead) return null;

  const metadata = (lead.metadata as Record<string, unknown> | null) ?? {};
  const rawAddress =
    (metadata.property_address as string | undefined) ?? lead.title ?? property.addressLine1;
  const resolved = await resolveAddress(rawAddress, { geocode: true });

  return applyResolvedAddressToProperty(
    organisationId,
    propertyId,
    resolved,
    actorId,
    "Property address refined",
  );
}

/** Force geocode + optional Cotality Address Match for a property address */
export async function geocodePropertyAddress(
  organisationId: string,
  propertyId: string,
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!property) return null;

  let rawAddress = formatPropertyAddress(property);
  if (property.leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: property.leadId, organisationId },
    });
    const leadMeta = (lead?.metadata as Record<string, unknown> | null) ?? {};
    rawAddress =
      (leadMeta.property_address as string | undefined) ??
      lead?.title ??
      formatPropertyAddress(property);
  }

  const resolved = await resolveAddress(rawAddress, { forceGeocode: true });
  return applyResolvedAddressToProperty(
    organisationId,
    propertyId,
    resolved,
    actorId,
    resolved.confidence === "geocoded"
      ? "Address found automatically"
      : "Address lookup attempted",
  );
}

export async function matchPropertyWithCotality(
  organisationId: string,
  propertyId: string,
  actorId?: string,
): Promise<
  | {
      ok: true;
      property: ReturnType<typeof serializeProperty>;
      matched: boolean;
      cotalityPropertyId: string | number | null;
      message?: string;
    }
  | { ok: false; reason: "not_found" | "not_configured" | "upstream_error"; message: string }
> {
  const { prisma } = await import("@dg/database");

  if (!coreLogicCredentialsConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message: "CORELOGIC_CLIENT_ID / CORELOGIC_CLIENT_SECRET not configured",
    };
  }

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!property) {
    return { ok: false, reason: "not_found", message: "Property not found" };
  }

  const query = formatPropertyAddress(property);
  const result = await matchCoreLogicAddress(query);

  if (!result.ok) {
    return {
      ok: false,
      reason: result.status === 503 ? "not_configured" : "upstream_error",
      message: result.message,
    };
  }

  const matched = isCoreLogicPropertyMatch(result.match);
  const cotalityMeta: Record<string, unknown> = matched
    ? {
        ...coreLogicMatchToAddressMetadata(result.match),
        corelogic_matched_at: new Date().toISOString(),
      }
    : {
        corelogic_source: "address_match",
        corelogic_match_type: result.match.matchType ?? "N",
        corelogic_matched_at: new Date().toISOString(),
      };

  const { metadata, externalRefs } = mergeCotalityIntoPropertyData(
    (property.metadata as Record<string, unknown> | null) ?? {},
    (property.externalRefs as Record<string, unknown> | null) ?? {},
    cotalityMeta,
  );

  // Clear stale id on honest non-match
  if (!matched) {
    delete metadata.corelogic_property_id;
    delete externalRefs.corelogic_property_id;
  }

  const updated = await prisma.property.update({
    where: { id: propertyId },
    data: {
      metadata: metadata as Prisma.InputJsonValue,
      externalRefs: externalRefs as Prisma.InputJsonValue,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId,
      entityType: "Property",
      entityId: propertyId,
      activityType: matched ? "cotality_matched" : "cotality_no_match",
      title: matched ? "Matched with Cotality" : "Cotality address match — no property id",
      body: matched
        ? `Cotality property id ${String(result.match.propertyId)}`
        : formatPropertyAddress(updated),
      sourceApp: "real-estate",
      createdBy: actorId,
      metadata: {
        corelogic_property_id: matched ? result.match.propertyId ?? null : null,
        corelogic_match_type: result.match.matchType ?? null,
      } as Prisma.InputJsonValue,
    },
  });

  return {
    ok: true,
    property: serializeProperty(updated),
    matched,
    cotalityPropertyId: matched ? (result.match.propertyId ?? null) : null,
    message: matched
      ? undefined
      : "Address Match returned no Cotality property id",
  };
}

/** Persist Cotality Property Details snapshot on Property.metadata (honest fields only). */
function applyCotalityDetailsToPropertyUpdate(
  property: Property,
  snapshot: CoreLogicPropertyDetailsSnapshot,
): {
  metadata: Record<string, unknown>;
  externalRefs: Record<string, unknown>;
  bedrooms?: number | null;
  bathrooms?: number | null;
  propertyType?: string | null;
} {
  const prevMeta = (property.metadata as Record<string, unknown> | null) ?? {};
  const externalRefs = {
    ...((property.externalRefs as Record<string, unknown> | null) ?? {}),
    corelogic_property_id: snapshot.propertyId,
  };

  const metadata: Record<string, unknown> = {
    ...prevMeta,
    corelogic_property_id: snapshot.propertyId,
    corelogic_details: snapshot,
    corelogic_details_fetched_at: snapshot.fetchedAt,
  };

  // Fill empty listing fields from Cotality when present — never invent; don't overwrite set values.
  let bedrooms = property.bedrooms;
  let bathrooms = property.bathrooms;
  let propertyType = property.propertyType;
  const core = snapshot.core;

  if (core?.beds != null && bedrooms == null) bedrooms = core.beds;
  if (core?.baths != null && bathrooms == null) bathrooms = core.baths;
  if (core?.propertyType && !propertyType) {
    propertyType = core.propertySubType || core.propertyType;
  }
  if (core?.carSpaces != null && metadata.car_spaces == null) {
    metadata.car_spaces = core.carSpaces;
  }
  if (core?.landArea != null && !metadata.land_size) {
    metadata.land_size = `${core.landArea} m²`;
  }
  if (snapshot.additional?.floorArea != null && !metadata.building_size) {
    metadata.building_size = `${snapshot.additional.floorArea} m²`;
  }

  return {
    metadata,
    externalRefs,
    bedrooms,
    bathrooms,
    propertyType,
  };
}

/**
 * Pull Cotality Property Details (+ optional AVM) for a matched Property and persist.
 * Requires `externalRefs` / metadata `corelogic_property_id` (run match_cotality first).
 */
export async function pullCotalityPropertyDetails(
  organisationId: string,
  propertyId: string,
  actorId?: string,
  options?: { includeAvm?: boolean },
): Promise<
  | {
      ok: true;
      property: ReturnType<typeof serializeProperty>;
      snapshot: CoreLogicPropertyDetailsSnapshot;
    }
  | {
      ok: false;
      reason:
        | "not_found"
        | "not_configured"
        | "not_matched"
        | "upstream_error";
      message: string;
    }
> {
  const { prisma } = await import("@dg/database");

  if (!coreLogicCredentialsConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message: "CORELOGIC_CLIENT_ID / CORELOGIC_CLIENT_SECRET not configured",
    };
  }

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!property) {
    return { ok: false, reason: "not_found", message: "Property not found" };
  }

  const cotalityId = getPropertyCotalityId({
    metadata: property.metadata as Record<string, unknown> | null,
    externalRefs: property.externalRefs as Record<string, unknown> | null,
  });
  if (cotalityId == null) {
    return {
      ok: false,
      reason: "not_matched",
      message: "Match with Cotality first to obtain a property id",
    };
  }

  const fetched = await fetchCoreLogicPropertyDetails(cotalityId, {
    includeAvm: options?.includeAvm,
  });
  if (!fetched.ok) {
    return {
      ok: false,
      reason: fetched.status === 503 ? "not_configured" : "upstream_error",
      message: fetched.message,
    };
  }

  const patch = applyCotalityDetailsToPropertyUpdate(property, fetched.snapshot);
  const updated = await prisma.property.update({
    where: { id: propertyId },
    data: {
      metadata: patch.metadata as Prisma.InputJsonValue,
      externalRefs: patch.externalRefs as Prisma.InputJsonValue,
      ...(patch.bedrooms !== property.bedrooms
        ? { bedrooms: patch.bedrooms }
        : {}),
      ...(patch.bathrooms !== property.bathrooms
        ? { bathrooms: patch.bathrooms }
        : {}),
      ...(patch.propertyType !== property.propertyType
        ? { propertyType: patch.propertyType }
        : {}),
    },
  });

  const sectionSummary = Object.entries(fetched.snapshot.sections)
    .map(([k, v]) => `${k}:${v}`)
    .join(", ");

  await prisma.activity.create({
    data: {
      organisationId,
      entityType: "Property",
      entityId: propertyId,
      activityType: "cotality_details_pulled",
      title: "Cotality property details pulled",
      body: `Cotality id ${String(cotalityId)} · ${sectionSummary}`,
      sourceApp: "real-estate",
      createdBy: actorId,
      metadata: {
        corelogic_property_id: cotalityId,
        sections: fetched.snapshot.sections,
        fetched_at: fetched.snapshot.fetchedAt,
      } as Prisma.InputJsonValue,
    },
  });

  return {
    ok: true,
    property: serializeProperty(updated),
    snapshot: fetched.snapshot,
  };
}

export function getPropertyCotalityDetails(property: {
  metadata?: Record<string, unknown> | null;
}): CoreLogicPropertyDetailsSnapshot | null {
  const raw = property.metadata?.corelogic_details;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as CoreLogicPropertyDetailsSnapshot;
}

export interface PropertyStatusSyncOptions {
  /** Skip lead stage sync (used when lead drives the change). */
  skipLeadSync?: boolean;
}

export async function updatePropertyStatus(
  organisationId: string,
  propertyId: string,
  status: PropertyStatus,
  actorId?: string,
  options?: PropertyStatusSyncOptions,
) {
  const { prisma } = await import("@dg/database");

  if (!PROPERTY_STATUSES.includes(status)) return null;

  const existing = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!existing) return null;

  const property = await prisma.property.update({
    where: { id: propertyId },
    data: { status },
  });

  await prisma.activity.create({
    data: {
      organisationId,
      entityType: "Property",
      entityId: propertyId,
      activityType: "status_change",
      title: `Status → ${status.replace(/_/g, " ")}`,
      body: formatPropertyAddress(property),
      sourceApp: "real-estate",
      createdBy: actorId,
      metadata: { status } as Prisma.InputJsonValue,
    },
  });

  if (status === "listed") {
    await platformEvents.publish({
      type: "property.listed",
      organisationId,
      actorId,
      entityType: "Property",
      entityId: propertyId,
      payload: { address: formatPropertyAddress(property) },
      occurredAt: new Date(),
    });
  }

  if (!options?.skipLeadSync && existing.leadId) {
    const leadStage = leadStageForPropertyStatus(status);
    if (leadStage) {
      await updateLeadStage(
        organisationId,
        existing.leadId,
        leadStage as VendorStage,
        actorId,
        { skipPropertySync: true },
      );
    }
  }

  await maybeAutoPublishPropertyToWordPress({
    organisationId,
    propertyId,
    status,
    actorId,
  }).catch(() => null);

  return serializeProperty(
    (await prisma.property.findFirst({
      where: { id: propertyId, organisationId, deletedAt: null },
    })) ?? property,
  );
}

export async function updatePropertyListing(
  organisationId: string,
  propertyId: string,
  input: {
    listingPriceCents?: number | null;
    marketing?: Record<string, unknown>;
    propertyType?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    images?: string[];
    carSpaces?: number | null;
    landSize?: string | null;
    buildingSize?: string | null;
    /** Open home / inspection times (synced to WP as roe_property_inspection_times). */
    inspectionTimes?: string | null;
    syncToWebsite?: boolean;
  },
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");

  const existing = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!existing) return null;

  const prevMeta = (existing.metadata as Record<string, unknown> | null) ?? {};
  const prevMarketing = (prevMeta.marketing as Record<string, unknown> | undefined) ?? {};
  const nextMarketing = input.marketing
    ? { ...prevMarketing, ...input.marketing }
    : prevMarketing;

  const metadata: Record<string, unknown> = {
    ...prevMeta,
    marketing: nextMarketing,
  };

  if (input.images !== undefined) {
    metadata.images = input.images.filter((u) => typeof u === "string" && u.trim());
    metadata.featured_image = (metadata.images as string[])[0] ?? null;
  }
  if (input.carSpaces !== undefined) {
    metadata.car_spaces = input.carSpaces;
  }
  if (input.landSize !== undefined) {
    metadata.land_size = input.landSize?.trim() || null;
  }
  if (input.buildingSize !== undefined) {
    metadata.building_size = input.buildingSize?.trim() || null;
  }
  if (input.inspectionTimes !== undefined) {
    metadata.inspection_times = input.inspectionTimes?.trim() || null;
  }

  const property = await prisma.property.update({
    where: { id: propertyId },
    data: {
      listingPriceCents:
        input.listingPriceCents !== undefined
          ? input.listingPriceCents
          : existing.listingPriceCents,
      propertyType:
        input.propertyType !== undefined
          ? input.propertyType?.trim() || null
          : existing.propertyType,
      bedrooms: input.bedrooms !== undefined ? input.bedrooms : existing.bedrooms,
      bathrooms: input.bathrooms !== undefined ? input.bathrooms : existing.bathrooms,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId,
      entityType: "Property",
      entityId: propertyId,
      activityType: "listing_updated",
      title: "Listing details updated",
      body: formatPropertyAddress(property),
      sourceApp: "real-estate",
      createdBy: actorId,
    },
  });

  const shouldSync =
    input.syncToWebsite !== false &&
    (((property.externalRefs as Record<string, unknown> | null) ?? {}).wp_property_id ||
      WEBSITE_PUBLISH_STATUSES.has(property.status));

  if (shouldSync) {
    await maybeAutoPublishPropertyToWordPress({
      organisationId,
      propertyId,
      status: property.status,
      actorId,
    }).catch(() => null);
  }

  return serializeProperty(
    (await prisma.property.findFirst({
      where: { id: propertyId, organisationId, deletedAt: null },
    })) ?? property,
  );
}

export async function getPropertyForLead(organisationId: string, leadId: string) {
  const { prisma } = await import("@dg/database");
  const property = await prisma.property.findFirst({
    where: { organisationId, leadId, deletedAt: null },
  });
  return property ? serializeProperty(property) : null;
}

export async function listPropertyActivities(organisationId: string, propertyId: string) {
  const { prisma } = await import("@dg/database");

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!property) return null;

  const activities = await prisma.activity.findMany({
    where: {
      organisationId,
      entityType: "Property",
      entityId: propertyId,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return activities.map((a) => ({
    id: a.id,
    activityType: a.activityType,
    title: a.title,
    body: a.body,
    sourceApp: a.sourceApp,
    createdBy: a.createdBy,
    createdAt: a.createdAt.toISOString(),
  }));
}
