import { prisma } from "@dg/database";

import type { CommandCentreDeliveryAlert, DeliveryDashboardMetrics, DeliveryTaskRecord } from "./types";
import { listDeliveryProjects } from "./projects";

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function getDeliveryDashboardMetrics(input?: {
  partnerId?: string;
  managerView?: boolean;
}): Promise<DeliveryDashboardMetrics> {
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

  const [projects, overdueTasks, tasksDueToday, awaitingInfo] = await Promise.all([
    prisma.deliveryProject.findMany({
      where,
      select: {
        id: true,
        health: true,
        status: true,
        targetGoLiveAt: true,
        createdAt: true,
        blockers: { where: { status: "open" }, select: { id: true } },
      },
    }),
    prisma.deliveryTask.count({
      where: {
        status: { in: ["pending", "in_progress"] },
        dueAt: { lt: new Date() },
        project: where,
      },
    }),
    prisma.deliveryTask.count({
      where: {
        status: { in: ["pending", "in_progress"] },
        dueAt: { gte: startOfToday(), lte: endOfToday() },
        project: where,
      },
    }),
    prisma.deliveryBlocker.count({
      where: {
        status: "open",
        project: where,
      },
    }),
  ]);

  const monthStart = startOfMonth();
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const goLivesThisMonth = projects.filter(
    (p) =>
      p.targetGoLiveAt &&
      p.targetGoLiveAt >= monthStart &&
      p.targetGoLiveAt < monthEnd &&
      p.status !== "customer_success",
  ).length;

  const completed = projects.filter((p) => p.status === "customer_success");
  const averageImplementationDays =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, p) => {
            const days = Math.max(
              1,
              Math.round((Date.now() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
            );
            return sum + days;
          }, 0) / completed.length,
        )
      : null;

  return {
    activeImplementations: projects.filter((p) => p.status !== "customer_success").length,
    onTrack: projects.filter((p) => p.health === "on_track").length,
    atRisk: projects.filter((p) => p.health === "at_risk").length,
    blocked: projects.filter((p) => p.health === "blocked").length,
    goLivesThisMonth,
    averageImplementationDays,
    overdueTasks,
    customersAwaitingInformation: awaitingInfo,
    tasksDueToday,
  };
}

export async function listDeliveryTasks(input?: {
  partnerId?: string;
  managerView?: boolean;
  limit?: number;
}): Promise<DeliveryTaskRecord[]> {
  const limit = input?.limit ?? 100;
  const projectFilter =
    input?.managerView || !input?.partnerId
      ? {}
      : {
          OR: [
            { ownerPartnerId: input.partnerId },
            { deliveryLeadPartnerId: input.partnerId },
          ],
        };

  const rows = await prisma.deliveryTask.findMany({
    where: {
      status: { in: ["pending", "in_progress"] },
      ...(input?.partnerId && !input.managerView
        ? { assigneePartnerId: input.partnerId }
        : {}),
      project: projectFilter,
    },
    take: limit,
    orderBy: [{ dueAt: "asc" }, { sortOrder: "asc" }],
    include: {
      assigneePartner: { select: { displayName: true } },
      project: {
        select: {
          referenceCode: true,
          customerOrganisation: { select: { name: true } },
        },
      },
    },
  });

  const now = Date.now();
  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    projectReference: row.project.referenceCode,
    customerName: row.project.customerOrganisation.name,
    title: row.title,
    description: row.description,
    status: row.status as DeliveryTaskRecord["status"],
    dueAt: row.dueAt?.toISOString() ?? null,
    assigneePartnerId: row.assigneePartnerId,
    assigneeName: row.assigneePartner?.displayName ?? null,
    overdue: Boolean(
      row.dueAt &&
        row.dueAt.getTime() < now &&
        row.status !== "complete" &&
        row.status !== "cancelled",
    ),
  }));
}

export async function getCommandCentreDeliveryAlerts(): Promise<CommandCentreDeliveryAlert[]> {
  const [projects, overdueCount] = await Promise.all([
    listDeliveryProjects({ limit: 100 }),
    prisma.deliveryTask.count({
      where: {
        status: { in: ["pending", "in_progress"] },
        dueAt: { lt: new Date() },
      },
    }),
  ]);

  const alerts: CommandCentreDeliveryAlert[] = [];
  const atRisk = projects.filter((p) => p.health === "at_risk").length;
  const blocked = projects.filter((p) => p.health === "blocked").length;
  const goLiveSoon = projects.filter((p) => {
    if (!p.targetGoLiveAt) return false;
    const diff = new Date(p.targetGoLiveAt).getTime() - Date.now();
    return diff >= 0 && diff <= 14 * 24 * 60 * 60 * 1000;
  }).length;

  if (atRisk + blocked > 0) {
    alerts.push({
      id: "delivery-at-risk",
      severity: "critical",
      message: `${atRisk + blocked} implementation${atRisk + blocked === 1 ? "" : "s"} at risk`,
      href: "/command/delivery/projects?health=at_risk",
    });
  }

  if (overdueCount > 0) {
    alerts.push({
      id: "delivery-overdue-tasks",
      severity: "warning",
      message: `${overdueCount} onboarding task${overdueCount === 1 ? "" : "s"} overdue`,
      href: "/command/delivery/tasks",
    });
  }

  if (goLiveSoon > 0) {
    alerts.push({
      id: "delivery-go-live",
      severity: "success",
      message: `${goLiveSoon} customer${goLiveSoon === 1 ? "" : "s"} scheduled for go-live`,
      href: "/command/delivery/projects",
    });
  }

  for (const project of projects.filter((p) => p.health === "blocked").slice(0, 3)) {
    alerts.push({
      id: `delivery-blocked-${project.id}`,
      severity: "warning",
      message: `${project.customerName} — blocked implementation`,
      href: `/command/delivery/projects/${project.id}`,
    });
  }

  for (const project of projects.filter((p) => p.status === "business_brain").slice(0, 2)) {
    alerts.push({
      id: `delivery-brain-${project.id}`,
      severity: "info",
      message: `${project.customerName} ready for AI Business Brain configuration`,
      href: `/command/delivery/projects/${project.id}`,
    });
  }

  return alerts.slice(0, 8);
}
