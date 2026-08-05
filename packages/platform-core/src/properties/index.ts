import type { Property, Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import { platformEvents } from "../events";
import { updateLeadStage } from "../leads";

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

/** Loose AU address parse — falls back to line1-only when pattern doesn't match */
export function parsePropertyAddress(raw: string) {
  const trimmed = raw.trim();
  const match = trimmed.match(
    /^(.+?),\s*(.+?)\s+(QLD|NSW|VIC|SA|WA|TAS|NT|ACT)\s+(\d{4})$/i,
  );
  if (match) {
    return {
      addressLine1: match[1].trim(),
      suburb: match[2].trim(),
      state: match[3].toUpperCase(),
      postcode: match[4],
    };
  }
  return {
    addressLine1: trimmed,
    suburb: "Unknown",
    state: "QLD",
    postcode: "0000",
  };
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

export async function createProperty(input: CreatePropertyInput) {
  const { prisma } = await import("@dg/database");

  const property = await prisma.property.create({
    data: {
      organisationId: input.organisationId,
      addressLine1: input.addressLine1.trim(),
      addressLine2: input.addressLine2?.trim() || null,
      suburb: input.suburb.trim(),
      state: input.state.trim().toUpperCase(),
      postcode: input.postcode.trim(),
      country: input.country ?? "AU",
      status: input.status ?? "prospect",
      propertyType: input.propertyType,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      ownerContactId: input.ownerContactId,
      leadId: input.leadId,
      listingPriceCents: input.listingPriceCents,
      currency: input.currency ?? "AUD",
      metadata: input.metadata as Prisma.InputJsonValue,
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

  const parsed = parsePropertyAddress(rawAddress);

  const property = await createProperty({
    organisationId: input.organisationId,
    actorId: input.actorId,
    addressLine1: parsed.addressLine1,
    suburb: input.suburb ?? parsed.suburb,
    state: input.state ?? parsed.state,
    postcode: input.postcode ?? parsed.postcode,
    status: "appraisal",
    ownerContactId: lead.contactId ?? undefined,
    leadId: lead.id,
    metadata: { source_lead_id: lead.id },
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

export async function updatePropertyStatus(
  organisationId: string,
  propertyId: string,
  status: PropertyStatus,
  actorId?: string,
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
