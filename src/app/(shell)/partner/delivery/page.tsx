import { redirect } from "next/navigation";

import {
  canAccessDeliveryPartnerWorkspace,
  getPartnerByClerkUserId,
  isDeliveryManager,
  listDeliveryProjects,
  listDeliveryTasks,
  getDeliveryDashboardMetrics,
  type DeliveryDashboardMetrics,
} from "@dg/platform-core";

import { DeliveryDashboardContent } from "@/components/delivery/DeliveryDashboardContent";
import { DeliveryWorkspaceNav } from "@/components/delivery/DeliveryWorkspaceNav";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function PartnerDeliveryDashboardPage() {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  const partner = await getPartnerByClerkUserId(clerkUserId);
  if (!partner || !canAccessDeliveryPartnerWorkspace(partner)) {
    redirect("/partner/dashboard");
  }

  const managerView = isDeliveryManager(partner);

  let metrics: DeliveryDashboardMetrics = {
    activeImplementations: 0,
    onTrack: 0,
    atRisk: 0,
    blocked: 0,
    goLivesThisMonth: 0,
    averageImplementationDays: null,
    overdueTasks: 0,
    customersAwaitingInformation: 0,
    tasksDueToday: 0,
  };
  let projects: Awaited<ReturnType<typeof listDeliveryProjects>> = [];
  let tasks: Awaited<ReturnType<typeof listDeliveryTasks>> = [];

  try {
    [metrics, projects, tasks] = await Promise.all([
      getDeliveryDashboardMetrics({ partnerId: partner.id, managerView }),
      listDeliveryProjects({ partnerId: partner.id, managerView }),
      listDeliveryTasks({ partnerId: partner.id, managerView }),
    ]);
  } catch {
    /* not migrated */
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Delivery Workspace</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Delivery Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          {managerView
            ? "Delivery Manager view — all implementations and team workload."
            : "Your assigned implementations, tasks and milestones."}
        </p>
      </div>
      <DeliveryWorkspaceNav active="dashboard" scope="partner" />
      <DeliveryDashboardContent metrics={metrics} projects={projects} tasks={tasks} scope="partner" />
    </div>
  );
}
