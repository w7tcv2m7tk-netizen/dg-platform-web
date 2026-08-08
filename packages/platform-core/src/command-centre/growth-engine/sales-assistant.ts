/**
 * Growth Engine Sales Assistant v0 — ranked “call today” list from live pipeline signals.
 * Priority uses idle days, report views, health score, and stage intent — no invented metrics.
 */

import type { ProspectPipelineStage, SalesCallRecommendation } from "./types";

const CALL_STAGES: ProspectPipelineStage[] = [
  "report_sent",
  "email_opened",
  "report_viewed",
  "follow_up_due",
  "meeting_booked",
  "proposal_sent",
];

const STAGE_WEIGHT: Partial<Record<ProspectPipelineStage, number>> = {
  report_viewed: 40,
  follow_up_due: 35,
  email_opened: 30,
  meeting_booked: 28,
  proposal_sent: 25,
  report_sent: 18,
};

function daysSince(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

function buildReason(input: {
  stage: ProspectPipelineStage;
  idleDays: number;
  viewCount: number;
  businessHealth: number | null;
}): string {
  const parts: string[] = [];
  if (input.stage === "report_viewed") {
    parts.push("Viewed report — high intent");
  } else if (input.stage === "email_opened") {
    parts.push("Opened outbound — nudge to view");
  } else if (input.stage === "meeting_booked") {
    parts.push("Meeting booked — confirm next step");
  } else if (input.stage === "proposal_sent") {
    parts.push("Proposal out — close the loop");
  } else if (input.stage === "report_sent") {
    parts.push("Report sent with no view yet");
  } else {
    parts.push(`Idle in ${input.stage.replace(/_/g, " ")}`);
  }
  if (input.viewCount > 0) {
    parts.push(`${input.viewCount} report view${input.viewCount === 1 ? "" : "s"}`);
  }
  if (input.businessHealth != null) {
    parts.push(`Health ${input.businessHealth}`);
  }
  parts.push(`idle ${input.idleDays}d`);
  return parts.join(" · ");
}

/** Ranked call-today list from real idle + engagement + score signals. */
export async function getSalesCallRecommendations(options?: {
  limit?: number;
  idleDays?: number;
}): Promise<SalesCallRecommendation[]> {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options?.limit ?? 12, 40);
  const idleDays = options?.idleDays ?? 2;
  const cutoff = new Date(Date.now() - idleDays * 24 * 60 * 60 * 1000);

  const rows = await prisma.growthProspect.findMany({
    where: {
      archivedAt: null,
      convertedOrganisationId: null,
      stage: { in: CALL_STAGES },
      OR: [{ updatedAt: { lte: cutoff } }, { stage: { in: ["report_viewed", "follow_up_due"] } }],
    },
    orderBy: { updatedAt: "asc" },
    take: 80,
    include: {
      reports: {
        orderBy: { generatedAt: "desc" },
        take: 1,
        select: { viewCount: true, sentAt: true, firstViewedAt: true },
      },
      audits: {
        orderBy: { auditedAt: "desc" },
        take: 1,
        select: { businessHealth: true },
      },
    },
  });

  const ranked = rows
    .map((row) => {
      const stage = row.stage as ProspectPipelineStage;
      const idle = daysSince(row.updatedAt);
      const viewCount = row.reports[0]?.viewCount ?? 0;
      const businessHealth = row.audits[0]?.businessHealth ?? null;
      const stageBoost = STAGE_WEIGHT[stage] ?? 10;
      const idleBoost = Math.min(idle, 30);
      const viewBoost = Math.min(viewCount * 8, 32);
      // Lower health = more urgency for outreach (cap contribution).
      const healthBoost =
        businessHealth == null ? 5 : Math.max(0, Math.round((100 - businessHealth) / 5));
      const priority = stageBoost + idleBoost + viewBoost + healthBoost;

      return {
        prospectId: row.id,
        businessName: row.businessName,
        reason: buildReason({ stage, idleDays: idle, viewCount, businessHealth }),
        businessHealthScore: businessHealth ?? 0,
        reportViewCount: viewCount,
        stage,
        priority,
      } satisfies SalesCallRecommendation;
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);

  return ranked;
}
