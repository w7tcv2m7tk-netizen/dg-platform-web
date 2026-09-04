import Link from "next/link";
import {
  getOperatorDeliveryDashboard,
  type DeliveryDashboardMetrics,
} from "@dg/platform-core";

import { DeliveryCommandPage } from "@/components/delivery/DeliveryCommandPage";
import { DeliveryDashboardContent } from "@/components/delivery/DeliveryDashboardContent";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

export default async function StaffDeliveryDashboardPage() {
  const operator = await requirePlatformOperatorContext();

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
  let projects: Awaited<ReturnType<typeof getOperatorDeliveryDashboard>>["projects"] = [];
  let tasks: Awaited<ReturnType<typeof getOperatorDeliveryDashboard>>["tasks"] = [];

  try {
    ({ metrics, projects, tasks } = await getOperatorDeliveryDashboard(operator));
  } catch {
    /* tables not migrated yet */
  }

  return (
    <DeliveryCommandPage
      title="Delivery"
      description={
        <>
          <p className="text-base text-slate-200">
            Implementation ops — onboarding, projects, training and go-live.
          </p>
          <p className="mt-2">
            DigitalGate wins the customer. Delivery makes the customer successful —
            implementation, training and approved Support &amp; Success. Partner types live under
            Partners → Delivery Partners.
          </p>
        </>
      }
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
          <Link
            href="/command/partners/delivery"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
          >
            Delivery Partners roster →
          </Link>
        </div>
      }
    >
      <DeliveryDashboardContent metrics={metrics} projects={projects} tasks={tasks} scope="staff" />
    </DeliveryCommandPage>
  );
}
