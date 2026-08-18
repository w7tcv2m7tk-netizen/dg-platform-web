import type { Prisma } from "@dg/database";

import {
  FOUNDING_ONBOARDING_STEPS,
  type FoundingOnboardingAnswers,
  type FoundingOnboardingRecord,
  type FoundingOnboardingStep,
  type FoundingTeamMember,
} from "./types";

type OrgSettings = {
  foundingOnboarding?: unknown;
  [key: string]: unknown;
};

function isStep(value: unknown): value is FoundingOnboardingStep {
  return (
    typeof value === "string" &&
    (FOUNDING_ONBOARDING_STEPS as readonly string[]).includes(value)
  );
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 4000) : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 40);
  return items.length ? items : undefined;
}

function asTeam(value: unknown): FoundingTeamMember[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const members: FoundingTeamMember[] = [];
  for (const raw of value.slice(0, 40)) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const name = asString(row.name);
    if (!name) continue;
    const access =
      row.access === "admin" || row.access === "restricted" ? row.access : "member";
    members.push({
      name,
      email: asString(row.email) || "",
      role: asString(row.role) || "",
      department: asString(row.department),
      responsibilities: asString(row.responsibilities),
      access,
    });
  }
  return members.length ? members : undefined;
}

function parseAnswers(value: unknown): FoundingOnboardingAnswers {
  if (!value || typeof value !== "object") return {};
  const raw = value as Record<string, unknown>;
  const migrate =
    raw.migrateContacts === "yes" ||
    raw.migrateContacts === "no" ||
    raw.migrateContacts === "unsure"
      ? raw.migrateContacts
      : undefined;
  return {
    legalName: asString(raw.legalName),
    tradingName: asString(raw.tradingName),
    abn: asString(raw.abn),
    website: asString(raw.website),
    industry: asString(raw.industry),
    businessType: asString(raw.businessType),
    employeeCount: asString(raw.employeeCount),
    locations: asString(raw.locations),
    primaryContactName: asString(raw.primaryContactName),
    primaryContactEmail: asString(raw.primaryContactEmail),
    primaryContactPhone: asString(raw.primaryContactPhone),
    decisionMaker: asString(raw.decisionMaker),
    description: asString(raw.description),
    serve: asString(raw.serve),
    objective: asString(raw.objective),
    team: asTeam(raw.team),
    contactSource: asString(raw.contactSource),
    contactVolume: asString(raw.contactVolume),
    migrateContacts: migrate,
    websitePlatform: asString(raw.websitePlatform),
    crmSystem: asString(raw.crmSystem),
    accounting: asString(raw.accounting),
    communication: asStringArray(raw.communication),
    marketing: asStringArray(raw.marketing),
    bookings: asString(raw.bookings),
    analytics: asStringArray(raw.analytics),
    otherSystems: asString(raw.otherSystems),
    googleBusiness: asString(raw.googleBusiness),
    facebook: asString(raw.facebook),
    instagram: asString(raw.instagram),
    linkedin: asString(raw.linkedin),
    youtube: asString(raw.youtube),
    directories: asString(raw.directories),
    otherProfiles: asString(raw.otherProfiles),
    coreApps: asStringArray(raw.coreApps),
    infraApps: asStringArray(raw.infraApps),
    industryApps: asStringArray(raw.industryApps),
    growthApps: asStringArray(raw.growthApps),
    appPriorities: asStringArray(raw.appPriorities),
    outcomes: asStringArray(raw.outcomes),
    success90Days: asString(raw.success90Days),
    processes: asStringArray(raw.processes),
    manualProcesses: asString(raw.manualProcesses),
    aiHelp: asStringArray(raw.aiHelp),
    repetitiveTasks: asString(raw.repetitiveTasks),
    migrateEntities: asStringArray(raw.migrateEntities),
    dataLocation: asString(raw.dataLocation),
    migrationNotes: asString(raw.migrationNotes),
    connectGoogle: raw.connectGoogle === true,
    connectMeta: raw.connectMeta === true,
    connectMicrosoft: raw.connectMicrosoft === true,
    connectXero: raw.connectXero === true,
    connectWordpress: raw.connectWordpress === true,
    connectShopify: raw.connectShopify === true,
    connectStripe: raw.connectStripe === true,
    otherIntegrations: asString(raw.otherIntegrations),
    goLiveDate: asString(raw.goLiveDate),
    notes: asString(raw.notes),
  };
}

