export interface HealthHistoryEntry {
  month: string;
  score: number;
  capturedAt: string;
}

type OrgSettings = {
  overview?: {
    healthHistory?: HealthHistoryEntry[];
  };
};

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Load stored Business Health history (up to 12 months). */
export async function loadHealthHistory(
  organisationId: string,
): Promise<HealthHistoryEntry[]> {
  const { prisma } = await import("@dg/database");

  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });

  const settings = (org?.settings as OrgSettings | null) ?? {};
  const history = settings.overview?.healthHistory ?? [];
  return [...history].sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
}

/** Append or update this month's Business Health score. */
export async function persistHealthSnapshot(
  organisationId: string,
  score: number,
): Promise<HealthHistoryEntry[]> {
  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });

  const settings = (org?.settings as OrgSettings | null) ?? {};
  const existing = settings.overview?.healthHistory ?? [];
  const key = monthKey();
  const entry: HealthHistoryEntry = {
    month: key,
    score,
    capturedAt: new Date().toISOString(),
  };

  const withoutCurrent = existing.filter((h) => h.month !== key);
  const next = [...withoutCurrent, entry]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  await prisma.organisation.update({
    where: { id: organisationId },
    data: {
      settings: {
        ...settings,
        overview: {
          ...settings.overview,
          healthHistory: next,
        },
      } as unknown as InputJsonValue,
    },
  });

  return next;
}

/**
 * Build a trend from observed Business Health measurements only.
 * With no stored history there is no trend to display; DigitalGate does not backfill one.
 */
export function healthTrendFromHistory(
  history: HealthHistoryEntry[],
  currentScore: number,
): number[] {
  if (history.length === 0) return [];

  const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
  const values = sorted.map((entry) => entry.score).slice(-12);
  if (values[values.length - 1] !== currentScore) {
    values.push(currentScore);
  }
  return values.slice(-12);
}

export function healthDeltaFromHistory(
  history: HealthHistoryEntry[],
  currentScore: number,
): number {
  if (history.length < 2) return 0;
  const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
  const prev = sorted[sorted.length - 2]?.score;
  if (prev == null) return 0;
  return currentScore - prev;
}
