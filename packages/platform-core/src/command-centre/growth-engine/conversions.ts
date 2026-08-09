import type { GrowthConversionDashboard } from "./types";

function percent(part: number, whole: number) {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

/** Funnel metrics from real Growth Engine tables — no invented MRR. */
export async function getGrowthConversionDashboard(options?: {
  days?: number;
}): Promise<GrowthConversionDashboard> {
  const { prisma } = await import("@dg/database");
  const days = options?.days ?? 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    auditsGenerated,
    reportsSent,
    emailOpened,
    reportViewed,
    meetingsBooked,
    won,
    lost,
  ] = await Promise.all([
    prisma.growthProspectAudit.count({ where: { auditedAt: { gte: since } } }),
    prisma.growthProspectReport.count({ where: { sentAt: { gte: since } } }),
    prisma.growthProspectEngagement.count({
      where: { type: "email_opened", occurredAt: { gte: since } },
    }),
    prisma.growthProspectEngagement.count({
      where: { type: "report_viewed", occurredAt: { gte: since } },
    }),
    prisma.growthProspectEngagement.count({
      where: { type: "meeting_booked", occurredAt: { gte: since } },
    }),
    prisma.growthProspect.count({
      where: { archivedAt: null, stage: "won", updatedAt: { gte: since } },
    }),
    prisma.growthProspect.count({
      where: { archivedAt: null, stage: "lost", updatedAt: { gte: since } },
    }),
  ]);

  const decided = won + lost;
  const conversionRatePercent = percent(won, decided || auditsGenerated || 1);
  const emailOpenRatePercent = percent(emailOpened, reportsSent);
  const reportViewRatePercent = percent(reportViewed, reportsSent);

  const wonRows = await prisma.growthProspect.findMany({
    where: { archivedAt: null, stage: "won", updatedAt: { gte: since } },
    select: { createdAt: true, updatedAt: true },
    take: 50,
  });
  const averageSalesCycleDays =
    wonRows.length === 0
      ? 0
      : Math.round(
          wonRows.reduce(
            (sum, row) =>
              sum + (row.updatedAt.getTime() - row.createdAt.getTime()) / (24 * 60 * 60 * 1000),
            0,
          ) / wonRows.length,
        );

  return {
    periodLabel: `Last ${days} days`,
    auditsGenerated,
    reportsSent,
    emailOpenRatePercent,
    reportViewRatePercent,
    meetingsBooked,
    conversionRatePercent,
    mrrWonCents: 0,
    averageSalesCycleDays,
    revenueForecastCents: 0,
    generatedAt: new Date(),
  };
}

export async function getGrowthConversionSnapshot(options?: { days?: number }) {
  const base = await getGrowthConversionDashboard(options);
  const { prisma } = await import("@dg/database");
  const days = options?.days ?? 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [won, lost, proposalsSent, totalProspects, byStage, recentWins] =
    await Promise.all([
      prisma.growthProspect.count({
        where: { archivedAt: null, stage: "won", updatedAt: { gte: since } },
      }),
      prisma.growthProspect.count({
        where: { archivedAt: null, stage: "lost", updatedAt: { gte: since } },
      }),
      prisma.growthProspectEngagement.count({
        where: {
          type: "proposal_sent",
          occurredAt: { gte: since },
          prospect: { archivedAt: null },
        },
      }),
      prisma.growthProspect.count({ where: { archivedAt: null } }),
      prisma.growthProspect.groupBy({
        by: ["stage"],
        where: { archivedAt: null },
        _count: { id: true },
      }),
      prisma.growthProspect.findMany({
        where: { archivedAt: null, stage: { in: ["won", "onboarding"] } },
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: {
          id: true,
          businessName: true,
          stage: true,
          industry: true,
          location: true,
          updatedAt: true,
          convertedOrganisationId: true,
        },
      }),
    ]);

  return {
    ...base,
    won,
    lost,
    proposalsSent,
    totalProspects,
    byStage: Object.fromEntries(byStage.map((s) => [s.stage, s._count.id])),
    mrrWonCents: 0,
    mrrForecastCents: 0,
    mrrWonLabel: "$0",
    mrrForecastLabel: "$0",
    mrrNote:
      "Growth MRR won and revenue forecast are intentionally $0 until Growth → Stripe subscription attribution ships. Commerce MRR on /command/revenue is separate (Neon subscriptions).",
    recentWins: recentWins.map((r) => ({
      ...r,
      updatedAt: r.updatedAt.toISOString(),
    })),
  };
}
