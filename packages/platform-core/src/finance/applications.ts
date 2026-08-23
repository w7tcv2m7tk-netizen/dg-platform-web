import type { FinanceApplication, Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import type {
  CreateFinanceApplicationInput,
  FinanceApplicationRecord,
  FinanceApplicationStatus,
  ListFinanceApplicationsOptions,
  UpdateFinanceApplicationInput,
} from "./types";

function serialize(row: FinanceApplication): FinanceApplicationRecord {
  return {
    id: row.id,
    organisationId: row.organisationId,
    title: row.title,
    stage: row.stage,
    status: row.status as FinanceApplicationStatus,
    contactId: row.contactId,
    loanAmountCents: row.loanAmountCents,
    lenderName: row.lenderName,
    notes: row.notes,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listFinanceApplications(options: ListFinanceApplicationsOptions) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options.limit ?? 50, 100);
  const offset = options.offset ?? 0;
  const where: Prisma.FinanceApplicationWhereInput = {
    organisationId: options.organisationId,
  };
  if (options.status) where.status = options.status;
  if (options.stage) where.stage = options.stage;
  const q = options.q?.trim();
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { lenderName: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.financeApplication.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.financeApplication.count({ where }),
  ]);

  return { items: items.map(serialize), meta: { total, limit, offset } };
}

export async function createFinanceApplication(input: CreateFinanceApplicationInput) {
  const { prisma } = await import("@dg/database");
  const row = await prisma.financeApplication.create({
    data: {
      organisationId: input.organisationId,
      title: input.title.trim(),
      stage: input.stage?.trim() || "enquiry",
      contactId: input.contactId || null,
      loanAmountCents: input.loanAmountCents ?? null,
      lenderName: input.lenderName?.trim() || null,
      notes: input.notes?.trim() || null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "FinanceApplication",
    entityId: row.id,
    changes: { after: { title: row.title, stage: row.stage } },
  });

  return serialize(row);
}

export async function updateFinanceApplication(input: UpdateFinanceApplicationInput) {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.financeApplication.findFirst({
    where: { id: input.applicationId, organisationId: input.organisationId },
  });
  if (!existing) return null;

  const data: Prisma.FinanceApplicationUpdateInput = {};
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.stage !== undefined) data.stage = input.stage.trim();
  if (input.status !== undefined) data.status = input.status;
  if (input.contactId !== undefined) {
    data.contact = input.contactId
      ? { connect: { id: input.contactId } }
      : { disconnect: true };
  }
  if (input.loanAmountCents !== undefined) data.loanAmountCents = input.loanAmountCents;
  if (input.lenderName !== undefined) {
    data.lenderName = input.lenderName?.trim() || null;
  }
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.metadata !== undefined) {
    data.metadata = (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined;
  }

  const row = await prisma.financeApplication.update({
    where: { id: existing.id },
    data,
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "FinanceApplication",
    entityId: row.id,
    changes: { after: { stage: row.stage, status: row.status } },
  });

  return serialize(row);
}

export async function getFinanceApplication(
  organisationId: string,
  applicationId: string,
) {
  const { prisma } = await import("@dg/database");
  const row = await prisma.financeApplication.findFirst({
    where: { id: applicationId, organisationId },
  });
  return row ? serialize(row) : null;
}
