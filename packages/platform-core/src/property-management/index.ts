import type { PmLease, PmMaintenanceRequest, PmProperty, Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";

export type PmPropertyRecord = {
  id: string;
  organisationId: string;
  name: string;
  addressLine1: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  status: string;
  propertyType: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PmLeaseRecord = {
  id: string;
  organisationId: string;
  propertyId: string | null;
  title: string;
  addressLine1: string | null;
  suburb: string | null;
  stage: string;
  status: string;
  ownerContactId: string | null;
  tenantContactId: string | null;
  rentCents: number | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PmMaintenanceRecord = {
  id: string;
  organisationId: string;
  propertyId: string | null;
  contactId: string | null;
  title: string;
  status: string;
  priority: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePmPropertyInput = {
  organisationId: string;
  actorId?: string;
  name: string;
  addressLine1: string;
  suburb: string;
  state?: string;
  postcode?: string;
  country?: string;
  propertyType?: string;
  status?: string;
};

export type CreatePmLeaseInput = {
  organisationId: string;
  actorId?: string;
  title: string;
  propertyId?: string;
  addressLine1?: string;
  suburb?: string;
  stage?: string;
  status?: string;
  ownerContactId?: string;
  tenantContactId?: string;
  rentCents?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
};

export type UpdatePmLeaseInput = {
  organisationId: string;
  leaseId: string;
  actorId?: string;
  title?: string;
  propertyId?: string | null;
  addressLine1?: string | null;
  suburb?: string | null;
  stage?: string;
  status?: string;
  ownerContactId?: string | null;
  tenantContactId?: string | null;
  rentCents?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
};

export type CreatePmMaintenanceInput = {
  organisationId: string;
  actorId?: string;
  title: string;
  propertyId?: string;
  contactId?: string;
  status?: string;
  priority?: string;
  notes?: string;
};

export type UpdatePmMaintenanceInput = {
  organisationId: string;
  requestId: string;
  actorId?: string;
  title?: string;
  propertyId?: string | null;
  contactId?: string | null;
  status?: string;
  priority?: string;
  notes?: string | null;
};

function serializeProperty(row: PmProperty): PmPropertyRecord {
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeLease(row: PmLease): PmLeaseRecord {
  return {
    id: row.id,
    organisationId: row.organisationId,
    propertyId: row.propertyId,
    title: row.title,
    addressLine1: row.addressLine1,
    suburb: row.suburb,
    stage: row.stage,
    status: row.status,
    ownerContactId: row.ownerContactId,
    tenantContactId: row.tenantContactId,
    rentCents: row.rentCents,
    startDate: row.startDate?.toISOString() ?? null,
    endDate: row.endDate?.toISOString() ?? null,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeMaintenance(row: PmMaintenanceRequest): PmMaintenanceRecord {
  return {
    id: row.id,
    organisationId: row.organisationId,
    propertyId: row.propertyId,
    contactId: row.contactId,
    title: row.title,
    status: row.status,
    priority: row.priority,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listPmProperties(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const items = await prisma.pmProperty.findMany({
    where: { organisationId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return { items: items.map(serializeProperty), meta: { total: items.length } };
}

export async function createPmProperty(input: CreatePmPropertyInput) {
  const { prisma } = await import("@dg/database");
  const row = await prisma.pmProperty.create({
    data: {
      organisationId: input.organisationId,
      name: input.name.trim(),
      addressLine1: input.addressLine1.trim(),
      suburb: input.suburb.trim(),
      state: input.state?.trim() || "QLD",
      postcode: input.postcode?.trim() || "",
      country: input.country?.trim() || "AU",
      propertyType: input.propertyType?.trim() || null,
      status: input.status?.trim() || "active",
    },
  });
  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "PmProperty",
    entityId: row.id,
    changes: { after: { name: row.name } },
  });
  return serializeProperty(row);
}

export async function listPmLeases(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const items = await prisma.pmLease.findMany({
    where: { organisationId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return { items: items.map(serializeLease), meta: { total: items.length } };
}

export async function createPmLease(input: CreatePmLeaseInput) {
  const { prisma } = await import("@dg/database");
  const row = await prisma.pmLease.create({
    data: {
      organisationId: input.organisationId,
      propertyId: input.propertyId || null,
      title: input.title.trim(),
      addressLine1: input.addressLine1?.trim() || null,
      suburb: input.suburb?.trim() || null,
      stage: input.stage?.trim() || "application",
      status: input.status?.trim() || "active",
      ownerContactId: input.ownerContactId || null,
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
    entityType: "PmLease",
    entityId: row.id,
    changes: { after: { title: row.title } },
  });
  return serializeLease(row);
}

export async function updatePmLease(input: UpdatePmLeaseInput) {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.pmLease.findFirst({
    where: { id: input.leaseId, organisationId: input.organisationId },
  });
  if (!existing) return null;

  const data: Prisma.PmLeaseUpdateInput = {};
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.propertyId !== undefined) {
    data.property = input.propertyId
      ? { connect: { id: input.propertyId } }
      : { disconnect: true };
  }
  if (input.addressLine1 !== undefined) data.addressLine1 = input.addressLine1;
  if (input.suburb !== undefined) data.suburb = input.suburb;
  if (input.stage !== undefined) data.stage = input.stage.trim();
  if (input.status !== undefined) data.status = input.status.trim();
  if (input.ownerContactId !== undefined) {
    data.ownerContact = input.ownerContactId
      ? { connect: { id: input.ownerContactId } }
      : { disconnect: true };
  }
  if (input.tenantContactId !== undefined) {
    data.tenantContact = input.tenantContactId
      ? { connect: { id: input.tenantContactId } }
      : { disconnect: true };
  }
  if (input.rentCents !== undefined) data.rentCents = input.rentCents;
  if (input.startDate !== undefined) {
    data.startDate = input.startDate ? new Date(input.startDate) : null;
  }
  if (input.endDate !== undefined) {
    data.endDate = input.endDate ? new Date(input.endDate) : null;
  }
  if (input.notes !== undefined) data.notes = input.notes;

  const row = await prisma.pmLease.update({
    where: { id: existing.id },
    data,
  });
  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "PmLease",
    entityId: row.id,
    changes: { after: { stage: row.stage, status: row.status, propertyId: row.propertyId } },
  });
  return serializeLease(row);
}

export async function listPmMaintenance(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const items = await prisma.pmMaintenanceRequest.findMany({
    where: { organisationId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return { items: items.map(serializeMaintenance), meta: { total: items.length } };
}

export async function createPmMaintenance(input: CreatePmMaintenanceInput) {
  const { prisma } = await import("@dg/database");
  const row = await prisma.pmMaintenanceRequest.create({
    data: {
      organisationId: input.organisationId,
      propertyId: input.propertyId || null,
      contactId: input.contactId || null,
      title: input.title.trim(),
      status: input.status?.trim() || "open",
      priority: input.priority?.trim() || "normal",
      notes: input.notes?.trim() || null,
    },
  });
  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "PmMaintenanceRequest",
    entityId: row.id,
    changes: { after: { title: row.title } },
  });
  return serializeMaintenance(row);
}

export async function updatePmMaintenance(input: UpdatePmMaintenanceInput) {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.pmMaintenanceRequest.findFirst({
    where: { id: input.requestId, organisationId: input.organisationId },
  });
  if (!existing) return null;

  const data: Prisma.PmMaintenanceRequestUpdateInput = {};
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.propertyId !== undefined) {
    data.property = input.propertyId
      ? { connect: { id: input.propertyId } }
      : { disconnect: true };
  }
  if (input.contactId !== undefined) {
    data.contact = input.contactId
      ? { connect: { id: input.contactId } }
      : { disconnect: true };
  }
  if (input.status !== undefined) data.status = input.status.trim();
  if (input.priority !== undefined) data.priority = input.priority.trim();
  if (input.notes !== undefined) data.notes = input.notes;

  const row = await prisma.pmMaintenanceRequest.update({
    where: { id: existing.id },
    data,
  });
  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "PmMaintenanceRequest",
    entityId: row.id,
    changes: { after: { status: row.status } },
  });
  return serializeMaintenance(row);
}

export async function getPmOverviewCounts(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const [properties, leases, openMaintenance, activeLeases] = await Promise.all([
    prisma.pmProperty.count({ where: { organisationId } }),
    prisma.pmLease.count({ where: { organisationId } }),
    prisma.pmMaintenanceRequest.count({
      where: { organisationId, status: { in: ["open", "in_progress"] } },
    }),
    prisma.pmLease.count({ where: { organisationId, status: "active" } }),
  ]);
  return { properties, leases, activeLeases, openMaintenance };
}

/** Distinct CRM contacts linked as owners / tenants on PM leases. */
export async function listPmPartyContacts(
  organisationId: string,
  role: "owner" | "tenant",
) {
  const { prisma } = await import("@dg/database");
  const field = role === "owner" ? "ownerContactId" : "tenantContactId";
  const leases = await prisma.pmLease.findMany({
    where: {
      organisationId,
      [field]: { not: null },
    },
    select: {
      id: true,
      title: true,
      ownerContactId: true,
      tenantContactId: true,
      status: true,
    },
    take: 200,
  });

  const contactIds = [
    ...new Set(
      leases
        .map((l) => (role === "owner" ? l.ownerContactId : l.tenantContactId))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (contactIds.length === 0) {
    return { items: [] as Array<{
      contactId: string;
      firstName: string;
      lastName: string | null;
      email: string | null;
      phone: string | null;
      leaseCount: number;
      leases: Array<{ id: string; title: string; status: string }>;
    }> };
  }

  const contacts = await prisma.contact.findMany({
    where: { organisationId, id: { in: contactIds }, deletedAt: null },
  });

  return {
    items: contacts.map((c) => {
      const linked = leases.filter(
        (l) =>
          (role === "owner" ? l.ownerContactId : l.tenantContactId) === c.id,
      );
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
