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
