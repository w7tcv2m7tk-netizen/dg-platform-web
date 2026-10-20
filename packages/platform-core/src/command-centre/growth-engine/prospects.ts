import { AcquisitionError, legacyAustralianAbns, verifyAcquisitionAbn } from "../../prospecting-engine/identity";
import type { GrowthProspect, Prisma } from "@dg/database";
import type { ProspectPipelineStage } from "./types";

import { writeAuditLog } from "../../audit";
import { platformEvents } from "../../events";

export interface CreateGrowthProspectInput {
  /** Required — each organisation owns its own prospect book. */
  organisationId: string;
  businessName: string;
  abn?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  industry?: string;
  location?: string;
  websiteUrl?: string;
  ownerClerkUserId?: string;
  actorId?: string;
  /** @deprecated Prefer organisationId — kept for audit/event callers. */
  operatorOrganisationId?: string;
  /** Opaque discovery / enrichment payload (providerRefs, ratings, pack id). */
  metadata?: Record<string, unknown>;
}

export interface UpdateGrowthProspectInput {
  prospectId: string;
  organisationId: string;
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
  "qualified",
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
    organisationId: row.organisationId,
    businessName: row.businessName,
    abn: row.abn,
    identityProvenance: row.identityProvenance,
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
import {
  growthScopeWhere,
  type GrowthScope,
} from "./scope";

export function activeProspectWhere(extra?: Record<string, unknown>) {
  return { archivedAt: null, ...extra };
}

export function growthPipelineStages(): ProspectPipelineStage[] {
  return PIPELINE_STAGES;
}

export async function listGrowthProspects(options: {
  organisationId: string;
  stage?: ProspectPipelineStage;
  ownerClerkUserId?: string;
  limit?: number;
  /** When true, include soft-archived prospects (default: hide them). */
  includeArchived?: boolean;
  /** When true, only return archived prospects. */
  archivedOnly?: boolean;
}) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options.limit ?? 100, 200);

  const archivedFilter = options.archivedOnly
    ? { archivedAt: { not: null } }
    : options.includeArchived
      ? {}
      : { archivedAt: null };

  const rows = await prisma.growthProspect.findMany({
    where: {
      organisationId: options.organisationId,
      ...archivedFilter,
      ...(options.stage ? { stage: options.stage } : {}),
      ...(options.ownerClerkUserId ? { ownerClerkUserId: options.ownerClerkUserId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return rows.map(serializeProspect);
}

/**
 * Load a prospect within an explicit scope.
 *
 * The scope argument is required: it previously defaulted to "no tenant check"
 * when omitted, which made every prospect readable by id.
 */
export async function getGrowthProspect(
  prospectId: string,
  scope: GrowthScope,
) {
  const { prisma } = await import("@dg/database");
  const row = await prisma.growthProspect.findFirst({
    where: { id: prospectId, ...growthScopeWhere(scope) },
  });
  if (!row) return null;
  return serializeProspect(row);
}

export async function createGrowthProspect(input: CreateGrowthProspectInput) {
  const { prisma } = await import("@dg/database");
  const organisationId = input.organisationId || input.operatorOrganisationId;
  if (!organisationId) {
    throw new Error("organisationId is required to create a growth prospect");
  }

  const requestedAbn = input.abn ?? (input.metadata?.providerRefs as { abn?: string } | undefined)?.abn;
  const identity = requestedAbn ? await verifyAcquisitionAbn(requestedAbn) : null;
  if (identity) {
    const existing = await prisma.growthProspect.findUnique({ where: { organisationId_abn: { organisationId, abn: identity.abn } } });
    if (existing) {
      if (existing.archivedAt) throw new AcquisitionError("archived_identity", "This ABN belongs to an archived prospect; restore that relationship first");
      return serializeProspect(existing);
    }
    // Reconcile metadata claims only after verification, without deleting or merging records.
    const legacy = await prisma.growthProspect.findMany({ where: { organisationId, abn: null }, select: { id: true, metadata: true } });
    const candidates = legacy.filter((row) => legacyAustralianAbns(row.metadata).includes(identity.abn));
    if (candidates.length > 1 || candidates.some((row) => legacyAustralianAbns(row.metadata).length > 1))
      throw new AcquisitionError("reconciliation_required", "Multiple legacy identity claims need explicit reconciliation; no business records were merged");
    if (candidates.length === 1) {
      const adopted = await prisma.growthProspect.update({ where: { id: candidates[0].id }, data: { abn: identity.abn, identityProvenance: JSON.parse(JSON.stringify(identity.provenance)) } }).catch(async (error: { code?: string }) => {
        if (error.code === "P2002") {
          const canonical = await prisma.growthProspect.findUnique({ where: { organisationId_abn: { organisationId, abn: identity.abn } } });
          if (canonical) return canonical;
        }
        throw error;
      });
      if (adopted.archivedAt) throw new AcquisitionError("archived_identity", "This ABN belongs to an archived prospect; restore that relationship first");
      return serializeProspect(adopted);
    }
  }
  let reused = false;
  const row = await prisma.growthProspect.create({
    data: {
      organisationId,
      abn: identity?.abn,
      identityProvenance: identity ? JSON.parse(JSON.stringify(identity.provenance)) : undefined,
      businessName: input.businessName.trim(),
      contactName: input.contactName?.trim() || null,
      contactEmail: input.contactEmail?.trim().toLowerCase() || null,
      contactPhone: input.contactPhone?.trim() || null,
      industry: input.industry?.trim() || null,
      location: input.location?.trim() || null,
      websiteUrl: input.websiteUrl?.trim() || null,
      ownerClerkUserId: input.ownerClerkUserId ?? input.actorId ?? null,
      stage: "prospect",
      metadata:
        input.metadata !== undefined
          ? (input.metadata as Prisma.InputJsonValue)
          : undefined,
    },
  }).catch(async (error: { code?: string }) => {
    if (identity && error.code === "P2002") {
      const existing = await prisma.growthProspect.findUnique({ where: { organisationId_abn: { organisationId, abn: identity.abn } } });
      if (existing) { reused = true; return existing; }
    }
    throw error;
  });

  if (reused) return serializeProspect(row);

  await prisma.growthProspectEngagement.create({
    data: {
      prospectId: row.id,
      type: "prospect_created",
      metadata: { source: "discovery" },
    },
  });

  await writeAuditLog({
    organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "GrowthProspect",
    entityId: row.id,
    changes: { businessName: row.businessName },
  });

  await platformEvents.publish({
    type: "prospect.created",
    organisationId,
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

  const existing = await prisma.growthProspect.findFirst({
    where: { id: input.prospectId, organisationId: input.organisationId },
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

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "GrowthProspect",
    entityId: row.id,
    changes: { stage: input.stage ?? existing.stage },
  });

  return serializeProspect(row);
}

/**
 * Soft-archive a prospect for demo cleanup.
 * Keeps audits/reports/engagements; hides from default lists and disables public share.
 */
export async function archiveGrowthProspect(input: {
  prospectId: string;
  organisationId: string;
  actorId?: string;
  operatorOrganisationId?: string;
}) {
  const { prisma } = await import("@dg/database");

  const existing = await prisma.growthProspect.findFirst({
    where: { id: input.prospectId, organisationId: input.organisationId },
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

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "archive",
    entityType: "GrowthProspect",
    entityId: row.id,
    changes: { archivedAt: row.archivedAt?.toISOString() },
  });

  await platformEvents.publish({
    type: "prospect.archived",
    organisationId: input.organisationId,
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
  organisationId: string;
  actorId?: string;
  operatorOrganisationId?: string;
}) {
  const { prisma } = await import("@dg/database");

  const existing = await prisma.growthProspect.findFirst({
    where: { id: input.prospectId, organisationId: input.organisationId },
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

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "restore",
    entityType: "GrowthProspect",
    entityId: row.id,
    changes: { archivedAt: null },
  });

  await platformEvents.publish({
    type: "prospect.restored",
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "GrowthProspect",
    entityId: row.id,
    payload: { businessName: row.businessName },
    occurredAt: new Date(),
  });

  return serializeProspect(row);
}

export async function getGrowthEngineSummary(organisationId: string) {
  const { prisma } = await import("@dg/database");

  const [total, byStage, recentEngagements] = await Promise.all([
    prisma.growthProspect.count({
      where: { organisationId, archivedAt: null },
    }),
    prisma.growthProspect.groupBy({
      by: ["stage"],
      where: { organisationId, archivedAt: null },
      _count: { id: true },
    }),
    prisma.growthProspectEngagement.count({
      where: {
        occurredAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        // Discovery/import/audit bookkeeping is system history, not sales activity.
        type: { notIn: ["prospect_created", "stage_changed", "audit_created"] },
        prospect: { organisationId, archivedAt: null },
      },
    }),
  ]);

  return {
    totalProspects: total,
    byStage: Object.fromEntries(byStage.map((s) => [s.stage, s._count.id])),
    engagementsThisWeek: recentEngagements,
  };
}

/**
 * One-time / ops helper — attach orphan prospects (null organisationId) to an org.
 * Used to backfill the pre-multi-tenant DigitalGate book.
 */
export async function backfillGrowthProspectOrganisation(
  organisationId: string,
): Promise<number> {
  const { prisma } = await import("@dg/database");
  const result = await prisma.growthProspect.updateMany({
    where: { organisationId: null },
    data: { organisationId },
  });
  return result.count;
}
