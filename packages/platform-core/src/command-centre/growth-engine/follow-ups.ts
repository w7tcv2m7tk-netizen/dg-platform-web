import type { ProspectPipelineStage } from "./types";

const IDLE_FOLLOW_UP_STAGES: ProspectPipelineStage[] = [
  "prospect",
  "audit_created",
  "report_sent",
  "email_opened",
  "report_viewed",
  "follow_up_due",
  "meeting_booked",
  "proposal_sent",
];

function daysSince(isoOrDate: Date) {
  return Math.floor((Date.now() - isoOrDate.getTime()) / (24 * 60 * 60 * 1000));
}

/** Queue of prospects that look idle based on stage + last update — real pipeline data. */
export async function getGrowthFollowUpQueue(options?: {
  idleDays?: number;
  limit?: number;
}) {
  const { prisma } = await import("@dg/database");
  const idleDays = options?.idleDays ?? 5;
  const limit = Math.min(options?.limit ?? 40, 100);
  const cutoff = new Date(Date.now() - idleDays * 24 * 60 * 60 * 1000);

  const rows = await prisma.growthProspect.findMany({
    where: {
      stage: { in: IDLE_FOLLOW_UP_STAGES },
      updatedAt: { lte: cutoff },
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
    include: {
      engagements: {
        orderBy: { occurredAt: "desc" },
        take: 1,
      },
      reports: {
        orderBy: { generatedAt: "desc" },
        take: 1,
      },
      audits: {
        orderBy: { auditedAt: "desc" },
        take: 1,
      },
    },
  });

  return rows.map((row) => {
    const idle = daysSince(row.updatedAt);
    const latestEngagement = row.engagements[0];
    const reason =
      row.stage === "prospect" && !row.audits[0]
        ? "No audit yet — run presence audit"
        : row.stage === "audit_created" && !row.reports[0]
          ? "Audit ready — generate and send opportunity report"
          : row.stage === "report_sent" || row.stage === "email_opened"
            ? "Report outbound with no recent engagement logged"
            : row.stage === "report_viewed"
              ? "High intent — schedule a call"
              : `Idle in ${row.stage.replace(/_/g, " ")}`;

    return {
      prospectId: row.id,
      businessName: row.businessName,
      stage: row.stage as ProspectPipelineStage,
      industry: row.industry,
      location: row.location,
      websiteUrl: row.websiteUrl,
      contactEmail: row.contactEmail,
      contactPhone: row.contactPhone,
      idleDays: idle,
      reason,
      lastEngagementType: latestEngagement?.type ?? null,
      lastEngagementAt: latestEngagement?.occurredAt.toISOString() ?? null,
      latestAuditScore: row.audits[0]?.businessHealth ?? null,
      hasReport: Boolean(row.reports[0]),
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}
