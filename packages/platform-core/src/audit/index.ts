import type { Prisma } from "@dg/database";

export type AuditAction = "create" | "update" | "delete" | "export";

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
