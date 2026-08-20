import type { Prisma } from "@dg/database";

import { createOrganisationGoal } from "../org/goals";
import { updateOrganisationBusinessProfile } from "../org/onboarding-profile";
import { createTask, listTasks } from "../tasks";
import type { FoundingOnboardingAnswers, FoundingImplementationRecord } from "./types";

type OrgSettings = {
  foundingImplementation?: unknown;
  [key: string]: unknown;
};

const DEFAULT_CORE = ["CRM", "Contacts", "Opportunities", "Tasks", "Calendar"];

export function buildImplementationPlan(
  answers: FoundingOnboardingAnswers,
  organisationId: string,
  opportunityId?: string,
): FoundingImplementationRecord {
  const now = new Date().toISOString();
  const recommendedCore =
    answers.coreApps?.length ? answers.coreApps.slice(0, 8) : [...DEFAULT_CORE];
  const recommendedGrowth = answers.growthApps?.slice(0, 8) ?? [];
  const recommendedIndustry = answers.industryApps?.slice(0, 4) ?? [];
  const connectors: string[] = [];
  if (answers.connectGoogle) connectors.push("Google");
  if (answers.connectMeta) connectors.push("Meta");
  if (answers.connectMicrosoft) connectors.push("Microsoft 365");
  if (answers.connectXero) connectors.push("Xero");
  if (answers.connectWordpress) connectors.push("WordPress");
  if (answers.connectShopify) connectors.push("Shopify");
  if (answers.connectStripe) connectors.push("Stripe");
  if (answers.accounting && answers.accounting !== "None") {
    if (!connectors.includes(answers.accounting)) connectors.push(answers.accounting);
  }

  const priorities = (
    answers.appPriorities?.length
      ? answers.appPriorities
      : answers.outcomes?.length
        ? answers.outcomes
        : [
            "Centralise customer information",
            "Improve follow-up",
            "Connect website and key systems",
          ]
  ).slice(0, 3);

  const apps = [
    ...recommendedCore,
    ...recommendedGrowth,
    ...recommendedIndustry,
    ...(answers.infraApps ?? []),
  ].slice(0, 24);

  const risks: string[] = [];
  if (answers.migrateContacts === "yes") risks.push("Contact migration required");
  if ((answers.migrateEntities?.length ?? 0) > 0) risks.push("Historical data import");
  if (answers.contactVolume === "10000_plus" || answers.contactVolume === "2000_10000") {
    risks.push("Large contact volume");
  }

  return {
    version: 1,
    customerOrganisationId: organisationId,
    opportunityId,
    startDate: now.slice(0, 10),
    targetGoLive: answers.goLiveDate,
    apps,
    connectors,
    migration: answers.migrateEntities ?? [],
    goals: answers.outcomes ?? [],
    successMetrics: answers.success90Days ? [answers.success90Days] : [],
    risks,
    priorities,
    recommendedCore,
    recommendedGrowth,
    recommendedIndustry,
    status: "received",
    submittedAt: now,
    updatedAt: now,
  };
}

