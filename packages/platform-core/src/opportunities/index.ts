/**
 * CRM Opportunity — qualified pipeline item (CORE-OBJECT-SPECIFICATION §6).
 * RE vendor stages remain on Lead.metadata for the RE app; convert links Lead → Opportunity.
 */

import type { Opportunity, Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import { platformEvents } from "../events";

export const OPPORTUNITY_STATUSES = ["open", "won", "lost"] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export interface CreateOpportunityInput {
  organisationId: string;
  actorId?: string;
  title: string;
  stage: string;
  status?: OpportunityStatus;
  contactId?: string;
  companyId?: string;
  leadId?: string;
  propertyId?: string;
  valueCents?: number;
  currency?: string;
  pipelineId?: string;
  metadata?: Record<string, unknown>;
}

export interface ListOpportunitiesOptions {
  organisationId: string;
  status?: string;
  stage?: string;
  leadId?: string;
  pipelineId?: string;
  limit?: number;
  offset?: number;
}

function serializeOpportunity(row: Opportunity) {
  return {
    id: row.id,
    organisationId: row.organisationId,
    title: row.title,
    stage: row.stage,
    status: row.status as OpportunityStatus,
    contactId: row.contactId,
    companyId: row.companyId,
    leadId: row.leadId,
    propertyId: row.propertyId,
    assignedUserId: row.assignedUserId,
    valueCents: row.valueCents,
    currency: row.currency,
    probability: row.probability,
    expectedCloseDate: row.expectedCloseDate?.toISOString() ?? null,
    lostReason: row.lostReason,
    pipelineId: row.pipelineId,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listOpportunities(options: ListOpportunitiesOptions) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options.limit ?? 50, 100);
  const offset = options.offset ?? 0;

  const where: Prisma.OpportunityWhereInput = {
    organisationId: options.organisationId,
  };
  if (options.status) where.status = options.status;
  if (options.stage) where.stage = options.stage;
  if (options.leadId) where.leadId = options.leadId;
  if (options.pipelineId) where.pipelineId = options.pipelineId;

  const [items, total] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.opportunity.count({ where }),
  ]);

  return {
    items: items.map(serializeOpportunity),
    meta: { total, limit, offset },
  };
}

export async function getOpportunity(organisationId: string, opportunityId: string) {
  const { prisma } = await import("@dg/database");
  const row = await prisma.opportunity.findFirst({
    where: { id: opportunityId, organisationId },
  });
  return row ? serializeOpportunity(row) : null;
}

export async function getOpportunityForLead(
  organisationId: string,
  leadId: string,
) {
  const { prisma } = await import("@dg/database");
  const row = await prisma.opportunity.findFirst({
    where: { organisationId, leadId },
  });
  return row ? serializeOpportunity(row) : null;
}

export async function createOpportunity(input: CreateOpportunityInput) {
  const { prisma } = await import("@dg/database");

  if (input.leadId) {
    const existing = await prisma.opportunity.findFirst({
      where: { organisationId: input.organisationId, leadId: input.leadId },
    });
    if (existing) return serializeOpportunity(existing);
  }

  const row = await prisma.opportunity.create({
    data: {
      organisationId: input.organisationId,
      title: input.title.trim(),
      stage: input.stage,
      status: input.status ?? "open",
      contactId: input.contactId ?? null,
      companyId: input.companyId ?? null,
      leadId: input.leadId ?? null,
      propertyId: input.propertyId ?? null,
      valueCents: input.valueCents ?? null,
      currency: input.currency ?? "AUD",
      pipelineId: input.pipelineId ?? null,
      metadata: input.metadata as Prisma.InputJsonValue,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "Opportunity",
      entityId: row.id,
      activityType: "created",
      title: "Opportunity created",
      body: row.title,
      sourceApp: "crm",
      createdBy: input.actorId,
      metadata: input.leadId ? { leadId: input.leadId } : undefined,
    },
  });

  if (input.leadId) {
    await prisma.activity.create({
      data: {
        organisationId: input.organisationId,
        entityType: "Lead",
        entityId: input.leadId,
        activityType: "converted",
        title: "Converted to opportunity",
        body: row.title,
        sourceApp: "crm",
        createdBy: input.actorId,
        metadata: { opportunityId: row.id },
      },
    });
  }

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "Opportunity",
    entityId: row.id,
  });

  await platformEvents.publish({
    type: "opportunity.created",
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "Opportunity",
    entityId: row.id,
    payload: { title: row.title, stage: row.stage, leadId: row.leadId },
    occurredAt: new Date(),
  });

  return serializeOpportunity(row);
}

/**
 * Convert (or link) a Lead to an Opportunity — idempotent.
 * Ensures Contact exists when lead has contact metadata / contactId.
 */
