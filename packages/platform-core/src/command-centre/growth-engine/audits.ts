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

import {
  growthScopeProspectWhere,
  growthScopeWhere,
  type GrowthScope,
} from "./scope";

export async function createGrowthProspectAudit(input: CreateGrowthProspectAuditInput) {
  const { prisma } = await import("@dg/database");

  const prospect = await prisma.growthProspect.findUnique({
    where: { id: input.prospectId },
    select: { id: true, organisationId: true, archivedAt: true },
  });
  if (!prospect || prospect.archivedAt) return null;

  const organisationId =
    prospect.organisationId ?? input.operatorOrganisationId ?? undefined;
  if (!organisationId) {
    throw new Error("organisationId is required to audit a growth prospect");
  }

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
    organisationId,
    stage: "audit_created",
    actorId: input.actorId,
    operatorOrganisationId: organisationId,
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

type DigitalGateSolutionMatch = {
  capability: string;
  opportunity: string;
  evidence: string;
  benefit: string;
  relevance: "high" | "medium";
};

function buildDigitalGateSolutionMatches(presence: Awaited<ReturnType<typeof runPresenceAudit>>): DigitalGateSolutionMatch[] {
  const matches: DigitalGateSolutionMatch[] = [];
  const findings = presence.findings || [];
  const has = (re: RegExp) => findings.some((f) => re.test(`${f.title} ${f.category || ""} ${f.domain}`));

  if ((presence.scores.aiVisibility ?? 100) < 60 || has(/structured|ai.visibility/i)) matches.push({
    capability: "AI Visibility Framework™",
    opportunity: "Improve how search engines and AI systems understand and surface the business.",
    evidence: `AI Visibility ${presence.scores.aiVisibility ?? "—"}/100`,
    benefit: "Stronger machine-readable entity signals and a clearer foundation for AI/search discovery.",
    relevance: "high",
  });
  if ((presence.scores.seo ?? 100) < 65 || has(/h1|meta|search|seo/i)) matches.push({
    capability: "SEO & Growth",
    opportunity: "Strengthen organic visibility and search-result foundations.",
    evidence: `Search Visibility ${presence.scores.seo ?? "—"}/100`,
    benefit: "Improve the business's ability to be discovered for commercially relevant searches.",
    relevance: "high",
  });
  if ((presence.scores.conversionReadiness ?? 100) < 70 || has(/conversion|form|call.to.action|contact pathway/i)) matches.push({
    capability: "Websites & Lead Generation",
    opportunity: "Turn more existing website attention into identifiable enquiries and next actions.",
    evidence: `Conversion Readiness ${presence.scores.conversionReadiness ?? "—"}/100`,
    benefit: "Clearer conversion journeys and more measurable lead capture.",
    relevance: "high",
  });
  if ((presence.scores.reputation ?? 100) < 70 || has(/review|reputation|local/i)) matches.push({
    capability: "Reputation & Local Visibility",
    opportunity: "Strengthen trust and local/entity authority around the business.",
    evidence: `Reputation & Presence ${presence.scores.reputation ?? "—"}/100`,
    benefit: "Stronger trust signals for prospects and better local business context for search systems.",
    relevance: "medium",
  });
  if ((presence.scores.growthSignals ?? 100) < 70 || has(/analytics|tracking|measurement/i)) matches.push({
    capability: "Analytics & Business Intelligence",
    opportunity: "Make lead-generation and marketing performance measurable.",
    evidence: `Growth Signals ${presence.scores.growthSignals ?? "—"}/100`,
    benefit: "Connect activity to enquiries, pipeline and commercial outcomes rather than isolated marketing metrics.",
    relevance: "medium",
  });
  if (presence.industryPack === "real_estate") {
    matches.push({
      capability: "Real Estate Industry App",
      opportunity: "Connect appraisal generation, prospecting, CRM follow-up and local market authority into one operating workflow.",
      evidence: "Real Estate industry profile identified",
      benefit: "Create a more systematic vendor-acquisition and relationship pipeline around the agency's existing digital presence.",
      relevance: "high",
    });
    matches.push({
      capability: "Prospecting + CRM + Automation",
      opportunity: "Capture and progress buyer, seller and appraisal intent with consistent next actions.",
      evidence: "Real Estate customer journey requires ongoing relationship follow-up",
      benefit: "Reduce lead leakage and turn digital intent into an organised prospect-to-customer workflow.",
      relevance: "high",
    });
  }
  return matches.slice(0, 8);
}

/** Live presence audit for a prospect — fetches website signals when a URL exists. */
export async function runGrowthProspectAudit(input: {
  prospectId: string;
  scope: GrowthScope;
  actorId?: string;
  operatorOrganisationId?: string;
}) {
  const { prisma } = await import("@dg/database");
  const prospect = await prisma.growthProspect.findFirst({
    where: { id: input.prospectId, ...growthScopeWhere(input.scope) },
  });
  if (!prospect || prospect.archivedAt) return null;

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
    operatorOrganisationId:
      input.operatorOrganisationId ?? prospect.organisationId ?? undefined,
  });
  if (!audit) return null;

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

export async function listGrowthProspectAudits(
  scope: GrowthScope,
  options?: { limit?: number },
) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options?.limit ?? 50, 100);

  const scoped = growthScopeProspectWhere(scope).prospect;
  const rows = await prisma.growthProspectAudit.findMany({
    where: {
      prospect: {
        ...scoped,
        archivedAt: null,
      },
    },
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

export async function listProspectsNeedingAudit(options?: {
  organisationId?: string;
  limit?: number;
}) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options?.limit ?? 40, 100);

  const rows = await prisma.growthProspect.findMany({
    where: {
      archivedAt: null,
      ...(options?.organisationId
        ? { organisationId: options.organisationId }
        : {}),
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
