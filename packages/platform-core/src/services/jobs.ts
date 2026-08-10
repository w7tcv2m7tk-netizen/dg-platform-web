import type { Prisma, ServiceJob } from "@dg/database";

import { writeAuditLog } from "../audit";
import { platformEvents } from "../events";
import type {
  CreateServiceJobInput,
  ListServiceJobsOptions,
  ServiceJobRecord,
  ServiceJobStatus,
  UpdateServiceJobInput,
} from "./types";

/** Stages before a job is on the calendar — setting a start time advances to scheduled. */
const PRE_SCHEDULE_STAGES = new Set([
  "new_enquiry",
  "qualified",
  "site_visit",
  "quote",
  "approved",
]);

function serializeJob(row: ServiceJob): ServiceJobRecord {
  return {
    id: row.id,
    organisationId: row.organisationId,
    title: row.title,
    stage: row.stage,
    status: row.status as ServiceJobStatus,
    jobType: row.jobType,
    description: row.description,
    contactId: row.contactId,
    leadId: row.leadId,
    quoteId: row.quoteId,
    assignedUserId: row.assignedUserId,
    siteAddress: row.siteAddress,
    scheduledStartAt: row.scheduledStartAt?.toISOString() ?? null,
    scheduledEndAt: row.scheduledEndAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    templateKey: row.templateKey,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function resolveCreateStage(input: CreateServiceJobInput): string {
  const stage = input.stage ?? "new_enquiry";
  if (input.scheduledStartAt && PRE_SCHEDULE_STAGES.has(stage)) {
    return "scheduled";
  }
  return stage;
}

export async function listServiceJobs(options: ListServiceJobsOptions) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options.limit ?? 50, 100);
  const offset = options.offset ?? 0;

  const where: Prisma.ServiceJobWhereInput = {
    organisationId: options.organisationId,
  };
  if (options.status) where.status = options.status;
  if (options.stage) where.stage = options.stage;
  if (options.contactId) where.contactId = options.contactId;
  if (options.scheduledFrom || options.scheduledTo) {
    where.scheduledStartAt = {};
    if (options.scheduledFrom) {
      where.scheduledStartAt.gte = new Date(options.scheduledFrom);
    }
    if (options.scheduledTo) {
      where.scheduledStartAt.lte = new Date(options.scheduledTo);
    }
  }

  const [items, total] = await Promise.all([
    prisma.serviceJob.findMany({
      where,
      orderBy: [{ scheduledStartAt: "asc" }, { updatedAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.serviceJob.count({ where }),
  ]);

  return {
    items: items.map(serializeJob),
    meta: { total, limit, offset },
  };
}

export async function getServiceJob(organisationId: string, jobId: string) {
  const { prisma } = await import("@dg/database");
  const row = await prisma.serviceJob.findFirst({
    where: { id: jobId, organisationId },
  });
  return row ? serializeJob(row) : null;
}

export async function createServiceJob(input: CreateServiceJobInput) {
  const { prisma } = await import("@dg/database");
  const title = input.title.trim();
  if (!title) throw new Error("title is required");

  const stage = resolveCreateStage(input);

  const row = await prisma.serviceJob.create({
    data: {
      organisationId: input.organisationId,
      title,
      stage,
      status: input.status ?? "open",
      jobType: input.jobType?.trim() || null,
      description: input.description?.trim() || null,
      contactId: input.contactId ?? null,
      leadId: input.leadId ?? null,
      assignedUserId: input.assignedUserId ?? null,
      siteAddress: input.siteAddress?.trim() || null,
      scheduledStartAt: input.scheduledStartAt ? new Date(input.scheduledStartAt) : null,
      scheduledEndAt: input.scheduledEndAt ? new Date(input.scheduledEndAt) : null,
      templateKey: input.templateKey ?? null,
      metadata: input.metadata as Prisma.InputJsonValue,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "ServiceJob",
      entityId: row.id,
      activityType: "created",
      title: "Job created",
      body: row.title,
      sourceApp: "services",
      createdBy: input.actorId,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "ServiceJob",
    entityId: row.id,
  });

  await platformEvents.publish({
    type: "services.job.created",
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "ServiceJob",
    entityId: row.id,
    payload: { stage: row.stage, jobType: row.jobType },
    occurredAt: new Date(),
  });

  if (row.scheduledStartAt) {
    await platformEvents.publish({
      type: "services.job.scheduled",
      organisationId: input.organisationId,
      actorId: input.actorId,
      entityType: "ServiceJob",
      entityId: row.id,
      payload: { scheduledStartAt: row.scheduledStartAt.toISOString() },
      occurredAt: new Date(),
    });
  }

  return serializeJob(row);
}

export async function updateServiceJob(input: UpdateServiceJobInput) {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.serviceJob.findFirst({
    where: { id: input.jobId, organisationId: input.organisationId },
  });
  if (!existing) return null;

  const data: Prisma.ServiceJobUpdateInput = {};
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.stage !== undefined) data.stage = input.stage;
  if (input.status !== undefined) data.status = input.status;
  if (input.jobType !== undefined) data.jobType = input.jobType;
  if (input.description !== undefined) data.description = input.description;
  if (input.contactId !== undefined) {
    data.contact = input.contactId
      ? { connect: { id: input.contactId } }
      : { disconnect: true };
  }
  if (input.siteAddress !== undefined) data.siteAddress = input.siteAddress;
  if (input.scheduledStartAt !== undefined) {
    data.scheduledStartAt = input.scheduledStartAt
      ? new Date(input.scheduledStartAt)
      : null;
  }
  if (input.scheduledEndAt !== undefined) {
    data.scheduledEndAt = input.scheduledEndAt ? new Date(input.scheduledEndAt) : null;
  }
  if (input.assignedUserId !== undefined) data.assignedUserId = input.assignedUserId;
  if (input.quoteId !== undefined) data.quoteId = input.quoteId;
  if (input.metadata !== undefined) {
    data.metadata = input.metadata as Prisma.InputJsonValue;
  }

  // Setting a schedule start auto-advances pre-schedule stages (unless caller set stage).
  if (
    input.scheduledStartAt &&
    input.stage === undefined &&
    PRE_SCHEDULE_STAGES.has(existing.stage)
  ) {
    data.stage = "scheduled";
  }

  const becomingCompleted =
    (input.stage === "completed" ||
      data.stage === "completed" ||
      input.status === "won") &&
    !existing.completedAt;
  if (becomingCompleted) {
    data.completedAt = new Date();
  }

  const row = await prisma.serviceJob.update({
    where: { id: existing.id },
    data,
  });

  const stageChanged = row.stage !== existing.stage;

  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "ServiceJob",
      entityId: row.id,
      activityType: stageChanged ? "stage_changed" : "updated",
      title: stageChanged ? `Stage → ${row.stage}` : "Job updated",
      body: row.title,
      sourceApp: "services",
      createdBy: input.actorId,
      metadata: stageChanged
        ? { from: existing.stage, to: row.stage }
        : undefined,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "ServiceJob",
    entityId: row.id,
  });

  await platformEvents.publish({
    type: stageChanged ? "services.job.stage_changed" : "services.job.updated",
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "ServiceJob",
    entityId: row.id,
    payload: {
      stage: row.stage,
      previousStage: existing.stage,
    },
    occurredAt: new Date(),
  });

  if (
    input.scheduledStartAt !== undefined &&
    input.scheduledStartAt &&
    (!existing.scheduledStartAt ||
      existing.scheduledStartAt.toISOString() !== input.scheduledStartAt)
  ) {
    await platformEvents.publish({
      type: "services.job.scheduled",
      organisationId: input.organisationId,
      actorId: input.actorId,
      entityType: "ServiceJob",
      entityId: row.id,
      payload: { scheduledStartAt: input.scheduledStartAt },
      occurredAt: new Date(),
    });
  }

  if (becomingCompleted) {
    await platformEvents.publish({
      type: "services.job.completed",
      organisationId: input.organisationId,
      actorId: input.actorId,
      entityType: "ServiceJob",
      entityId: row.id,
      payload: { stage: row.stage },
      occurredAt: new Date(),
    });
  }

  return serializeJob(row);
}
