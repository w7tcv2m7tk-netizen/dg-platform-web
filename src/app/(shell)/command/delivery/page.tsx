import Link from "next/link";
import { redirect } from "next/navigation";

import { DeliveryCommandPage } from "@/components/delivery/DeliveryCommandPage";
import { DeliveryDashboardContent } from "@/components/delivery/DeliveryDashboardContent";
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
    <DeliveryCommandPage
      title="Delivery Partners"
      description="Implementation projects, onboarding and go-live — the Delivery Partner division."
      navActive="dashboard"
      headerActions={
        <div className="flex flex-wrap gap-3">
          <Link
            href="/command/delivery/invitations"
            className="rounded-lg border border-emerald-600/50 bg-emerald-600/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-600/20"
          >
            Invite Delivery Partners →
          </Link>
          <Link
            href="/command/delivery/projects"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
          >
            Implementation projects
          </Link>
          <Link
            href="/command/delivery/plans"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
          >
            Implementation Lifecycle
          </Link>
        </div>
      }
    >
      <DeliveryDashboardContent metrics={metrics} projects={projects} tasks={tasks} scope="staff" />
    </DeliveryCommandPage>
  );
}