export async function convertLeadToOpportunity(input: {
  organisationId: string;
  leadId: string;
  actorId?: string;
  stage?: string;
  title?: string;
  valueCents?: number;
  pipelineId?: string;
  metadata?: Record<string, unknown>;
}) {
  const { prisma } = await import("@dg/database");

  const lead = await prisma.lead.findFirst({
    where: { id: input.leadId, organisationId: input.organisationId },
  });
  if (!lead) return null;

  const existing = await getOpportunityForLead(input.organisationId, lead.id);
  if (existing) {
    if (lead.status !== "converted") {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "converted" },
      });
    }
    return existing;
  }

  const metadata = (lead.metadata as Record<string, unknown> | null) ?? {};
  const leadType = (metadata.lead_type as string | undefined) ?? "vendor";
  const stage =
    input.stage ??
    (typeof metadata.stage === "string" ? metadata.stage : null) ??
    (leadType === "consultation"
      ? "booked"
      : leadType === "founding_10"
        ? "application_received"
        : leadType === "contact" || leadType === "enquiry"
          ? "new"
          : leadType === "buyer"
            ? "qualified"
            : "appraisal");

  let contactId = lead.contactId;
  if (!contactId) {
    const { ensureContactForLeadFields } = await import("../contacts");
    const ensured = await ensureContactForLeadFields({
      organisationId: input.organisationId,
      actorId: input.actorId,
      name:
        (metadata.contact_name as string | undefined) ||
        (metadata.wp_name as string | undefined) ||
        lead.title ||
        undefined,
      email: metadata.email as string | undefined,
      phone: metadata.phone as string | undefined,
      source: lead.source,
    });
    contactId = ensured?.id ?? null;
    if (contactId && !lead.contactId) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { contactId },
      });
    }
  }

  const property = await prisma.property.findFirst({
    where: {
      organisationId: input.organisationId,
      leadId: lead.id,
      deletedAt: null,
    },
    select: { id: true },
  });

  const opportunity = await createOpportunity({
    organisationId: input.organisationId,
    actorId: input.actorId,
    title:
      input.title?.trim() ||
      lead.title ||
      (metadata.property_address as string | undefined) ||
      "Opportunity",
    stage,
    contactId: contactId ?? undefined,
    leadId: lead.id,
    propertyId: property?.id,
    valueCents: input.valueCents,
    pipelineId:
      input.pipelineId ??
      (leadType === "consultation"
        ? "platform_consultation"
        : leadType === "founding_10"
          ? "founding_10"
          : leadType === "contact" || leadType === "enquiry" || leadType === "funnel_enquiry"
            ? "platform_enquiry"
            : leadType === "buyer"
              ? "buyer"
              : "vendor"),
    metadata: {
      lead_type: leadType,
      converted_from_lead: true,
      ...(leadType === "founding_10"
        ? {
            founding_entry_type: "application",
            founding_source: "public_application",
            business_name:
              typeof metadata.business_name === "string" ? metadata.business_name : undefined,
          }
        : {}),
      ...(input.metadata ?? {}),
    },
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: "converted",
      contactId: contactId ?? lead.contactId,
      metadata: {
        ...metadata,
        opportunity_id: opportunity.id,
      } as Prisma.InputJsonValue,
    },
  });

  await platformEvents.publish({
    type: "lead.converted",
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "Lead",
    entityId: lead.id,
    payload: { opportunityId: opportunity.id },
    occurredAt: new Date(),
  });

  return opportunity;
}

export async function updateOpportunityStage(
  organisationId: string,
  opportunityId: string,
  stage: string,
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.opportunity.findFirst({
    where: { id: opportunityId, organisationId },
  });
  if (!existing) return null;

  const updated = await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { stage },
  });

  if (existing.pipelineId === "founding_10") {
    const { applyFoundingStageSideEffects } = await import("../founding/stage-actions");
    await applyFoundingStageSideEffects({
      organisationId,
      opportunityId,
      previousStage: existing.stage,
      stage,
      actorId,
    });
  }

  await prisma.activity.create({
    data: {
      organisationId,
      entityType: "Opportunity",
      entityId: opportunityId,
      activityType: "stage_change",
      title: `Moved to ${stage.replace(/_/g, " ")}`,
      body: existing.title,
      sourceApp: "crm",
      createdBy: actorId,
      metadata: { stage },
    },
  });

  await platformEvents.publish({
    type: "opportunity.stage_changed",
    organisationId,
    actorId,
    entityType: "Opportunity",
    entityId: opportunityId,
    payload: { stage, previous: existing.stage },
    occurredAt: new Date(),
  });

  return serializeOpportunity(updated);
}

export async function deleteOpportunity(input: {
  organisationId: string;
  opportunityId: string;
  actorId?: string;
}) {
  const { prisma } = await import("@dg/database");

  const existing = await prisma.opportunity.findFirst({
    where: { id: input.opportunityId, organisationId: input.organisationId },
  });
  if (!existing) return null;

  const leadId = existing.leadId;

  await prisma.opportunity.delete({
    where: { id: input.opportunityId },
  });

  if (leadId) {
    await prisma.property.updateMany({
      where: { organisationId: input.organisationId, leadId },
      data: { leadId: null },
    });
    await prisma.lead.deleteMany({
      where: { id: leadId, organisationId: input.organisationId },
    });
  }

  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "Opportunity",
      entityId: input.opportunityId,
      activityType: "deleted",
      title: "Opportunity deleted",
      body: existing.title,
      sourceApp: "crm",
      createdBy: input.actorId,
      metadata: leadId ? { leadId } : undefined,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "delete",
    entityType: "Opportunity",
    entityId: input.opportunityId,
    changes: { before: serializeOpportunity(existing) } as unknown as Prisma.InputJsonValue,
  });

  return serializeOpportunity(existing);
}