function parseImplementation(value: unknown): FoundingImplementationRecord | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.customerOrganisationId !== "string") return null;
  const status = raw.status;
  const allowed = [
    "received",
    "in_progress",
    "configuration",
    "go_live_pending",
    "live",
    "review",
  ] as const;
  return {
    version: 1,
    customerOrganisationId: raw.customerOrganisationId,
    opportunityId: typeof raw.opportunityId === "string" ? raw.opportunityId : undefined,
    ownerUserId: typeof raw.ownerUserId === "string" ? raw.ownerUserId : undefined,
    startDate: typeof raw.startDate === "string" ? raw.startDate : new Date().toISOString().slice(0, 10),
    targetGoLive: typeof raw.targetGoLive === "string" ? raw.targetGoLive : undefined,
    apps: Array.isArray(raw.apps) ? raw.apps.map(String) : [],
    connectors: Array.isArray(raw.connectors) ? raw.connectors.map(String) : [],
    migration: Array.isArray(raw.migration) ? raw.migration.map(String) : [],
    goals: Array.isArray(raw.goals) ? raw.goals.map(String) : [],
    successMetrics: Array.isArray(raw.successMetrics) ? raw.successMetrics.map(String) : [],
    risks: Array.isArray(raw.risks) ? raw.risks.map(String) : [],
    priorities: Array.isArray(raw.priorities) ? raw.priorities.map(String) : [],
    recommendedCore: Array.isArray(raw.recommendedCore) ? raw.recommendedCore.map(String) : [],
    recommendedGrowth: Array.isArray(raw.recommendedGrowth)
      ? raw.recommendedGrowth.map(String)
      : [],
    recommendedIndustry: Array.isArray(raw.recommendedIndustry)
      ? raw.recommendedIndustry.map(String)
      : [],
    analysis: typeof raw.analysis === "string" ? raw.analysis : undefined,
    firstAutomation: typeof raw.firstAutomation === "string" ? raw.firstAutomation : undefined,
    analysisSource:
      raw.analysisSource === "llm" || raw.analysisSource === "rules"
        ? raw.analysisSource
        : undefined,
    analysisProvider: typeof raw.analysisProvider === "string" ? raw.analysisProvider : undefined,
    analysisModel: typeof raw.analysisModel === "string" ? raw.analysisModel : undefined,
    status: allowed.includes(status as (typeof allowed)[number])
      ? (status as FoundingImplementationRecord["status"])
      : "received",
    submittedAt: typeof raw.submittedAt === "string" ? raw.submittedAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
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

export async function getFoundingImplementation(
  organisationId: string,
): Promise<FoundingImplementationRecord | null> {
  if (!process.env.DATABASE_URL) return null;
  const { settings } = await readSettings(organisationId);
  return parseImplementation(settings.foundingImplementation);
}

export async function saveFoundingImplementation(
  organisationId: string,
  record: FoundingImplementationRecord,
): Promise<FoundingImplementationRecord> {
  const { prisma, settings } = await readSettings(organisationId);
  const next = { ...record, updatedAt: new Date().toISOString() };
  await prisma.organisation.update({
    where: { id: organisationId },
    data: {
      settings: {
        ...settings,
        foundingImplementation: next,
      } as unknown as Prisma.InputJsonValue,
    },
  });
  return next;
}

const IMPLEMENTATION_TASKS: Array<{ title: string; days: number; priority: string }> = [
  { title: "Configure organisation", days: 1, priority: "high" },
  { title: "Invite users", days: 2, priority: "high" },
  { title: "Connect WordPress", days: 7, priority: "medium" },
  { title: "Connect Google Business Profile", days: 7, priority: "medium" },
  { title: "Import contacts", days: 10, priority: "high" },
  { title: "Configure CRM", days: 8, priority: "high" },
  { title: "Configure selected Industry App", days: 12, priority: "medium" },
  { title: "Configure AI Visibility", days: 14, priority: "medium" },
  { title: "Create first automation", days: 21, priority: "medium" },
  { title: "Test workflows", days: 24, priority: "medium" },
  { title: "Customer training", days: 26, priority: "medium" },
  { title: "Go-live", days: 28, priority: "high" },
];

const SUCCESS_JOURNEY: Array<{ title: string; days: number; description: string }> = [
  {
    title: "Day 0 — Welcome / onboarding",
    days: 0,
    description: "Onboarding submitted. Implementation plan created.",
  },
  {
    title: "Day 7 — Foundation review",
    days: 7,
    description: "Is everything connected? Organisation, users, Core.",
  },
  {
    title: "Day 14 — First value review",
    days: 14,
    description: "Has the customer started using DigitalGate?",
  },
  {
    title: "Day 21 — Optimisation review",
    days: 21,
    description: "What should be automated or improved?",
  },
  {
    title: "Day 30 — Founding Customer review",
    days: 30,
    description:
      "Usage, goals, outcomes, problems, feature requests, app opportunities, referral.",
  },
];

function dueFrom(days: number): Date {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

async function ensureTask(input: {
  organisationId: string;
  actorId?: string;
  title: string;
  description: string;
  dueAt: Date;
  priority: string;
  entityType?: string;
  entityId?: string;
}) {
  const existing = await listTasks({
    organisationId: input.organisationId,
    entityType: input.entityType,
    entityId: input.entityId,
    limit: 50,
  });
  if (existing.items.some((task) => task.title === input.title && task.status !== "cancelled")) {
    return;
  }
  await createTask({
    organisationId: input.organisationId,
    actorId: input.actorId,
    title: input.title,
    description: input.description,
    dueAt: input.dueAt,
    priority: input.priority,
    sourceApp: "founding",
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: { founding: true },
  });
}

export async function createFoundingImplementationWork(input: {
  organisationId: string;
  actorId?: string;
  opportunityId?: string;
  plan: FoundingImplementationRecord;
}): Promise<void> {
  const { prisma } = await import("@dg/database");
  const { ensureDeliveryProjectForCustomer } = await import("../delivery/projects");

  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { name: true },
  });

  const planId =
    input.plan.migration.length > 2 || input.plan.apps.length > 8
      ? "growth"
      : input.plan.risks.some((r) => /complex|large|custom/i.test(r))
        ? "enterprise"
        : "launch";

  await ensureDeliveryProjectForCustomer({
    customerOrganisationId: input.organisationId,
    customerName: org?.name ?? "Customer",
    plan: planId as "launch" | "growth" | "enterprise",
    apps: input.plan.apps,
    opportunityId: input.opportunityId,
    targetGoLiveAt: input.plan.targetGoLive ? new Date(input.plan.targetGoLive) : undefined,
  }).catch(() => null);

  for (const task of IMPLEMENTATION_TASKS) {
    if (task.title === "Connect WordPress" && !input.plan.connectors.includes("WordPress")) {
      continue;
    }
    if (
      task.title === "Connect Google Business Profile" &&
      !input.plan.connectors.some((item) => /google/i.test(item))
    ) {
      continue;
    }
    if (task.title === "Import contacts" && input.plan.migration.length === 0) {
      continue;
    }
    await ensureTask({
      organisationId: input.organisationId,
      actorId: input.actorId,
      title: task.title,
      description: `Founding implementation · ${task.title}`,
      dueAt: dueFrom(task.days),
      priority: task.priority,
      entityType: input.opportunityId ? "Opportunity" : "Organisation",
      entityId: input.opportunityId ?? input.organisationId,
    });
  }

  for (const review of SUCCESS_JOURNEY) {
    await ensureTask({
      organisationId: input.organisationId,
      actorId: input.actorId,
      title: review.title,
      description: review.description,
      dueAt: dueFrom(review.days),
      priority: review.days === 30 || review.days === 0 ? "high" : "medium",
      entityType: input.opportunityId ? "Opportunity" : "Organisation",
      entityId: input.opportunityId ?? input.organisationId,
    });
  }
}

