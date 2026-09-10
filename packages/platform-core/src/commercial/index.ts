import type { CommercialLease, CommercialProperty } from "@dg/database";

import { writeAuditLog } from "../audit";
import type {
  CommercialLeaseRecord,
  CommercialPropertyRecord,
  CreateCommercialLeaseInput,
  CreateCommercialPropertyInput,
} from "./types";

export type LinkedCommercialRelation =
  | "commercial_property"
  | "landlord_contact"
  | "tenant_contact";

export class LinkedCommercialRecordNotFoundError extends Error {
  readonly code: `linked_${LinkedCommercialRelation}_not_found`;
  readonly relation: LinkedCommercialRelation;

  constructor(relation: LinkedCommercialRelation) {
    super(`Linked ${relation.replace(/_/g, " ")} not found in this organisation`);
    this.name = "LinkedCommercialRecordNotFoundError";
    this.relation = relation;
    this.code = `linked_${relation}_not_found`;
  }
}

export function isLinkedCommercialRecordNotFoundError(
  error: unknown,
): error is LinkedCommercialRecordNotFoundError {
  return (
    error instanceof LinkedCommercialRecordNotFoundError ||
    (error instanceof Error && error.name === "LinkedCommercialRecordNotFoundError")
  );
}

function normalizeOptionalRelationId(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || null;
}

async function assertCommercialPropertyInOrganisation(
  organisationId: string,
  commercialPropertyId: string,
): Promise<void> {
  const { prisma } = await import("@dg/database");
  const property = await prisma.commercialProperty.findFirst({
    where: { id: commercialPropertyId, organisationId },
    select: { id: true },
  });
  if (!property) {
    throw new LinkedCommercialRecordNotFoundError("commercial_property");
  }
}

async function assertCommercialContactInOrganisation(
  organisationId: string,
  contactId: string,
  relation: Extract<LinkedCommercialRelation, "landlord_contact" | "tenant_contact">,
): Promise<void> {
  const { prisma } = await import("@dg/database");
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organisationId, deletedAt: null },
    select: { id: true },
  });
  if (!contact) {
    throw new LinkedCommercialRecordNotFoundError(relation);
  }
}

async function resolveCommercialLeaseRelationshipIds(
  organisationId: string,
  input: {
    commercialPropertyId?: string | null;
    landlordContactId?: string | null;
    tenantContactId?: string | null;
  },
): Promise<{
  commercialPropertyId?: string | null;
  landlordContactId?: string | null;
  tenantContactId?: string | null;
}> {
  const commercialPropertyId = normalizeOptionalRelationId(input.commercialPropertyId);
  const landlordContactId = normalizeOptionalRelationId(input.landlordContactId);
  const tenantContactId = normalizeOptionalRelationId(input.tenantContactId);

  if (commercialPropertyId) {
    await assertCommercialPropertyInOrganisation(organisationId, commercialPropertyId);
  }
  if (landlordContactId) {
    await assertCommercialContactInOrganisation(
      organisationId,
      landlordContactId,
      "landlord_contact",
    );
  }
  if (tenantContactId) {
    await assertCommercialContactInOrganisation(
      organisationId,
      tenantContactId,
      "tenant_contact",
    );
  }

  return { commercialPropertyId, landlordContactId, tenantContactId };
}

function serializeProperty(row: CommercialProperty): CommercialPropertyRecord {
  return {
    id: row.id,
    organisationId: row.organisationId,
    name: row.name,
    addressLine1: row.addressLine1,
    suburb: row.suburb,
    state: row.state,
    postcode: row.postcode,
    country: row.country,
    status: row.status,
    propertyType: row.propertyType,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeLease(row: CommercialLease): CommercialLeaseRecord {
  return {
    id: row.id,
    organisationId: row.organisationId,
    commercialPropertyId: row.commercialPropertyId,
    title: row.title,
    stage: row.stage,
    status: row.status,
    landlordContactId: row.landlordContactId,
    tenantContactId: row.tenantContactId,
    rentCents: row.rentCents,
    startDate: row.startDate?.toISOString() ?? null,
    endDate: row.endDate?.toISOString() ?? null,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listCommercialProperties(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const items = await prisma.commercialProperty.findMany({
    where: { organisationId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return { items: items.map(serializeProperty), meta: { total: items.length } };
}

export async function createCommercialProperty(input: CreateCommercialPropertyInput) {
  const { prisma } = await import("@dg/database");
  const row = await prisma.commercialProperty.create({
    data: {
      organisationId: input.organisationId,
      name: input.name.trim(),
      addressLine1: input.addressLine1.trim(),
      suburb: input.suburb.trim(),
      state: input.state.trim(),
      postcode: input.postcode.trim(),
      country: input.country?.trim() || "AU",
      propertyType: input.propertyType?.trim() || null,
    },
  });
  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "CommercialProperty",
    entityId: row.id,
    changes: { after: { name: row.name } },
  });
  return serializeProperty(row);
}

export async function listCommercialLeases(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const items = await prisma.commercialLease.findMany({
    where: { organisationId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return { items: items.map(serializeLease), meta: { total: items.length } };
}

export async function createCommercialLease(input: CreateCommercialLeaseInput) {
  const { prisma } = await import("@dg/database");
  const links = await resolveCommercialLeaseRelationshipIds(input.organisationId, {
    commercialPropertyId: input.commercialPropertyId,
    landlordContactId: input.landlordContactId,
    tenantContactId: input.tenantContactId,
  });
  const row = await prisma.commercialLease.create({
    data: {
      organisationId: input.organisationId,
      title: input.title.trim(),
      commercialPropertyId: links.commercialPropertyId ?? null,
      stage: input.stage?.trim() || "prospect",
      landlordContactId: links.landlordContactId ?? null,
      tenantContactId: links.tenantContactId ?? null,
      rentCents: input.rentCents ?? null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      notes: input.notes?.trim() || null,
    },
  });
  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "CommercialLease",
    entityId: row.id,
    changes: { after: { title: row.title } },
  });
  return serializeLease(row);
}

export async function getCommercialOverviewCounts(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const [properties, leases, activeLeases] = await Promise.all([
    prisma.commercialProperty.count({ where: { organisationId } }),
    prisma.commercialLease.count({ where: { organisationId } }),
    prisma.commercialLease.count({ where: { organisationId, status: "active" } }),
  ]);
  return { properties, leases, activeLeases };
}

/** Distinct CRM contacts linked as tenants on commercial leases. */
export async function listCommercialTenantContacts(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const leases = await prisma.commercialLease.findMany({
    where: { organisationId, tenantContactId: { not: null } },
    select: {
      id: true,
      title: true,
      tenantContactId: true,
      status: true,
    },
    take: 200,
  });

  const contactIds = [
    ...new Set(
      leases
        .map((l) => l.tenantContactId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (contactIds.length === 0) {
    return {
      items: [] as Array<{
        contactId: string;
        firstName: string;
        lastName: string | null;
        email: string | null;
        phone: string | null;
        leaseCount: number;
        leases: Array<{ id: string; title: string; status: string }>;
      }>,
    };
  }

  const contacts = await prisma.contact.findMany({
    where: { organisationId, id: { in: contactIds }, deletedAt: null },
  });

  return {
    items: contacts.map((c) => {
      const linked = leases.filter((l) => l.tenantContactId === c.id);
      return {
        contactId: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        leaseCount: linked.length,
        leases: linked.map((l) => ({
          id: l.id,
          title: l.title,
          status: l.status,
        })),
      };
    }),
  };
}
