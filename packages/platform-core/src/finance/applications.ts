import type { FinanceApplication, Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import type {
  CreateFinanceApplicationInput,
  FinanceApplicationRecord,
  FinanceApplicationStatus,
  ListFinanceApplicationsOptions,
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
