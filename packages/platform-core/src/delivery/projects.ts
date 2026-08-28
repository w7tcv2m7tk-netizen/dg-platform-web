import { prisma } from "@dg/database";

import {
  DELIVERY_PROGRESS_MILESTONES,
  IMPLEMENTATION_PLAN_LABELS,
  type ImplementationPlan,
} from "../partners/delivery-workspace";
import {
  DELIVERY_PIPELINE_STAGES,
  IMPLEMENTATION_SOP_STAGES,
} from "../partners/delivery-model";
import type {
  CreateDeliveryProjectInput,
  DeliveryBlockerRecord,
  DeliveryMilestoneRecord,
  DeliveryProjectDetail,
  DeliveryProjectRecord,
  DeliveryTaskRecord,
} from "./types";

function stageLabel(stageId: string): string {
  const stage = IMPLEMENTATION_SOP_STAGES.find((s) => s.id === stageId);
  if (stage) return `${stage.n} ${stage.title}`;
  return (
    DELIVERY_PIPELINE_STAGES.find((s) => s.id === stageId)?.title ??
    stageId.replace(/_/g, " ")
  );
}

function parseApps(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String);
}

function computeProgress(milestones: DeliveryMilestoneRecord[]): number {
  if (!milestones.length) return 0;
  const complete = milestones.filter((m) => m.status === "complete").length;
  return Math.round((complete / milestones.length) * 100);
}

async function nextReferenceCode(): Promise<string> {
  const count = await prisma.deliveryProject.count();
  return `DG-${String(count + 1).padStart(5, "0")}`;
}

function mapMilestone(row: {
  id: string;
  projectId: string;
  stageId: string;
  title: string;
  sortOrder: number;
  status: string;
  completedAt: Date | null;
}): DeliveryMilestoneRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    stageId: row.stageId,
    title: row.title,
    sortOrder: row.sortOrder,
    status: row.status as DeliveryMilestoneRecord["status"],
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

function mapTask(
  row: {
    id: string;
    projectId: string;
    title: string;
    description: string | null;
    status: string;
    dueAt: Date | null;
    assigneePartnerId: string | null;
    assigneePartner?: { displayName: string | null } | null;
  },
  project?: { referenceCode: string; customerOrganisation?: { name: string } | null },
): DeliveryTaskRecord {
  const now = Date.now();
  const due = row.dueAt?.getTime();
  return {
    id: row.id,
    projectId: row.projectId,
    projectReference: project?.referenceCode ?? "",
    customerName: project?.customerOrganisation?.name ?? "",
    title: row.title,
    description: row.description,
    status: row.status as DeliveryTaskRecord["status"],
    dueAt: row.dueAt?.toISOString() ?? null,
    assigneePartnerId: row.assigneePartnerId,
    assigneeName: row.assigneePartner?.displayName ?? null,
    overdue: Boolean(due && due < now && row.status !== "complete" && row.status !== "cancelled"),
  };
}

