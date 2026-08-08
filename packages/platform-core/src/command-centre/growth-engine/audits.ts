import { randomBytes } from "node:crypto";

import type { ProspectAuditFinding, ProspectAuditScores } from "./types";
import { runPresenceAudit } from "./presence-audit";
import { updateGrowthProspect } from "./prospects";

export interface CreateGrowthProspectAuditInput {
  prospectId: string;
  scores: ProspectAuditScores;
  findings?: Record<string, unknown> | ProspectAuditFinding[];
  auditVersion?: string;
  actorId?: string;
  operatorOrganisationId?: string;
}

function serializeAudit(row: {
  id: string;
  prospectId: string;
  businessHealth: number | null;
  aiVisibility: number | null;
  seoScore: number | null;
  websiteHealth: number | null;
  findings: unknown;
  auditVersion: string;
  auditedAt: Date;
}) {
  return {
    id: row.id,
    prospectId: row.prospectId,
    businessHealth: row.businessHealth,
    aiVisibility: row.aiVisibility,
    seoScore: row.seoScore,
    websiteHealth: row.websiteHealth,
    findings: row.findings,
    auditVersion: row.auditVersion,
    auditedAt: row.auditedAt.toISOString(),
  };
}

export async function createGrowthProspectAudit(input: CreateGrowthProspectAuditInput) {
  const { prisma } = await import("@dg/database");

  const audit = await prisma.growthProspectAudit.create({
    data: {
      prospectId: input.prospectId,
      businessHealth: input.scores.businessHealth ?? null,
      aiVisibility: input.scores.aiVisibility ?? null,
      seoScore: input.scores.seo ?? null,
      websiteHealth: input.scores.websiteHealth ?? null,
      findings: (input.findings ?? {}) as object,
      auditVersion: input.auditVersion ?? "1.0",
    },
  });

  await updateGrowthProspect({
    prospectId: input.prospectId,
    stage: "audit_created",
    actorId: input.actorId,
    operatorOrganisationId: input.operatorOrganisationId,
  });

  await prisma.growthProspectEngagement.create({
    data: {
      prospectId: input.prospectId,
      type: "audit_created",
      metadata: {
        auditId: audit.id,
        businessHealth: input.scores.businessHealth,
      },
    },
  });

  return serializeAudit(audit);
}

/** Live presence audit for a prospect — fetches website signals when a URL exists. */
export async function runGrowthProspectAudit(input: {
  prospectId: string;
  actorId?: string;
  operatorOrganisationId?: string;
}) {
  const { prisma } = await import("@dg/database");
  const prospect = await prisma.growthProspect.findUnique({
    where: { id: input.prospectId },
  });
  if (!prospect) return null;

  const presence = await runPresenceAudit({
    businessName: prospect.businessName,
    websiteUrl: prospect.websiteUrl,
    industry: prospect.industry,
    location: prospect.location,
    contactEmail: prospect.contactEmail,
    contactPhone: prospect.contactPhone,
  });

  const audit = await createGrowthProspectAudit({
    prospectId: prospect.id,
    scores: presence.scores,
    findings: {
      items: presence.findings,
      probes: presence.probes,
    },
    auditVersion: "presence-1.0",
    actorId: input.actorId,
    operatorOrganisationId: input.operatorOrganisationId,
  });

  return {
    ...audit,
    prospect: {
      id: prospect.id,
      businessName: prospect.businessName,
      websiteUrl: prospect.websiteUrl,
      industry: prospect.industry,
      location: prospect.location,
    },
    findingsList: presence.findings,
    probes: presence.probes,
  };
}

export async function listGrowthProspectAudits(options?: { limit?: number }) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options?.limit ?? 50, 100);

  const rows = await prisma.growthProspectAudit.findMany({
    orderBy: { auditedAt: "desc" },
    take: limit,
    include: {
      prospect: {
        select: {
          id: true,
          businessName: true,
          websiteUrl: true,
          industry: true,
          location: true,
          stage: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    ...serializeAudit(row),
    prospect: row.prospect,
  }));
}

export async function listProspectsNeedingAudit(options?: { limit?: number }) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options?.limit ?? 40, 100);

  const rows = await prisma.growthProspect.findMany({
    where: {
      stage: { in: ["prospect", "audit_created"] },
      audits: { none: {} },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      businessName: true,
      websiteUrl: true,
      industry: true,
      location: true,
      stage: true,
      updatedAt: true,
    },
  });

  return rows.map((r) => ({
    ...r,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export function newShareToken() {
  return randomBytes(18).toString("base64url");
}
