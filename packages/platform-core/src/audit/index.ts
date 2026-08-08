import type { Prisma } from "@dg/database";

export type AuditAction = "create" | "update" | "delete" | "export" | "archive" | "restore";

export interface WriteAuditLogInput {
  organisationId: string;
  actorId?: string;
  actorType?: "user" | "system" | "connector";
  action: AuditAction;
  entityType: string;
  entityId: string;
  changes?: Prisma.InputJsonValue;
  ipAddress?: string;
}

export async function writeAuditLog(input: WriteAuditLogInput) {
  if (!process.env.DATABASE_URL) return;

  const { prisma } = await import("@dg/database");

  await prisma.auditLog.create({
    data: {
      organisationId: input.organisationId,
      actorId: input.actorId,
      actorType: input.actorType ?? "user",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      changes: input.changes,
      ipAddress: input.ipAddress,
    },
  });
}

export interface ListAuditLogsOptions {
  organisationId: string;
  limit?: number;
  offset?: number;
  entityType?: string;
}

export async function listAuditLogs(options: ListAuditLogsOptions) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options.limit ?? 50, 100);
  const offset = options.offset ?? 0;

  const where = {
    organisationId: options.organisationId,
    ...(options.entityType ? { entityType: options.entityType } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: items.map((log) => ({
      id: log.id,
      actorId: log.actorId,
      actorType: log.actorType,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      changes: log.changes,
      occurredAt: log.occurredAt.toISOString(),
    })),
    meta: { total, limit, offset },
  };
}
