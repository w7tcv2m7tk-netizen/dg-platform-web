import { emptyIfUnmigrated } from "./db";
import { isElevenLabsConfigured } from "./providers/elevenlabs";
import { getCommunicationProvider } from "./providers/router";

export type CommunicationsOverview = {
  callsToday: number;
  conversations: number;
  leadsGenerated: number;
  appointmentsBooked: number;
  aiResolutionRate: number;
  estimatedCostCents: number;
  inbound: number;
  outbound: number;
  missed: number;
  transferred: number;
  failed: number;
  answerRate: number;
  averageDurationSeconds: number;
  alerts: string[];
};

export async function getCommunicationsOverview(
  organisationId: string,
): Promise<CommunicationsOverview> {
  const { prisma } = await import("@dg/database");
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return emptyIfUnmigrated(async () => {
    const sessions = await prisma.communicationSession.findMany({
      where: { organisationId },
      select: {
        status: true,
        direction: true,
        outcome: true,
        durationSeconds: true,
        costCents: true,
        startedAt: true,
        createdAt: true,
      },
    });

    const today = sessions.filter(
      (row) => (row.startedAt ?? row.createdAt) >= startOfDay,
    );
    const inbound = sessions.filter((row) => row.direction === "inbound").length;
    const outbound = sessions.filter((row) => row.direction === "outbound").length;
    const missed = sessions.filter((row) => row.status === "missed").length;
    const transferred = sessions.filter((row) => row.status === "transferred").length;
    const failed = sessions.filter((row) => row.status === "failed").length;
    const completed = sessions.filter((row) => row.status === "completed").length;
    const answered = sessions.filter((row) =>
      ["completed", "transferred", "in_progress"].includes(row.status),
    ).length;
    const durations = sessions
      .map((row) => row.durationSeconds ?? 0)
      .filter((n) => n > 0);
    const leads = sessions.filter((row) => row.outcome === "lead").length;
    const appointments = sessions.filter((row) => row.outcome === "appointment_booked").length;
    const cost = sessions.reduce((sum, row) => sum + (row.costCents ?? 0), 0);
    const transferRate = sessions.length ? transferred / sessions.length : 0;

    const alerts: string[] = [];
    if (failed > 0) alerts.push(`${failed} failed call${failed === 1 ? "" : "s"}`);
    if (transferRate >= 0.4 && sessions.length >= 5) {
      alerts.push("High human transfer rate");
    }
    if (!isElevenLabsConfigured()) alerts.push("Voice provider API key is not configured");

    return {
      callsToday: today.length,
      conversations: sessions.length,
      leadsGenerated: leads,
      appointmentsBooked: appointments,
      aiResolutionRate: sessions.length
        ? Math.round(((completed - transferred) / sessions.length) * 1000) / 10
        : 0,
      estimatedCostCents: cost,
      inbound,
      outbound,
      missed,
      transferred,
      failed,
      answerRate: inbound ? Math.round((answered / inbound) * 1000) / 10 : 0,
      averageDurationSeconds: durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0,
      alerts,
    };
  }, {
    callsToday: 0,
    conversations: 0,
    leadsGenerated: 0,
    appointmentsBooked: 0,
    aiResolutionRate: 0,
    estimatedCostCents: 0,
    inbound: 0,
    outbound: 0,
    missed: 0,
    transferred: 0,
    failed: 0,
    answerRate: 0,
    averageDurationSeconds: 0,
    alerts: isElevenLabsConfigured() ? [] : ["Voice provider API key is not configured"],
  });
}

export async function getVoiceProviderStatus() {
  const configured = isElevenLabsConfigured();
  if (!configured) {
    return {
      provider: "stub",
      connected: false,
      configured: false,
      usage: null as unknown,
    };
  }
  const usage = await getCommunicationProvider("elevenlabs").getUsage();
  return {
    provider: "elevenlabs",
    connected: usage.connected,
    configured: true,
    usage: usage.raw ?? null,
  };
}
