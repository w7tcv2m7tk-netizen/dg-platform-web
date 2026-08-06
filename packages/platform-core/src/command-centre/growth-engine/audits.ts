import type { ProspectAuditScores } from "./types";
import { updateGrowthProspect } from "./prospects";

export interface CreateGrowthProspectAuditInput {
  prospectId: string;
  scores: ProspectAuditScores;
  findings?: Record<string, unknown>;
  auditVersion?: string;
  actorId?: string;
  operatorOrganisationId?: string;
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

  return {
    id: audit.id,
    prospectId: audit.prospectId,
    businessHealth: audit.businessHealth,
    aiVisibility: audit.aiVisibility,
    seoScore: audit.seoScore,
    websiteHealth: audit.websiteHealth,
    findings: audit.findings,
    auditedAt: audit.auditedAt.toISOString(),
  };
}