export async function applyOnboardingToProfileAndGoals(input: {
  organisationId: string;
  answers: FoundingOnboardingAnswers;
}): Promise<void> {
  await updateOrganisationBusinessProfile(input.organisationId, {
    businessName: input.answers.legalName,
    tradingName: input.answers.tradingName,
    abn: input.answers.abn,
    websiteUrl: input.answers.website,
    industryVertical: input.answers.industry,
    contactName: input.answers.primaryContactName,
    contactEmail: input.answers.primaryContactEmail,
    contactPhone: input.answers.primaryContactPhone,
    brandVoice: {
      services: input.answers.description,
      targetAudience: input.answers.serve,
    },
    social: {
      googleBusiness: input.answers.googleBusiness,
      facebook: input.answers.facebook,
      instagram: input.answers.instagram,
      linkedin: input.answers.linkedin,
      youtube: input.answers.youtube,
    },
  });

  const existingGoals = await import("../org/goals").then((mod) =>
    mod.getOrganisationGoals(input.organisationId),
  );
  const outcomes = (input.answers.outcomes ?? []).slice(0, 3);
  for (const outcome of outcomes) {
    if (existingGoals.some((goal) => goal.title === outcome)) continue;
    await createOrganisationGoal(input.organisationId, {
      title: outcome,
      description: input.answers.success90Days,
      metric: "custom",
      target: 1,
      current: 0,
      horizon: "quarter",
    });
  }
}
