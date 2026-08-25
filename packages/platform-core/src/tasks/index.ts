/**
 * CRM Task — future action with assignee / due date (CORE-OBJECT-SPECIFICATION §8).
 */

import type { Prisma, Task } from "@dg/database";

import { createActivity } from "../activities";
import { writeAuditLog } from "../audit";
import { platformEvents } from "../events";

export const TASK_STATUSES = ["open", "completed", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

export interface CreateTaskInput {
  organisationId: string;
  actorId?: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  assignedUserId?: string;
  dueAt?: Date | string | null;
  entityType?: string;
  entityId?: string;
  priority?: string;
  sourceApp?: string;
  metadata?: Record<string, unknown>;
  /** When true (default) and entity is set, write an Activity on the related entity. */
  createRelatedActivity?: boolean;
}

export interface UpdateTaskInput {
  organisationId: string;
  taskId: string;
  actorId?: string;
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  assignedUserId?: string | null;
  dueAt?: Date | string | null;
  entityType?: string | null;
  entityId?: string | null;
  priority?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ListTasksOptions {
  organisationId: string;
  status?: string;
  entityType?: string;
  entityId?: string;
  assignedUserId?: string;
  limit?: number;
  offset?: number;
}

function parseDate(value: Date | string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function serializeTask(row: Task) {
  return {
    id: row.id,
    organisationId: row.organisationId,
    title: row.title,
    description: row.description,
    status: (isTaskStatus(row.status) ? row.status : "open") as TaskStatus,
    assignedUserId: row.assignedUserId,
    dueAt: row.dueAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    entityType: row.entityType,
    entityId: row.entityId,
    priority: row.priority,
    sourceApp: row.sourceApp,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listTasks(options: ListTasksOptions) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options.limit ?? 50, 100);
  const offset = options.offset ?? 0;

  const where: Prisma.TaskWhereInput = {
    organisationId: options.organisationId,
  };
  if (options.status) where.status = options.status;
  if (options.entityType) where.entityType = options.entityType;
  if (options.entityId) where.entityId = options.entityId;
  if (options.assignedUserId) where.assignedUserId = options.assignedUserId;

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.task.count({ where }),
  ]);

  return {
    items: items.map(serializeTask),
    meta: { total, limit, offset },
  };
}

/** Command Centre — CRM tasks open with due date on or before end of today (platform-wide). */
export type CommandCentreOpenTaskDue = ReturnType<typeof serializeTask> & {
  organisationName: string;
  organisationSlug: string;
  overdue: boolean;
};

export async function listCommandCentreOpenTasksDue(options?: {
  limit?: number;
}): Promise<{ items: CommandCentreOpenTaskDue[]; total: number }> {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options?.limit ?? 100, 200);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const now = Date.now();

  const where: Prisma.TaskWhereInput = {
    status: "open",
    dueAt: { lte: todayEnd },
  };

  const [rows, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
      take: limit,
      include: {
        organisation: { select: { name: true, slug: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return {
    total,
    items: rows.map((row) => {
      const base = serializeTask(row);
      return {
        ...base,
        organisationName: row.organisation.name,
        organisationSlug: row.organisation.slug,
        overdue: Boolean(row.dueAt && row.dueAt.getTime() < now),
      };
    }),
  };
}

export async function getTask(organisationId: string, taskId: string) {
  const { prisma } = await import("@dg/database");
  const row = await prisma.task.findFirst({
    where: { id: taskId, organisationId },
  });
  return row ? serializeTask(row) : null;
}

export async function createTask(input: CreateTaskInput) {
  const { prisma } = await import("@dg/database");
  const title = input.title.trim();
  if (!title) {
    throw new Error("title is required");
  }

  const status = input.status ?? "open";
  const dueAt = parseDate(input.dueAt);

  const row = await prisma.task.create({
    data: {
      organisationId: input.organisationId,
      title,
      description: input.description?.trim() || null,
      status,
      assignedUserId: input.assignedUserId ?? null,
      dueAt: dueAt === undefined ? null : dueAt,
      completedAt: status === "completed" ? new Date() : null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      priority: input.priority ?? null,
      sourceApp: input.sourceApp ?? "crm",
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  const shouldLogActivity =
    input.createRelatedActivity !== false &&
    Boolean(input.entityType && input.entityId);

  if (shouldLogActivity && input.entityType && input.entityId) {
    await createActivity({
      organisationId: input.organisationId,
      actorId: input.actorId,
      entityType: input.entityType,
      entityId: input.entityId,
      activityType: "task_created",
      title: "Task created",
      body: row.title,
      sourceApp: input.sourceApp ?? "crm",
      metadata: { taskId: row.id },
    });
  }

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "Task",
    entityId: row.id,
  });

  await platformEvents.publish({
    type: "task.created",
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "Task",
    entityId: row.id,
    payload: {
      title: row.title,
      status: row.status,
      entityType: row.entityType,
      entityId: row.entityId,
      dueAt: row.dueAt?.toISOString() ?? null,
    },
    occurredAt: new Date(),
  });

  return serializeTask(row);
}

export async function updateTask(input: UpdateTaskInput) {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.task.findFirst({
    where: { id: input.taskId, organisationId: input.organisationId },
  });
  if (!existing) return null;

  const data: Prisma.TaskUpdateInput = {};
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.description !== undefined) data.description = input.description;
  if (input.assignedUserId !== undefined) data.assignedUserId = input.assignedUserId;
  if (input.entityType !== undefined) data.entityType = input.entityType;
  if (input.entityId !== undefined) data.entityId = input.entityId;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.metadata !== undefined) {
    data.metadata = input.metadata as Prisma.InputJsonValue;
  }
  if (input.dueAt !== undefined) {
    data.dueAt = parseDate(input.dueAt) ?? null;
  }
  if (input.status !== undefined) {
    data.status = input.status;
    if (input.status === "completed" && !existing.completedAt) {
      data.completedAt = new Date();
    }
    if (input.status !== "completed") {
      data.completedAt = null;
    }
  }

  const updated = await prisma.task.update({
    where: { id: input.taskId },
    data,
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "Task",
    entityId: updated.id,
    changes: {
      status: input.status,
      title: input.title,
    },
  });

  if (input.status === "completed" && existing.status !== "completed") {
    await platformEvents.publish({
      type: "task.completed",
      organisationId: input.organisationId,
      actorId: input.actorId,
      entityType: "Task",
      entityId: updated.id,
      payload: { title: updated.title, previousStatus: existing.status },
      occurredAt: new Date(),
    });
  }

  return serializeTask(updated);
}

export async function completeTask(
  organisationId: string,
  taskId: string,
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.task.findFirst({
    where: { id: taskId, organisationId },
  });
  if (!existing) return null;

  if (existing.status === "completed") {
    return serializeTask(existing);
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "completed",
      completedAt: new Date(),
    },
  });

  await writeAuditLog({
    organisationId,
    actorId,
    action: "update",
    entityType: "Task",
    entityId: updated.id,
    changes: { status: "completed", previousStatus: existing.status },
  });

  await platformEvents.publish({
    type: "task.completed",
    organisationId,
    actorId,
    entityType: "Task",
    entityId: updated.id,
    payload: { title: updated.title, previousStatus: existing.status },
    occurredAt: new Date(),
  });

  return serializeTask(updated);
}
