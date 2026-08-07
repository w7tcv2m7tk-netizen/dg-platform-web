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

export const BUYER_STAGES = [
  "inquiry",
  "qualified",
  "viewing",
  "offer",
  "purchased",
] as const;

export type VendorStage = (typeof VENDOR_STAGES)[number];
export type BuyerStage = (typeof BUYER_STAGES)[number];
export type LeadType = "vendor" | "buyer";

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
  /** Filter by RE pipeline type — vendor vs buyer imports */
  leadType?: LeadType;
  limit?: number;
  offset?: number;
}

function serializeLead(lead: Lead) {
  const metadata = (lead.metadata as Record<string, unknown> | null) ?? {};
  const leadType = metadata.lead_type as string | undefined;
  const defaultStage =
    leadType === "buyer" || lead.source === "buyer_enquiry"
      ? "inquiry"
      : "vendor_lead";
  return {
    id: lead.id,
    organisationId: lead.organisationId,
    status: lead.status,
    source: lead.source,
    title: lead.title,
    description: lead.description,
    contactId: lead.contactId,
    stage: (metadata.stage as string | undefined) ?? defaultStage,
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

  if (options.leadType === "buyer") {
    where.source = "buyer_enquiry";
  } else if (options.leadType === "vendor") {
    where.NOT = { source: "buyer_enquiry" };
  }

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

export interface LeadStageSyncOptions {
  /** Skip property create/status sync (used when property drives the change). */
  skipPropertySync?: boolean;
}

export async function updateLeadStage(
  organisationId: string,
  leadId: string,
  stage: VendorStage,
  actorId?: string,
  options?: LeadStageSyncOptions,
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

  if (!options?.skipPropertySync) {
    const { propertyStatusForLeadStage } = await import("../real-estate/pipeline");

    if (stage === "appraisal" || propertyStatusForLeadStage(stage)) {
      const { createPropertyFromLead } = await import("../properties");
      await createPropertyFromLead({ organisationId, leadId, actorId });
    }

    const propStatus = propertyStatusForLeadStage(stage);
    if (propStatus) {
      const property = await prisma.property.findFirst({
        where: { organisationId, leadId, deletedAt: null },
      });
      if (property && property.status !== propStatus) {
        const { updatePropertyStatus } = await import("../properties");
        await updatePropertyStatus(organisationId, property.id, propStatus, actorId, {
          skipLeadSync: true,
        });
      }
    }
  }

  return serializeLead(updated);
}

export async function updateBuyerLeadStage(
  organisationId: string,
  leadId: string,
  stage: BuyerStage,
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organisationId, source: "buyer_enquiry" },
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
      title: `Buyer moved to ${stage.replace(/_/g, " ")}`,
      body: lead.title,
      sourceApp: "real-estate",
      createdBy: actorId,
      metadata: { stage, leadType: "buyer" },
    },
  });

  return serializeLead(updated);
}

export async function listLeadActivities(organisationId: string, leadId: string) {
  const { prisma } = await import("@dg/database");

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organisationId },
  });
  if (!lead) return null;

  const activities = await prisma.activity.findMany({
    where: {
      organisationId,
      entityType: "Lead",
      entityId: leadId,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return activities.map((a) => ({
    id: a.id,
    activityType: a.activityType,
    title: a.title,
    body: a.body,
    sourceApp: a.sourceApp,
    createdBy: a.createdBy,
    metadata: a.metadata as Record<string, unknown> | null,
    createdAt: a.createdAt.toISOString(),
  }));
}
