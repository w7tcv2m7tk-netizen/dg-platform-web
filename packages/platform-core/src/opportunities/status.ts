import type { Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import { platformEvents } from "../events";

export type OpportunityLifecycleStatus = "open" | "won" | "lost";

export async function updateOpportunityStatus(input: {
  organisationId: string;
  opportunityId: string;
  status: OpportunityLifecycleStatus;
  actorId?: string;
  lostReason?: string | null;
}) {
  const { prisma } = await import("@dg/database");

  const existing = await prisma.opportunity.findFirst({
    where: { id: input.opportunityId, organisationId: input.organisationId },
  });
  if (!existing) return null;

  const lostReason =
    input.status === "lost" ? input.lostReason?.trim().slice(0, 500) || null : null;

  const updated = await prisma.opportunity.update({
    where: { id: input.opportunityId },
    data: {
      status: input.status,
      lostReason,
    },
  });

  const title =
    input.status === "won"
      ? "Opportunity marked won"
      : input.status === "lost"
        ? "Opportunity marked lost"
        : "Opportunity reopened";

  await prisma.activity.create({
    data: {
      organisationId: input.organisationId,
      entityType: "Opportunity",
      entityId: input.opportunityId,
      activityType: "status_change",
      title,
      body: input.status === "lost" && lostReason ? lostReason : existing.title,
      sourceApp: "crm",
      createdBy: input.actorId,
      metadata: {
        status: input.status,
        previousStatus: existing.status,
        ...(lostReason ? { lostReason } : {}),
      },
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update_status",
    entityType: "Opportunity",
    entityId: input.opportunityId,
    changes: {
      before: { status: existing.status, lostReason: existing.lostReason },
      after: { status: input.status, lostReason },
    } as unknown as Prisma.InputJsonValue,
  });

  await platformEvents.publish({
    type: "opportunity.status_changed",
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "Opportunity",
    entityId: input.opportunityId,
    payload: {
      status: input.status,
      previous: existing.status,
      ...(lostReason ? { lostReason } : {}),
    },
    occurredAt: new Date(),
  });

  return {
    id: updated.id,
    organisationId: updated.organisationId,
    title: updated.title,
    stage: updated.stage,
    status: updated.status as OpportunityLifecycleStatus,
    contactId: updated.contactId,
    companyId: updated.companyId,
    leadId: updated.leadId,
    propertyId: updated.propertyId,
    assignedUserId: updated.assignedUserId,
    valueCents: updated.valueCents,
    currency: updated.currency,
    probability: updated.probability,
    expectedCloseDate: updated.expectedCloseDate?.toISOString() ?? null,
    lostReason: updated.lostReason,
    pipelineId: updated.pipelineId,
    metadata: (updated.metadata as Record<string, unknown> | null) ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}
