import type { Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import { platformEvents } from "../events";

export interface CreateActivityInput {
  organisationId: string;
  actorId?: string;
  entityType: string;
  entityId: string;
  activityType: string;
  title: string;
  body?: string;
  sourceApp?: string;
  metadata?: Record<string, unknown>;
}

export async function createActivity(input: CreateActivityInput) {
  const { prisma } = await import("@dg/database");

  const activity = await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: input.entityType,
      entityId: input.entityId,
      activityType: input.activityType,
      title: input.title,
      body: input.body ?? null,
      sourceApp: input.sourceApp ?? "platform",
      createdBy: input.actorId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  return {
    id: activity.id,
    activityType: activity.activityType,
    title: activity.title,
    body: activity.body,
    sourceApp: activity.sourceApp,
    createdBy: activity.createdBy,
    createdAt: activity.createdAt.toISOString(),
  };
}

export interface ListActivitiesOptions {
  organisationId: string;
  entityType?: string;
  entityId?: string;
  sourceApp?: string;
  limit?: number;
  offset?: number;
}

export async function listOrganisationActivities(options: ListActivitiesOptions) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options.limit ?? 50, 100);
  const offset = options.offset ?? 0;

  const where = {
    organisationId: options.organisationId,
    ...(options.entityType ? { entityType: options.entityType } : {}),
    ...(options.entityId ? { entityId: options.entityId } : {}),
    ...(options.sourceApp ? { sourceApp: options.sourceApp } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.activity.count({ where }),
  ]);

  return {
    items: items.map((a) => ({
      id: a.id,
      entityType: a.entityType,
      entityId: a.entityId,
      activityType: a.activityType,
      title: a.title,
      body: a.body,
      sourceApp: a.sourceApp,
      createdBy: a.createdBy,
      createdAt: a.createdAt.toISOString(),
      metadata: (a.metadata as Record<string, unknown> | null) ?? null,
    })),
    meta: { total, limit, offset },
  };
}
