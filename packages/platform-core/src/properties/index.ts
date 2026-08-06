import type { Property, Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import { platformEvents } from "../events";
import { updateLeadStage, type VendorStage } from "../leads";
import { leadStageForPropertyStatus } from "../real-estate/pipeline";
import {
  addressMetadataFromParsed,
  resolveAddress,
  shouldAutoResolveAddress,
} from "../addresses";
import { parsePropertyAddress, resolvePropertyAddress } from "./address";

export { parsePropertyAddress, needsAddressRefinement, resolvePropertyAddress } from "./address";
export type { ParsedPropertyAddress } from "./address";
export { geocodeAustralianAddress, isGeocodingConfigured } from "./geocode";
export type { GeocodeResult } from "./geocode";

export const PROPERTY_STATUSES = [
  "prospect",
  "appraisal",
  "listed",
  "under_offer",
  "sold",
  "withdrawn",
] as const;

export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

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
      metadata: resolvedInput.metadata as Prisma.InputJsonValue,
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
  parsed: Awaited<ReturnType<typeof resolvePropertyAddress>>,
  actorId?: string,
  activityTitle = "Property address updated",
) {
  const { prisma } = await import("@dg/database");

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!property) return null;

  const updated = await prisma.property.update({
    where: { id: propertyId },
    data: {
      addressLine1: parsed.addressLine1,
      suburb: parsed.suburb,
      state: parsed.state,
      postcode: parsed.postcode,
      metadata: {
        ...((property.metadata as Record<string, unknown> | null) ?? {}),
        ...addressMetadataFromParsed(parsed, {
          address_refreshed_at: new Date().toISOString(),
        }),
      } as Prisma.InputJsonValue,
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
        geocode_source: parsed.geocodeSource ?? null,
        address_confidence: parsed.confidence,
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
    metadata: addressMetadataFromParsed(parsed, { source_lead_id: lead.id }),
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
  const parsed = await resolvePropertyAddress(rawAddress, { geocode: true });

  return applyResolvedAddressToProperty(
    organisationId,
    propertyId,
    parsed,
    actorId,
    "Property address refined",
  );
}

/** Force geocode lookup for a property address */
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

  let rawAddress = property.addressLine1;
  if (property.leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: property.leadId, organisationId },
    });
    const leadMeta = (lead?.metadata as Record<string, unknown> | null) ?? {};
    rawAddress =
      (leadMeta.property_address as string | undefined) ??
      lead?.title ??
      property.addressLine1;
  }

  const parsed = await resolvePropertyAddress(rawAddress, { forceGeocode: true });
  return applyResolvedAddressToProperty(
    organisationId,
    propertyId,
    parsed,
    actorId,
    parsed.confidence === "geocoded"
      ? "Address found automatically"
      : "Address lookup attempted",
  );
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

  return serializeProperty(property);
}

export async function updatePropertyListing(
  organisationId: string,
  propertyId: string,
  input: {
    listingPriceCents?: number | null;
    marketing?: Record<string, unknown>;
  },
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");

  const existing = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!existing) return null;

  const metadata = {
    ...((existing.metadata as Record<string, unknown> | null) ?? {}),
    ...(input.marketing ? { marketing: input.marketing } : {}),
  };

  const property = await prisma.property.update({
    where: { id: propertyId },
    data: {
      listingPriceCents: input.listingPriceCents ?? existing.listingPriceCents,
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

  return serializeProperty(property);
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
