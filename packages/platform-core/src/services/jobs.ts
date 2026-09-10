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

export type LinkedJobRelation = "contact" | "lead" | "quote";

export class LinkedJobRecordNotFoundError extends Error {
  readonly code: `linked_${LinkedJobRelation}_not_found`;
  readonly relation: LinkedJobRelation;

  constructor(relation: LinkedJobRelation) {
    super(`Linked ${relation} not found in this organisation`);
    this.name = "LinkedJobRecordNotFoundError";
    this.relation = relation;
    this.code = `linked_${relation}_not_found`;
  }
}

export function isLinkedJobRecordNotFoundError(
  error: unknown,
): error is LinkedJobRecordNotFoundError {
  return (
    error instanceof LinkedJobRecordNotFoundError ||
    (error instanceof Error && error.name === "LinkedJobRecordNotFoundError")
  );
}

function normalizeOptionalRelationId(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || null;
}

async function assertJobContactInOrganisation(
  organisationId: string,
  contactId: string,
): Promise<void> {
  const { prisma } = await import("@dg/database");
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organisationId, deletedAt: null },
    select: { id: true },
  });
  if (!contact) {
    throw new LinkedJobRecordNotFoundError("contact");
  }
}

async function assertJobLeadInOrganisation(
  organisationId: string,
  leadId: string,
): Promise<void> {
  const { prisma } = await import("@dg/database");
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organisationId },
    select: { id: true },
  });
  if (!lead) {
    throw new LinkedJobRecordNotFoundError("lead");
  }
}

async function assertJobQuoteInOrganisation(
  organisationId: string,
  quoteId: string,
): Promise<void> {
  const { prisma } = await import("@dg/database");
  const quote = await prisma.commerceQuote.findFirst({
    where: { id: quoteId, organisationId },
    select: { id: true },
  });
  if (!quote) {
    throw new LinkedJobRecordNotFoundError("quote");
  }
}

async function resolveJobRelationshipIds(
  organisationId: string,
  input: {
    contactId?: string | null;
    leadId?: string | null;
    quoteId?: string | null;
  },
): Promise<{
  contactId?: string | null;
  leadId?: string | null;
  quoteId?: string | null;
}> {
  const contactId = normalizeOptionalRelationId(input.contactId);
  const leadId = normalizeOptionalRelationId(input.leadId);
  const quoteId = normalizeOptionalRelationId(input.quoteId);

  if (contactId) {
    await assertJobContactInOrganisation(organisationId, contactId);
  }
  if (leadId) {
    await assertJobLeadInOrganisation(organisationId, leadId);
  }
  if (quoteId) {
    await assertJobQuoteInOrganisation(organisationId, quoteId);
  }

  return { contactId, leadId, quoteId };
}

/** Stages before a job is on the calendar — setting a start time advances to scheduled. */
const PRE_SCHEDULE_STAGES = new Set([
  "new_enquiry",
  "qualified",
  "site_visit",
  "quote",
  "approved",
  "booked", // cleaner / pool templates
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
  if (options.unassigned) {
    where.assignedUserId = null;
  } else if (options.assignedUserId) {
    where.assignedUserId = options.assignedUserId;
  }
  const q = options.q?.trim();
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { siteAddress: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (options.scheduledFrom || options.scheduledTo) {
    where.scheduledStartAt = {};
    if (options.scheduledFrom) {
      where.scheduledStartAt.gte = new Date(options.scheduledFrom);
    }
    if (options.scheduledTo) {
      where.scheduledStartAt.lte = new Date(options.scheduledTo);
    }
  }

  const sort =
    options.sort ??
    (options.scheduledFrom || options.scheduledTo ? "scheduled" : "updated");
  const orderBy: Prisma.ServiceJobOrderByWithRelationInput[] =
    sort === "scheduled"
      ? [{ scheduledStartAt: "asc" }, { updatedAt: "desc" }]
      : [{ updatedAt: "desc" }];

  const [items, total] = await Promise.all([
    prisma.serviceJob.findMany({
      where,
      orderBy,
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

  const links = await resolveJobRelationshipIds(input.organisationId, {
    contactId: input.contactId,
    leadId: input.leadId,
    quoteId: input.quoteId,
  });

  const stage = resolveCreateStage(input);

  const row = await prisma.serviceJob.create({
    data: {
      organisationId: input.organisationId,
      title,
      stage,
      status: input.status ?? "open",
      jobType: input.jobType?.trim() || null,
      description: input.description?.trim() || null,
      contactId: links.contactId ?? null,
      leadId: links.leadId ?? null,
      quoteId: links.quoteId ?? null,
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

  const links = await resolveJobRelationshipIds(input.organisationId, {
    contactId: input.contactId,
    leadId: input.leadId,
    quoteId: input.quoteId,
  });

  const data: Prisma.ServiceJobUpdateInput = {};
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.stage !== undefined) data.stage = input.stage;
  if (input.status !== undefined) data.status = input.status;
  if (input.jobType !== undefined) data.jobType = input.jobType;
  if (input.description !== undefined) data.description = input.description;
  if (links.contactId !== undefined) {
    data.contact = links.contactId
      ? { connect: { id: links.contactId } }
      : { disconnect: true };
  }
  if (links.leadId !== undefined) {
    data.leadId = links.leadId;
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
  if (links.quoteId !== undefined) data.quoteId = links.quoteId;
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
    if (input.status === undefined && existing.status === "open") {
      data.status = "won";
    }
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
