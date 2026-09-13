import { runAiVisibilityModelObservations } from "./model-observer";

export type AiVisibilityRecurringMonitoringSettings = {
  enabled: boolean;
  cadence: "weekly";
  maxPromptsPerRun: number;
  updatedAt: string | null;
  lastAttemptAt: string | null;
  lastCompletedAt: string | null;
  lastRunStatus: "success" | "failed" | null;
  lastError: string | null;
};

type OrganisationSettings = {
  aiVisibilityMonitoring?: Partial<AiVisibilityRecurringMonitoringSettings>;
  [key: string]: unknown;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_SETTINGS: AiVisibilityRecurringMonitoringSettings = {
  enabled: false,
  cadence: "weekly",
  maxPromptsPerRun: 3,
  updatedAt: null,
  lastAttemptAt: null,
  lastCompletedAt: null,
  lastRunStatus: null,
  lastError: null,
};

function clampPrompts(value: unknown) {
  const numeric = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : 3;
  return Math.max(1, Math.min(3, numeric));
}

function normaliseSettings(value: unknown): AiVisibilityRecurringMonitoringSettings {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Partial<AiVisibilityRecurringMonitoringSettings>)
    : {};
  return {
    enabled: raw.enabled === true,
    cadence: "weekly",
    maxPromptsPerRun: clampPrompts(raw.maxPromptsPerRun),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
    lastAttemptAt: typeof raw.lastAttemptAt === "string" ? raw.lastAttemptAt : null,
    lastCompletedAt: typeof raw.lastCompletedAt === "string" ? raw.lastCompletedAt : null,
    lastRunStatus: raw.lastRunStatus === "success" || raw.lastRunStatus === "failed" ? raw.lastRunStatus : null,
    lastError: typeof raw.lastError === "string" ? raw.lastError : null,
  };
}

function isDue(settings: AiVisibilityRecurringMonitoringSettings, now: Date) {
  if (!settings.enabled) return false;
  if (!settings.lastAttemptAt) return true;
  const attemptedAt = new Date(settings.lastAttemptAt).getTime();
  if (!Number.isFinite(attemptedAt)) return true;
  return now.getTime() - attemptedAt >= WEEK_MS;
}

async function readOrganisationSettings(organisationId: string): Promise<OrganisationSettings | null> {
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  if (!org) return null;
  return (org.settings as OrganisationSettings | null) ?? {};
}

async function writeMonitoringSettings(
  organisationId: string,
  settings: AiVisibilityRecurringMonitoringSettings,
) {
  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;
  const current = await readOrganisationSettings(organisationId);
  if (!current) throw new Error("Organisation not found");
  await prisma.organisation.update({
    where: { id: organisationId },
    data: {
      settings: {
        ...current,
        aiVisibilityMonitoring: settings,
      } as unknown as InputJsonValue,
    },
  });
  return settings;
}

export async function getAiVisibilityRecurringMonitoringSettings(
  organisationId: string,
): Promise<AiVisibilityRecurringMonitoringSettings> {
  if (!process.env.DATABASE_URL) return DEFAULT_SETTINGS;
  const settings = await readOrganisationSettings(organisationId);
  return normaliseSettings(settings?.aiVisibilityMonitoring);
}

export async function updateAiVisibilityRecurringMonitoringSettings(input: {
  organisationId: string;
  enabled: boolean;
  maxPromptsPerRun?: number;
}): Promise<AiVisibilityRecurringMonitoringSettings> {
  const previous = await getAiVisibilityRecurringMonitoringSettings(input.organisationId);
  const next: AiVisibilityRecurringMonitoringSettings = {
    ...previous,
    enabled: input.enabled === true,
    cadence: "weekly",
    maxPromptsPerRun: clampPrompts(input.maxPromptsPerRun ?? previous.maxPromptsPerRun),
    updatedAt: new Date().toISOString(),
    lastError: input.enabled ? previous.lastError : null,
  };
  return writeMonitoringSettings(input.organisationId, next);
}

export async function processDueAiVisibilityMonitoring(input?: {
  organisationLimit?: number;
  now?: Date;
}) {
  if (!process.env.DATABASE_URL) {
    return { checked: 0, due: 0, completed: 0, failed: 0, results: [] as Array<Record<string, unknown>> };
  }

  const { prisma } = await import("@dg/database");
  const now = input?.now ?? new Date();
  const organisationLimit = Math.max(1, Math.min(5, Math.floor(input?.organisationLimit ?? 5)));

  // Query explicit opt-ins only. The model-call budget is independently bounded by
  // organisationLimit (<=5) and maxPromptsPerRun (<=3), so one cron can create at most 15 calls.
  const candidates = await prisma.organisation.findMany({
    where: {
      status: { notIn: ["suspended", "cancelled"] },
      settings: {
        path: ["aiVisibilityMonitoring", "enabled"],
        equals: true,
      },
      appInstallations: {
        some: { appId: "ai-visibility", enabled: true },
      },
    },
    select: { id: true, settings: true },
    orderBy: { updatedAt: "asc" },
    take: 50,
  });

  const due = candidates
    .map((org) => ({
      id: org.id,
      settings: normaliseSettings((org.settings as OrganisationSettings | null)?.aiVisibilityMonitoring),
    }))
    .filter((org) => isDue(org.settings, now))
    .slice(0, organisationLimit);

  const results: Array<Record<string, unknown>> = [];
  let completed = 0;
  let failed = 0;

  for (const org of due) {
    // Claim the scheduled attempt before any model call. This prevents a failed provider
    // from being retried on every daily cron invocation and bounds spend/retry behaviour.
    const claimed: AiVisibilityRecurringMonitoringSettings = {
      ...org.settings,
      lastAttemptAt: now.toISOString(),
      lastRunStatus: null,
      lastError: null,
    };
    await writeMonitoringSettings(org.id, claimed);

    try {
      const run = await runAiVisibilityModelObservations({
        organisationId: org.id,
        actorId: "scheduled:ai-visibility",
        maxPrompts: claimed.maxPromptsPerRun,
      });
      const successful: AiVisibilityRecurringMonitoringSettings = {
        ...claimed,
        lastCompletedAt: now.toISOString(),
        lastRunStatus: "success",
        lastError: null,
      };
      await writeMonitoringSettings(org.id, successful);
      completed += 1;
      results.push({
        organisationId: org.id,
        status: "success",
        observations: run.observations.length,
        remainingUnobserved: run.coverage.remainingUnobserved,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scheduled observation failed";
      const failedSettings: AiVisibilityRecurringMonitoringSettings = {
        ...claimed,
        lastRunStatus: "failed",
        lastError: message.slice(0, 300),
      };
      await writeMonitoringSettings(org.id, failedSettings);
      failed += 1;
      results.push({ organisationId: org.id, status: "failed", error: message.slice(0, 160) });
    }
  }

  return {
    checked: candidates.length,
    due: due.length,
    completed,
    failed,
    results,
  };
}
