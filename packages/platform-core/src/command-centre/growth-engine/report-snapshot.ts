import type { PrismaClient } from "@dg/database";
import { randomBytes } from "node:crypto";

type ReportDatabase = Pick<PrismaClient, "$transaction">;
type ProspectIdentity = {
  businessName: string;
  websiteUrl: string | null;
  industry: string | null;
  location: string | null;
};

export function prospectReportIdentity(prospect: ProspectIdentity): ProspectIdentity {
  return {
    businessName: prospect.businessName,
    websiteUrl: prospect.websiteUrl,
    industry: prospect.industry,
    location: prospect.location,
  };
}

export function savedProspectReportIdentity(value: unknown): ProspectIdentity | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value as Record<string, unknown>;
  if (typeof snapshot.businessName !== "string" || !snapshot.businessName.trim()) return null;
  if (["websiteUrl", "industry", "location"].some(key => snapshot[key] !== null && typeof snapshot[key] !== "string")) return null;
  const nullable = (key: string) => typeof snapshot[key] === "string" ? snapshot[key] as string : null;
  return { businessName: snapshot.businessName, websiteUrl: nullable("websiteUrl"), industry: nullable("industry"), location: nullable("location") };
}

/** Both token routes must use this boundary. Missing/mismatched snapshots fail closed. */
export async function loadGrowthReportSnapshot(
  db: ReportDatabase,
  token: string,
  access: { kind: "public"; recordView: boolean } | { kind: "preview"; organisationId: string },
) {
  if (!token.trim() || (access.kind === "preview" && !access.organisationId.trim())) return null;
  return db.$transaction(async (tx) => {
    const report = await tx.growthProspectReport.findFirst({
      where: {
        shareToken: token.trim(), revokedAt: null,
        prospect: {
          archivedAt: null,
          ...(access.kind === "preview" ? { organisationId: access.organisationId } : {}),
        },
      },
      include: { prospect: true },
    });
    if (!report || report.revokedAt || report.prospect.archivedAt || !report.auditId) return null;
    if (access.kind === "preview" && report.prospect.organisationId !== access.organisationId) return null;
    const prospect = savedProspectReportIdentity(report.prospectSnapshot);
    // Legacy records cannot truthfully reconstruct their historical business identity.
    // Preserve their data/token, but require a newly generated complete snapshot.
    if (!prospect) return null;
    const audit = await tx.growthProspectAudit.findFirst({ where: { id: report.auditId, prospectId: report.prospectId } });
    if (!audit) return null;
    let viewCount = report.viewCount;
    let firstViewedAt = report.firstViewedAt;
    if (access.kind === "public" && access.recordView) {
      const now = new Date();
      const updated = await tx.growthProspectReport.updateMany({
        where: { id: report.id, revokedAt: null, prospect: { archivedAt: null } },
        data: { viewCount: { increment: 1 }, firstViewedAt: firstViewedAt ?? now },
      });
      if (!updated.count) return null;
      viewCount += 1;
      firstViewedAt ??= now;
      await tx.growthProspectEngagement.create({ data: {
        prospectId: report.prospectId, reportId: report.id, type: "report_viewed",
        metadata: { meaning: "public_url_accessed", recipientIdentity: "unknown" },
      } });
    }
    return { report: { ...report, viewCount, firstViewedAt }, audit, prospect };
  });
}

/** Reuse only the same evidence snapshot. New research requires a new token/date. */
export async function generateGrowthReportSnapshot(db: ReportDatabase, prospectId: string, organisationId: string) {
  return db.$transaction(async (tx) => {
    // Serialize generation for this prospect, without a legacy-data backfill or
    // unique index. The lock lasts through the existing-snapshot check/create.
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM growth_prospects
      WHERE id = ${prospectId} AND organisation_id = ${organisationId}
        AND archived_at IS NULL FOR UPDATE
    `;
    if (!locked.length) return null;
    const prospect = await tx.growthProspect.findFirst({ where: { id: prospectId, organisationId, archivedAt: null } });
    if (!prospect) return null;
    const audit = await tx.growthProspectAudit.findFirst({ where: { prospectId }, orderBy: { auditedAt: "desc" } });
    if (!audit) return null;
    const existing = await tx.growthProspectReport.findFirst({
      where: { prospectId, auditId: audit.id, revokedAt: null }, orderBy: { generatedAt: "desc" },
    });
    if (existing && savedProspectReportIdentity(existing.prospectSnapshot)) return { report: existing, created: false };
    const report = await tx.growthProspectReport.create({ data: {
      prospectId, auditId: audit.id, shareToken: randomBytes(24).toString("hex"),
      prospectSnapshot: prospectReportIdentity(prospect),
      executiveSummary: `Digital opportunity report for ${prospect.businessName}, grounded in the attached DigitalGate research audit.`,
    } });
    await tx.growthProspectEngagement.create({ data: { prospectId, reportId: report.id, type: "report_generated" } });
    return { report, created: true };
  });
}
