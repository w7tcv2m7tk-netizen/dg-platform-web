import type { CommercialLease, CommercialProperty } from "@dg/database";

import { writeAuditLog } from "../audit";
import type {
  CommercialLeaseRecord,
  CommercialPropertyRecord,
  CreateCommercialLeaseInput,
  CreateCommercialPropertyInput,
} from "./types";

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
  const row = await prisma.commercialLease.create({
    data: {
      organisationId: input.organisationId,
      title: input.title.trim(),
      commercialPropertyId: input.commercialPropertyId || null,
      stage: input.stage?.trim() || "prospect",
      landlordContactId: input.landlordContactId || null,
      tenantContactId: input.tenantContactId || null,
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