function mapProject(row: {
  id: string;
  referenceCode: string;
  customerOrganisationId: string;
  customerOrganisation: { name: string };
  status: string;
  health: string;
  plan: string;
  ownerPartnerId: string | null;
  ownerPartner?: { displayName: string | null } | null;
  deliveryLeadPartnerId: string | null;
  deliveryLeadPartner?: { displayName: string | null } | null;
  targetGoLiveAt: Date | null;
  apps: unknown;
  nextAction: string | null;
  nextActionDueAt: Date | null;
  opportunityId: string | null;
  createdAt: Date;
  updatedAt: Date;
  milestones?: Array<{
    id: string;
    projectId: string;
    stageId: string;
    title: string;
    sortOrder: number;
    status: string;
    completedAt: Date | null;
  }>;
}): DeliveryProjectRecord {
  const milestones = (row.milestones ?? []).map(mapMilestone);
  const plan = row.plan as ImplementationPlan;
  return {
    id: row.id,
    referenceCode: row.referenceCode,
    customerOrganisationId: row.customerOrganisationId,
    customerName: row.customerOrganisation.name,
    status: row.status,
    statusLabel: stageLabel(row.status),
    health: row.health as DeliveryProjectRecord["health"],
    plan,
    planLabel: IMPLEMENTATION_PLAN_LABELS[plan] ?? row.plan,
    ownerPartnerId: row.ownerPartnerId,
    ownerName: row.ownerPartner?.displayName ?? null,
    deliveryLeadPartnerId: row.deliveryLeadPartnerId,
    deliveryLeadName: row.deliveryLeadPartner?.displayName ?? null,
    targetGoLiveAt: row.targetGoLiveAt?.toISOString() ?? null,
    apps: parseApps(row.apps),
    nextAction: row.nextAction,
    nextActionDueAt: row.nextActionDueAt?.toISOString() ?? null,
    opportunityId: row.opportunityId,
    progressPercent: computeProgress(milestones),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const DEFAULT_TASKS = [
  { title: "Schedule kick-off call", days: 1 },
  { title: "Complete discovery questionnaire", days: 3 },
  { title: "Configure business profile and team", days: 5 },
  { title: "Connect core integrations", days: 10 },
  { title: "Configure CRM pipeline", days: 14 },
  { title: "Set up Business Brain knowledge", days: 18 },
  { title: "Run QA checklist", days: 24 },
  { title: "Deliver staff training", days: 26 },
  { title: "Go-live readiness review", days: 28 },
];

function dueFrom(base: Date, days: number): Date {
  const date = new Date(base);
  date.setHours(17, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

export async function createDeliveryProject(
  input: CreateDeliveryProjectInput,
): Promise<DeliveryProjectDetail> {
  const referenceCode = await nextReferenceCode();
  const plan = input.plan ?? "launch";
  const now = new Date();

  const project = await prisma.deliveryProject.create({
    data: {
      referenceCode,
      customerOrganisationId: input.customerOrganisationId,
      status: "accepted",
      health: "on_track",
      plan,
      deliveryLeadPartnerId: input.deliveryLeadPartnerId,
      ownerPartnerId: input.ownerPartnerId ?? input.deliveryLeadPartnerId,
      targetGoLiveAt: input.targetGoLiveAt,
      apps: input.apps ?? [],
      opportunityId: input.opportunityId,
      nextAction: "Schedule kick-off with customer",
      nextActionDueAt: dueFrom(now, 2),
      milestones: {
        create: DELIVERY_PROGRESS_MILESTONES.map((m, i) => ({
          stageId: m.id,
          title: m.title,
          sortOrder: i,
          status: m.id === "accepted" ? "in_progress" : "pending",
        })),
      },
      tasks: {
        create: DEFAULT_TASKS.map((task, i) => ({
          title: task.title,
          description: `${input.customerName} · ${task.title}`,
          dueAt: dueFrom(now, task.days),
          sortOrder: i,
          assigneePartnerId: input.ownerPartnerId ?? input.deliveryLeadPartnerId,
        })),
      },
    },
    include: {
      customerOrganisation: { select: { name: true } },
      ownerPartner: { select: { displayName: true } },
      deliveryLeadPartner: { select: { displayName: true } },
      milestones: { orderBy: { sortOrder: "asc" } },
      tasks: {
        orderBy: { sortOrder: "asc" },
        include: { assigneePartner: { select: { displayName: true } } },
      },
      blockers: { where: { status: "open" }, orderBy: { createdAt: "desc" } },
    },
  });

  return mapProjectDetail(project);
}

function mapBlocker(row: {
  id: string;
  projectId: string;
  description: string;
  status: string;
  createdAt: Date;
}): DeliveryBlockerRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    description: row.description,
    status: row.status as DeliveryBlockerRecord["status"],
    createdAt: row.createdAt.toISOString(),
  };
}

function mapProjectDetail(project: {
  id: string;
  referenceCode: string;
  customerOrganisationId: string;
  customerOrganisation: { name: string };
  status: string;
  health: string;
  plan: string;
  ownerPartnerId: string | null;
  ownerPartner?: { displayName: string | null } | null;
  deliveryLeadPartnerId: string | null;
  deliveryLeadPartner?: { displayName: string | null } | null;
  targetGoLiveAt: Date | null;
  apps: unknown;
  nextAction: string | null;
  nextActionDueAt: Date | null;
  opportunityId: string | null;
  createdAt: Date;
  updatedAt: Date;
  milestones: Array<{
    id: string;
    projectId: string;
    stageId: string;
    title: string;
    sortOrder: number;
    status: string;
    completedAt: Date | null;
  }>;
  tasks: Array<{
    id: string;
    projectId: string;
    title: string;
    description: string | null;
    status: string;
    dueAt: Date | null;
    assigneePartnerId: string | null;
    assigneePartner?: { displayName: string | null } | null;
  }>;
  blockers: Array<{
    id: string;
    projectId: string;
    description: string;
    status: string;
    createdAt: Date;
  }>;
}): DeliveryProjectDetail {
  const base = mapProject(project);
  return {
    ...base,
    milestones: project.milestones.map(mapMilestone),
    tasks: project.tasks.map((t) =>
      mapTask(t, {
        referenceCode: project.referenceCode,
        customerOrganisation: project.customerOrganisation,
      }),
    ),
    blockers: project.blockers.map(mapBlocker),
  };
}

const projectInclude = {
  customerOrganisation: { select: { name: true } },
  ownerPartner: { select: { displayName: true } },
  deliveryLeadPartner: { select: { displayName: true } },
  milestones: { orderBy: { sortOrder: "asc" as const } },
};

export async function getDeliveryProject(id: string): Promise<DeliveryProjectDetail | null> {
  const project = await prisma.deliveryProject.findUnique({
    where: { id },
    include: {
      ...projectInclude,
      tasks: {
        orderBy: { sortOrder: "asc" },
        include: { assigneePartner: { select: { displayName: true } } },
      },
      blockers: { where: { status: "open" }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return null;
  return mapProjectDetail(project);
}

export async function getDeliveryProjectForCustomer(
  customerOrganisationId: string,
): Promise<DeliveryProjectDetail | null> {
  const project = await prisma.deliveryProject.findFirst({
    where: { customerOrganisationId },
    orderBy: { createdAt: "desc" },
    include: {
      ...projectInclude,
      tasks: {
        orderBy: { sortOrder: "asc" },
        include: { assigneePartner: { select: { displayName: true } } },
      },
      blockers: { where: { status: "open" }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return null;
  return mapProjectDetail(project);
}

export async function listDeliveryProjects(input?: {
  partnerId?: string;
  managerView?: boolean;
  limit?: number;
}): Promise<DeliveryProjectRecord[]> {
  const limit = input?.limit ?? 50;
  const where =
    input?.managerView || !input?.partnerId
      ? {}
      : {
          OR: [
            { ownerPartnerId: input.partnerId },
            { deliveryLeadPartnerId: input.partnerId },
            { tasks: { some: { assigneePartnerId: input.partnerId } } },
          ],
        };

  const rows = await prisma.deliveryProject.findMany({
    where,
    take: limit,
    orderBy: { updatedAt: "desc" },
    include: projectInclude,
  });

  return rows.map(mapProject);
}

export async function ensureDeliveryProjectForCustomer(
  input: CreateDeliveryProjectInput,
): Promise<DeliveryProjectDetail | null> {
  if (!process.env.DATABASE_URL) return null;
  const existing = await prisma.deliveryProject.findFirst({
    where: { customerOrganisationId: input.customerOrganisationId },
    select: { id: true },
  });
  if (existing) {
    return getDeliveryProject(existing.id);
  }
  return createDeliveryProject(input);
}
