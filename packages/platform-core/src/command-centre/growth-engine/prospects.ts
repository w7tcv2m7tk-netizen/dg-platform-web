import type { GrowthProspect } from "@dg/database";
import type { ProspectPipelineStage } from "./types";

import { writeAuditLog } from "../../audit";
import { platformEvents } from "../../events";

export interface CreateGrowthProspectInput {
  businessName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  industry?: string;
  location?: string;
  websiteUrl?: string;
  ownerClerkUserId?: string;
  actorId?: string;
  operatorOrganisationId?: string;
  /** Opaque discovery / enrichment payload (providerRefs, ratings, pack id). */
  metadata?: Record<string, unknown>;
}

export interface UpdateGrowthProspectInput {
  prospectId: string;
  businessName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  industry?: string;
  location?: string;
  websiteUrl?: string;
  stage?: ProspectPipelineStage;
  ownerClerkUserId?: string;
  actorId?: string;
  operatorOrganisationId?: string;
}

const PIPELINE_STAGES: ProspectPipelineStage[] = [
  "prospect",
  "audit_created",
  "report_sent",
  "email_opened",
  "report_viewed",
  "follow_up_due",
  "meeting_booked",
  "proposal_sent",
  "won",
  "lost",
  "onboarding",
];

function serializeProspect(row: GrowthProspect) {
  return {
    id: row.id,
    businessName: row.businessName,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    industry: row.industry,
    location: row.location,
    websiteUrl: row.websiteUrl,
    stage: row.stage as ProspectPipelineStage,
    ownerClerkUserId: row.ownerClerkUserId,
    convertedOrganisationId: row.convertedOrganisationId,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Active (non-archived) prospects — use in pipeline / discovery defaults. */
export function activeProspectWhere(extra?: Record<string, unknown>) {
  return { archivedAt: null, ...extra };
}

export function growthPipelineStages(): ProspectPipelineStage[] {
  return PIPELINE_STAGES;
}

export async function listGrowthProspects(options?: {
  stage?: ProspectPipelineStage;
  ownerClerkUserId?: string;
  limit?: number;
  /** When true, include soft-archived prospects (default: hide them). */
  includeArchived?: boolean;
  /** When true, only return archived prospects. */
  archivedOnly?: boolean;
}) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options?.limit ?? 100, 200);

  const archivedFilter = options?.archivedOnly
    ? { archivedAt: { not: null } }
    : options?.includeArchived
      ? {}
      : { archivedAt: null };

  const rows = await prisma.growthProspect.findMany({
    where: {
      ...archivedFilter,
      ...(options?.stage ? { stage: options.stage } : {}),
      ...(options?.ownerClerkUserId ? { ownerClerkUserId: options.ownerClerkUserId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return rows.map(serializeProspect);
}

export async function getGrowthProspect(prospectId: string) {
  const { prisma } = await import("@dg/database");
  const row = await prisma.growthProspect.findUnique({ where: { id: prospectId } });
  return row ? serializeProspect(row) : null;
}

export async function createGrowthProspect(input: CreateGrowthProspectInput) {
  const { prisma } = await import("@dg/database");

  const row = await prisma.growthProspect.create({
    data: {
      businessName: input.businessName.trim(),
      contactName: input.contactName?.trim() || null,
      contactEmail: input.contactEmail?.trim().toLowerCase() || null,
      contactPhone: input.contactPhone?.trim() || null,
      industry: input.industry?.trim() || null,
      location: input.location?.trim() || null,
      websiteUrl: input.websiteUrl?.trim() || null,
      ownerClerkUserId: input.ownerClerkUserId ?? input.actorId ?? null,
      stage: "prospect",
      metadata: input.metadata ?? undefined,
    },
  });

  await prisma.growthProspectEngagement.create({
    data: {
      prospectId: row.id,
      type: "prospect_created",
      metadata: { source: "discovery" },
    },
  });

  if (input.operatorOrganisationId) {
    await writeAuditLog({
      organisationId: input.operatorOrganisationId,
      actorId: input.actorId,
      action: "create",
      entityType: "GrowthProspect",
      entityId: row.id,
      changes: { businessName: row.businessName },
    });
  }

  await platformEvents.publish({
    type: "prospect.created",
    organisationId: input.operatorOrganisationId ?? "platform",
    actorId: input.actorId,
    entityType: "GrowthProspect",
    entityId: row.id,
    payload: { businessName: row.businessName, industry: row.industry },
    occurredAt: new Date(),
  });

  return serializeProspect(row);
}

export async function updateGrowthProspect(input: UpdateGrowthProspectInput) {
  const { prisma } = await import("@dg/database");

  const existing = await prisma.growthProspect.findUnique({
    where: { id: input.prospectId },
  });
  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (input.businessName !== undefined) data.businessName = input.businessName.trim();
  if (input.contactName !== undefined) data.contactName = input.contactName.trim() || null;
  if (input.contactEmail !== undefined) {
    data.contactEmail = input.contactEmail.trim().toLowerCase() || null;
  }
  if (input.contactPhone !== undefined) data.contactPhone = input.contactPhone.trim() || null;
  if (input.industry !== undefined) data.industry = input.industry.trim() || null;
  if (input.location !== undefined) data.location = input.location.trim() || null;
  if (input.websiteUrl !== undefined) data.websiteUrl = input.websiteUrl.trim() || null;
  if (input.stage !== undefined) data.stage = input.stage;
  if (input.ownerClerkUserId !== undefined) data.ownerClerkUserId = input.ownerClerkUserId;

  const row = await prisma.growthProspect.update({
    where: { id: input.prospectId },
    data,
  });

  if (input.stage && input.stage !== existing.stage) {
    await prisma.growthProspectEngagement.create({
      data: {
        prospectId: row.id,
        type: "stage_changed",
        metadata: { from: existing.stage, to: input.stage },
      },
    });
  }

  if (input.operatorOrganisationId) {
    await writeAuditLog({
      organisationId: input.operatorOrganisationId,
      actorId: input.actorId,
      action: "update",
      entityType: "GrowthProspect",
      entityId: row.id,
      changes: { stage: input.stage ?? existing.stage },
    });
  }

  return serializeProspect(row);
}

/**
 * Soft-archive a prospect for Command Centre demo cleanup.
 * Keeps audits/reports/engagements; hides from default lists and disables public share.
 */
export async function archiveGrowthProspect(input: {
  prospectId: string;
  actorId?: string;
  operatorOrganisationId?: string;
}) {
  const { prisma } = await import("@dg/database");

  const existing = await prisma.growthProspect.findUnique({
    where: { id: input.prospectId },
  });
  if (!existing) return null;
  if (existing.archivedAt) return serializeProspect(existing);

  const row = await prisma.growthProspect.update({
    where: { id: input.prospectId },
    data: { archivedAt: new Date() },
  });

  await prisma.growthProspectEngagement.create({
    data: {
      prospectId: row.id,
      type: "prospect_archived",
      metadata: {},
    },
  });

  if (input.operatorOrganisationId) {
    await writeAuditLog({
      organisationId: input.operatorOrganisationId,
      actorId: input.actorId,
      action: "archive",
      entityType: "GrowthProspect",
      entityId: row.id,
      changes: { archivedAt: row.archivedAt?.toISOString() },
    });
  }

  await platformEvents.publish({
    type: "prospect.archived",
    organisationId: input.operatorOrganisationId ?? "platform",
    actorId: input.actorId,
    entityType: "GrowthProspect",
    entityId: row.id,
    payload: { businessName: row.businessName },
    occurredAt: new Date(),
  });

  return serializeProspect(row);
}

export async function restoreGrowthProspect(input: {
  prospectId: string;
  actorId?: string;
  operatorOrganisationId?: string;
}) {
  const { prisma } = await import("@dg/database");

  const existing = await prisma.growthProspect.findUnique({
    where: { id: input.prospectId },
  });
  if (!existing) return null;
  if (!existing.archivedAt) return serializeProspect(existing);

  const row = await prisma.growthProspect.update({
    where: { id: input.prospectId },
    data: { archivedAt: null },
  });

  await prisma.growthProspectEngagement.create({
    data: {
      prospectId: row.id,
      type: "prospect_restored",
      metadata: {},
    },
  });

  if (input.operatorOrganisationId) {
    await writeAuditLog({
      organisationId: input.operatorOrganisationId,
      actorId: input.actorId,
      action: "restore",
      entityType: "GrowthProspect",
      entityId: row.id,
      changes: { archivedAt: null },
    });
  }

  await platformEvents.publish({
    type: "prospect.restored",
    organisationId: input.operatorOrganisationId ?? "platform",
    actorId: input.actorId,
    entityType: "GrowthProspect",
    entityId: row.id,
    payload: { businessName: row.businessName },
    occurredAt: new Date(),
  });

  return serializeProspect(row);
}

export async function getGrowthEngineSummary() {
  const { prisma } = await import("@dg/database");

  const [total, byStage, recentEngagements] = await Promise.all([
    prisma.growthProspect.count({ where: { archivedAt: null } }),
    prisma.growthProspect.groupBy({
      by: ["stage"],
      where: { archivedAt: null },
      _count: { id: true },
    }),
    prisma.growthProspectEngagement.count({
      where: {
        occurredAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        prospect: { archivedAt: null },
      },
    }),
  ]);

  return {
    totalProspects: total,
    byStage: Object.fromEntries(byStage.map((s) => [s.stage, s._count.id])),
    engagementsThisWeek: recentEngagements,
  };
}
