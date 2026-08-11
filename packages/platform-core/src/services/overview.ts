import { getActiveServiceTemplate, readOrgServicesSettings } from "./org-settings";
import { listServiceJobs } from "./jobs";

export type ServicesOverview = {
  templateKey: string | null;
  templateLabel: string;
  terminology: { job: string; customer: string; quote: string };
  counts: {
    openJobs: number;
    scheduledThisWeek: number;
    unassignedOpen: number;
    completed: number;
    quotes: number;
  };
  stageBreakdown: { stage: string; label: string; count: number }[];
  nextJobs: Awaited<ReturnType<typeof listServiceJobs>>["items"];
  recentJobs: Awaited<ReturnType<typeof listServiceJobs>>["items"];
  honestyNote: string;
};

export async function getServicesOverview(
  organisationId: string,
  orgSettings?: unknown,
): Promise<ServicesOverview> {
  const { prisma } = await import("@dg/database");
  const org =
    orgSettings !== undefined
      ? { settings: orgSettings }
      : await prisma.organisation.findUnique({
          where: { id: organisationId },
          select: { settings: true },
        });

  const template = getActiveServiceTemplate(org?.settings);
  const servicesCfg = readOrgServicesSettings(org?.settings);

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 14);

  const [
    openJobs,
    scheduledThisWeek,
    unassignedOpen,
    completed,
    quoteCount,
    nextJobs,
    recent,
  ] = await Promise.all([
    prisma.serviceJob.count({
      where: { organisationId, status: "open" },
    }),
    prisma.serviceJob.count({
      where: {
        organisationId,
        status: "open",
        scheduledStartAt: { gte: now, lte: weekEnd },
      },
    }),
    prisma.serviceJob.count({
      where: { organisationId, status: "open", assignedUserId: null },
    }),
    prisma.serviceJob.count({
      where: {
        organisationId,
        OR: [{ stage: "completed" }, { completedAt: { not: null } }],
      },
    }),
    prisma.commerceQuote.count({ where: { organisationId } }),
    listServiceJobs({
      organisationId,
      status: "open",
      scheduledFrom: now.toISOString(),
      scheduledTo: horizon.toISOString(),
      sort: "scheduled",
      limit: 6,
    }),
    listServiceJobs({ organisationId, sort: "updated", limit: 8 }),
  ]);

  const stageGroups = await prisma.serviceJob.groupBy({
    by: ["stage"],
    where: { organisationId, status: "open" },
    _count: { _all: true },
  });

  const labelByStage = new Map(template.workflow.map((s) => [s.id, s.label]));
  const stageBreakdown = stageGroups
    .map((g) => ({
      stage: g.stage,
      label: labelByStage.get(g.stage) ?? g.stage.replace(/_/g, " "),
      count: g._count._all,
    }))
    .sort((a, b) => {
      const ai = template.workflow.findIndex((s) => s.id === a.stage);
      const bi = template.workflow.findIndex((s) => s.id === b.stage);
      if (ai === -1 && bi === -1) return a.stage.localeCompare(b.stage);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  return {
    templateKey: servicesCfg.templateKey ?? null,
    templateLabel: template.label,
    terminology: template.terminology,
    counts: {
      openJobs,
      scheduledThisWeek,
      unassignedOpen,
      completed,
      quotes: quoteCount,
    },
    stageBreakdown,
    nextJobs: nextJobs.items,
    recentJobs: recent.items,
    honestyNote:
      "Closed beta — jobs, scheduling, stages, and templates are live. Quotes → Commerce, customers → CRM, team → Settings. No AI dispatcher, GPS tracking, or drag-and-drop calendar yet.",
  };
}
