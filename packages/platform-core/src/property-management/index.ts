import type { PmLease } from "@dg/database";

import { writeAuditLog } from "../audit";

export type PmLeaseRecord = {
  id: string;
  organisationId: string;
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

export type CreatePmLeaseInput = {
  organisationId: string;
  actorId?: string;
  title: string;
  addressLine1?: string;
  suburb?: string;
  stage?: string;
  ownerContactId?: string;
  tenantContactId?: string;
  rentCents?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
};

function serialize(row: PmLease): PmLeaseRecord {
  return {
    id: row.id,
    organisationId: row.organisationId,
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

export async function listPmLeases(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const items = await prisma.pmLease.findMany({
    where: { organisationId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return { items: items.map(serialize), meta: { total: items.length } };
}

export async function createPmLease(input: CreatePmLeaseInput) {
  const { prisma } = await import("@dg/database");
  const row = await prisma.pmLease.create({
    data: {
      organisationId: input.organisationId,
      title: input.title.trim(),
      addressLine1: input.addressLine1?.trim() || null,
      suburb: input.suburb?.trim() || null,
      stage: input.stage?.trim() || "application",
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
  return serialize(row);
}
