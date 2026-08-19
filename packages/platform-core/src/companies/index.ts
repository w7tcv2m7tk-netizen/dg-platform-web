import type { Company, Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import { platformEvents } from "../events";

export interface CreateCompanyInput {
  organisationId: string;
  actorId?: string;
  name: string;
  website?: string;
  phone?: string;
  email?: string;
  industry?: string;
}

export interface UpdateCompanyInput {
  organisationId: string;
  companyId: string;
  actorId?: string;
  name?: string;
  website?: string;
  phone?: string;
  email?: string;
  industry?: string;
}

export interface ListCompaniesOptions {
  organisationId: string;
  search?: string;
  limit?: number;
  offset?: number;
}

function serializeCompany(company: Company, contactCount = 0) {
  return {
    id: company.id,
    organisationId: company.organisationId,
    name: company.name,
    website: company.website,
    phone: company.phone,
    email: company.email,
    industry: company.industry,
    contactCount,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
  };
}

export async function listCompanies(options: ListCompaniesOptions) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options.limit ?? 50, 100);
  const offset = options.offset ?? 0;

  const where: Prisma.CompanyWhereInput = {
    organisationId: options.organisationId,
    deletedAt: null,
  };

  if (options.search?.trim()) {
    const q = options.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { industry: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.company.count({ where }),
  ]);

  const counts = await prisma.contact.groupBy({
    by: ["companyId"],
    where: {
      organisationId: options.organisationId,
      companyId: { in: items.map((c) => c.id) },
      deletedAt: null,
    },
    _count: { id: true },
  });
  const countMap = new Map(counts.map((c) => [c.companyId, c._count.id]));

  return {
    items: items.map((c) => serializeCompany(c, countMap.get(c.id) ?? 0)),
    meta: { total, limit, offset },
  };
}

export async function getCompany(organisationId: string, companyId: string) {
  const { prisma } = await import("@dg/database");

  const company = await prisma.company.findFirst({
    where: { id: companyId, organisationId, deletedAt: null },
  });
  if (!company) return null;

  const contactCount = await prisma.contact.count({
    where: { organisationId, companyId, deletedAt: null },
  });

  return serializeCompany(company, contactCount);
}

export async function listCompanyContacts(organisationId: string, companyId: string) {
  const { prisma } = await import("@dg/database");

  const company = await prisma.company.findFirst({
    where: { id: companyId, organisationId, deletedAt: null },
  });
  if (!company) return null;

  const contacts = await prisma.contact.findMany({
    where: { organisationId, companyId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return contacts.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    status: c.status,
  }));
}

export async function createCompany(input: CreateCompanyInput) {
  const { prisma } = await import("@dg/database");

  const company = await prisma.company.create({
    data: {
      organisationId: input.organisationId,
      name: input.name.trim(),
      website: input.website?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      industry: input.industry?.trim() || null,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "Company",
      entityId: company.id,
      activityType: "created",
      title: "Company created",
      body: company.name,
      sourceApp: "crm",
      createdBy: input.actorId,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "Company",
    entityId: company.id,
    changes: { after: serializeCompany(company) },
  });

  await platformEvents.publish({
    type: "company.created",
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "Company",
    entityId: company.id,
    payload: { name: company.name },
    occurredAt: new Date(),
  });

  return serializeCompany(company);
}

export async function updateCompany(input: UpdateCompanyInput) {
  const { prisma } = await import("@dg/database");

  const existing = await prisma.company.findFirst({
    where: {
      id: input.companyId,
      organisationId: input.organisationId,
      deletedAt: null,
    },
  });
  if (!existing) return null;

  const data: Prisma.CompanyUpdateInput = {};
  const changes: Record<string, { before: unknown; after: unknown }> = {};

  for (const [field, raw] of [
    ["name", input.name?.trim()],
    ["website", input.website?.trim() || null],
    ["phone", input.phone?.trim() || null],
    ["email", input.email?.trim().toLowerCase() || null],
    ["industry", input.industry?.trim() || null],
  ] as const) {
    if (raw === undefined) continue;
    const before = existing[field as keyof Company];
    if (before !== raw) {
      changes[field] = { before, after: raw };
      (data as Record<string, unknown>)[field] = raw;
    }
  }

  if (Object.keys(data).length === 0) {
    return serializeCompany(existing);
  }

  const company = await prisma.company.update({
    where: { id: input.companyId },
    data,
  });

  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "Company",
      entityId: company.id,
      activityType: "updated",
      title: "Company updated",
      body: Object.keys(changes).join(", "),
      sourceApp: "crm",
      createdBy: input.actorId,
      metadata: { changes } as Prisma.InputJsonValue,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "Company",
    entityId: company.id,
    changes: changes as unknown as Prisma.InputJsonValue,
  });

  return serializeCompany(company);
}

export async function deleteCompany(input: {
  organisationId: string;
  companyId: string;
  actorId?: string;
}) {
  const { prisma } = await import("@dg/database");

  const existing = await prisma.company.findFirst({
    where: {
      id: input.companyId,
      organisationId: input.organisationId,
      deletedAt: null,
    },
  });
  if (!existing) return null;

  await prisma.contact.updateMany({
    where: {
      organisationId: input.organisationId,
      companyId: input.companyId,
    },
    data: { companyId: null },
  });

  const company = await prisma.company.update({
    where: { id: input.companyId },
    data: { deletedAt: new Date() },
  });

  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "Company",
      entityId: company.id,
      activityType: "deleted",
      title: "Company deleted",
      body: existing.name,
      sourceApp: "crm",
      createdBy: input.actorId,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "delete",
    entityType: "Company",
    entityId: company.id,
    changes: { before: serializeCompany(existing) } as unknown as Prisma.InputJsonValue,
  });

  return serializeCompany(company);
}