export function parseFoundingOnboarding(value: unknown): FoundingOnboardingRecord | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const completed = Array.isArray(raw.completedSteps)
    ? raw.completedSteps.filter(isStep)
    : [];
  const current = isStep(raw.currentStep) ? raw.currentStep : "business_profile";
  return {
    version: 1,
    inviteToken: asString(raw.inviteToken),
    opportunityId: asString(raw.opportunityId),
    pipelineOrganisationId: asString(raw.pipelineOrganisationId),
    currentStep: current,
    completedSteps: completed,
    answers: parseAnswers(raw.answers),
    agreementSignedAt: asString(raw.agreementSignedAt),
    startedAt: asString(raw.startedAt),
    submittedAt: asString(raw.submittedAt),
    updatedAt: asString(raw.updatedAt) || new Date().toISOString(),
  };
}

function emptyRecord(): FoundingOnboardingRecord {
  const now = new Date().toISOString();
  return {
    version: 1,
    currentStep: "business_profile",
    completedSteps: [],
    answers: {},
    updatedAt: now,
  };
}

async function readSettings(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  return {
    prisma,
    settings: ((org?.settings as OrgSettings | null) ?? {}) as OrgSettings,
  };
}

export async function getFoundingOnboarding(
  organisationId: string,
): Promise<FoundingOnboardingRecord | null> {
  if (!process.env.DATABASE_URL) return null;
  const { settings } = await readSettings(organisationId);
  return parseFoundingOnboarding(settings.foundingOnboarding);
}

export async function saveFoundingOnboarding(
  organisationId: string,
  patch: {
    inviteToken?: string;
    opportunityId?: string;
    pipelineOrganisationId?: string;
    currentStep?: FoundingOnboardingStep;
    completedSteps?: FoundingOnboardingStep[];
    answers?: FoundingOnboardingAnswers;
    agreementSignedAt?: string;
    startedAt?: string;
    submittedAt?: string;
  },
): Promise<FoundingOnboardingRecord> {
  const { prisma, settings } = await readSettings(organisationId);
  const existing = parseFoundingOnboarding(settings.foundingOnboarding) ?? emptyRecord();
  const next: FoundingOnboardingRecord = {
    ...existing,
    inviteToken: patch.inviteToken ?? existing.inviteToken,
    opportunityId: patch.opportunityId ?? existing.opportunityId,
    pipelineOrganisationId: patch.pipelineOrganisationId ?? existing.pipelineOrganisationId,
    currentStep: patch.currentStep ?? existing.currentStep,
    completedSteps: patch.completedSteps ?? existing.completedSteps,
    answers: { ...existing.answers, ...(patch.answers ?? {}) },
    agreementSignedAt: patch.agreementSignedAt ?? existing.agreementSignedAt,
    startedAt: patch.startedAt ?? existing.startedAt ?? new Date().toISOString(),
    submittedAt: patch.submittedAt ?? existing.submittedAt,
    updatedAt: new Date().toISOString(),
  };

  await prisma.organisation.update({
    where: { id: organisationId },
    data: {
      settings: {
        ...settings,
        foundingOnboarding: next,
      } as unknown as Prisma.InputJsonValue,
    },
  });
  return next;
}

export function markStepComplete(
  record: FoundingOnboardingRecord,
  step: FoundingOnboardingStep,
): FoundingOnboardingRecord {
  const completed = record.completedSteps.includes(step)
    ? record.completedSteps
    : [...record.completedSteps, step];
  const index = FOUNDING_ONBOARDING_STEPS.indexOf(step);
  const nextStep =
    FOUNDING_ONBOARDING_STEPS[Math.min(index + 1, FOUNDING_ONBOARDING_STEPS.length - 1)] ??
    step;
  return {
    ...record,
    completedSteps: completed,
    currentStep: nextStep,
    updatedAt: new Date().toISOString(),
  };
}

export function foundingOnboardingProgress(record: FoundingOnboardingRecord | null): {
  completed: number;
  total: number;
  percent: number;
} {
  const total = FOUNDING_ONBOARDING_STEPS.length;
  const completed = record?.completedSteps.length ?? 0;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}
