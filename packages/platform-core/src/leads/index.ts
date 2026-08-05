import type { Lead, Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import { platformEvents } from "../events";

export const VENDOR_STAGES = [
  "vendor_lead",
  "appraisal",
  "listing",
  "sale",
  "settlement",
  "past_client",
] as const;

export type VendorStage = (typeof VENDOR_STAGES)[number];

export interface CreateLeadInput {
  organisationId: string;
  actorId?: string;
  source: string;
  title?: string;
  description?: string;
  contactId?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  externalRefs?: Record<string, unknown>;
}

export interface ListLeadsOptions {
  organisationId: string;
  status?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

function serializeLead(lead: Lead) {
  const metadata = (lead.metadata as Record<string, unknown> | null) ?? {};
  return {
    id: lead.id,
    organisationId: lead.organisationId,
    status: lead.status,
    source: lead.source,
    title: lead.title,
    description: lead.description,
    contactId: lead.contactId,
    stage: (metadata.stage as string | undefined) ?? "vendor_lead",
    propertyAddress: metadata.property_address as string | undefined,
    metadata,
    externalRefs: lead.externalRefs as Record<string, unknown> | null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export async function listLeads(options: ListLeadsOptions) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options.limit ?? 100, 200);
  const offset = options.offset ?? 0;

  const where: Prisma.LeadWhereInput = {
    organisationId: options.organisationId,
  };
  if (options.status) where.status = options.status;
  if (options.source) where.source = options.source;

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    items: items.map(serializeLead),
    meta: { total, limit, offset },
  };
}

export async function getLead(organisationId: string, leadId: string) {
  const { prisma } = await import("@dg/database");
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organisationId },
  });
  return lead ? serializeLead(lead) : null;
}

export async function createLead(input: CreateLeadInput) {
  const { prisma } = await import("@dg/database");

  const lead = await prisma.lead.create({
    data: {
      organisationId: input.organisationId,
      source: input.source,
      title: input.title,
      description: input.description,
      contactId: input.contactId,
      status: input.status ?? "new",
      metadata: input.metadata as Prisma.InputJsonValue,
      externalRefs: input.externalRefs as Prisma.InputJsonValue,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "Lead",
      entityId: lead.id,
      activityType: "created",
      title: "Lead created",
      body: input.title ?? input.source,
      sourceApp: "real-estate",
      createdBy: input.actorId,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "Lead",
    entityId: lead.id,
  });

  await platformEvents.publish({
    type: "lead.created",
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "Lead",
    entityId: lead.id,
    payload: { source: lead.source, title: lead.title },
    occurredAt: new Date(),
  });

  return serializeLead(lead);
}

export async function updateLeadStage(
  organisationId: string,
  leadId: string,
  stage: VendorStage,
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organisationId },
  });
  if (!lead) return null;

  const metadata = {
    ...((lead.metadata as Record<string, unknown> | null) ?? {}),
    stage,
  };

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: { metadata: metadata as Prisma.InputJsonValue },
  });

  await prisma.activity.create({
    data: {
      organisationId,
      entityType: "Lead",
      entityId: leadId,
      activityType: "stage_change",
      title: `Moved to ${stage.replace(/_/g, " ")}`,
      body: lead.title,
      sourceApp: "real-estate",
      createdBy: actorId,
      metadata: { stage },
    },
  });

  return serializeLead(updated);
}
