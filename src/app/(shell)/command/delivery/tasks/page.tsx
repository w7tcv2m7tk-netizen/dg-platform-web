import Link from "next/link";
import { redirect } from "next/navigation";

import { DeliveryWorkspaceNav } from "@/components/delivery/DeliveryWorkspaceNav";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import { listDeliveryTasks } from "@dg/platform-core";

export default async function StaffDeliveryTasksPage() {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  let tasks: Awaited<ReturnType<typeof listDeliveryTasks>> = [];
  try {
    tasks = await listDeliveryTasks({ managerView: true });
  } catch {
    /* not migrated */
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Delivery Tasks</h1>
        <p className="mt-1 text-sm text-slate-400">Open implementation tasks across all active projects.</p>
      </header>
      <DeliveryWorkspaceNav active="tasks" scope="staff" />
      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 px-6 py-14 text-center text-sm text-slate-400">
          No open tasks.
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`rounded-xl border px-4 py-3 text-sm ${
                task.overdue ? "border-rose-700/40 bg-rose-900/10" : "border-slate-700/60 bg-slate-800/40"
              }`}
            >
              <Link href={`/command/delivery/projects/${task.projectId}`} className="font-medium text-white hover:underline">
                {task.title}
              </Link>
              <p className="mt-1 text-slate-400">
                {task.customerName} · {task.projectReference}
                {task.dueAt ? ` · due ${new Date(task.dueAt).toLocaleDateString("en-AU")}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
