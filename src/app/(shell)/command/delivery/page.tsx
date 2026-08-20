import { redirect } from "next/navigation";

import { DeliveryDashboardContent } from "@/components/delivery/DeliveryDashboardContent";
import { DeliveryWorkspaceNav } from "@/components/delivery/DeliveryWorkspaceNav";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import {
  getDeliveryDashboardMetrics,
  listDeliveryProjects,
  listDeliveryTasks,
  type DeliveryDashboardMetrics,
} from "@dg/platform-core";

export default async function StaffDeliveryDashboardPage() {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

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
      getDeliveryDashboardMetrics({ managerView: true }),
      listDeliveryProjects({ managerView: true }),
      listDeliveryTasks({ managerView: true }),
    ]);
  } catch {
    /* tables not migrated yet */
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Partners · Delivery</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Delivery Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Operational view — implementations, tasks, pipeline and go-live schedule. Feeds Command Centre
          alerts.
        </p>
      </header>
      <DeliveryWorkspaceNav active="dashboard" scope="staff" />
      <div className="flex flex-wrap gap-3">
        <a
          href="/command/delivery/invitations"
          className="rounded-lg border border-emerald-600/50 bg-emerald-600/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-600/20"
        >
          Invite Delivery Partners →
        </a>
        <a
          href="/command/delivery/projects"
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
        >
          Active projects
        </a>
        <a
          href="/command/delivery/onboarding"
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
        >
          Onboarding SOP
        </a>
      </div>
      <DeliveryDashboardContent metrics={metrics} projects={projects} tasks={tasks} scope="staff" />
    </div>
  );
}
