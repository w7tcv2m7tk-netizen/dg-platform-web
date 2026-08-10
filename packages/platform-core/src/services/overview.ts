import { getActiveServiceTemplate, readOrgServicesSettings } from "./org-settings";
import { listServiceJobs } from "./jobs";

export type ServicesOverview = {
  templateKey: string | null;
  templateLabel: string;
  terminology: { job: string; customer: string; quote: string };
  counts: {
    openJobs: number;
    scheduledThisWeek: number;
    completed: number;
    quotes: number;
  };
  stageBreakdown: { stage: string; label: string; count: number }[];
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

  const [openJobs, scheduledThisWeek, completed, quoteCount, recent] = await Promise.all([
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
      where: {
        organisationId,
        OR: [{ stage: "completed" }, { completedAt: { not: null } }],
      },
    }),
    prisma.commerceQuote.count({ where: { organisationId } }),
    listServiceJobs({ organisationId, limit: 8 }),
  ]);

  const stageGroups = await prisma.serviceJob.groupBy({
    by: ["stage"],
    where: { organisationId, status: "open" },
    _count: { _all: true },
  });

  const labelByStage = new Map(template.workflow.map((s) => [s.id, s.label]));
  const stageBreakdown = stageGroups.map((g) => ({
    stage: g.stage,
    label: labelByStage.get(g.stage) ?? g.stage.replace(/_/g, " "),
    count: g._count._all,
  }));

  return {
    templateKey: servicesCfg.templateKey ?? null,
    templateLabel: template.label,
    terminology: template.terminology,
    counts: {
      openJobs,
      scheduledThisWeek,
      completed,
      quotes: quoteCount,
    },
    stageBreakdown,
    recentJobs: recent.items,
    honestyNote:
      "Services MVP — jobs & templates live. Matching Commerce invoices and Reviews request are linked via Core; automation rules are optional next.",
  };
}
