import Link from "next/link";

import type {
  DeliveryDashboardMetrics,
  DeliveryProjectRecord,
  DeliveryTaskRecord,
} from "@dg/platform-core";
import { DELIVERY_PIPELINE_STAGES } from "@dg/platform-core";

function MetricCard({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const body = (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block transition hover:opacity-90">
        {body}
      </Link>
    );
  }
  return body;
}

export function DeliveryDashboardContent({
  metrics,
  projects,
  tasks,
  scope,
}: {
  metrics: DeliveryDashboardMetrics;
  projects: DeliveryProjectRecord[];
  tasks: DeliveryTaskRecord[];
  scope: "staff" | "partner";
}) {
  const projectBase = scope === "staff" ? "/command/delivery/projects" : "/partner/delivery/projects";
  const overdue = tasks.filter((t) => t.overdue);
  const dueToday = tasks.filter((t) => {
    if (!t.dueAt) return false;
    const due = new Date(t.dueAt);
    const now = new Date();
    return (
      due.getFullYear() === now.getFullYear() &&
      due.getMonth() === now.getMonth() &&
      due.getDate() === now.getDate()
    );
  });

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-base font-semibold text-white">Delivery overview</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Active implementations" value={metrics.activeImplementations} href={`${projectBase}`} />
          <MetricCard label="On track" value={metrics.onTrack} />
          <MetricCard label="At risk" value={metrics.atRisk} href={`${projectBase}?health=at_risk`} />
          <MetricCard label="Blocked" value={metrics.blocked} href={`${projectBase}?health=blocked`} />
          <MetricCard label="Go-lives this month" value={metrics.goLivesThisMonth} />
          <MetricCard
            label="Avg implementation time"
            value={metrics.averageImplementationDays ? `${metrics.averageImplementationDays} days` : "—"}
          />
          <MetricCard label="Overdue tasks" value={metrics.overdueTasks} href={`/${scope === "staff" ? "command" : "partner"}/delivery/tasks`} />
          <MetricCard label="Awaiting customer info" value={metrics.customersAwaitingInformation} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-base font-semibold text-white">Today&apos;s work</h2>
          <div className="mt-4 space-y-3">
            <TaskGroup title="Tasks due today" tasks={dueToday} projectBase={projectBase} empty="Nothing due today." />
            <TaskGroup title="Overdue tasks" tasks={overdue} projectBase={projectBase} empty="No overdue tasks." tone="rose" />
          </div>
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Implementation pipeline</h2>
          <ol className="mt-4 max-h-80 space-y-1 overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-800/30 p-4 text-sm">
            {DELIVERY_PIPELINE_STAGES.map((stage, i) => {
              const count = projects.filter((p) => p.status === stage.id).length;
              return (
                <li key={stage.id} className="flex items-center gap-2 text-slate-300">
                  <span className="font-mono text-xs text-slate-500">{i + 1}</span>
                  <span className="flex-1">{stage.title}</span>
                  {count > 0 ? (
                    <span className="rounded-full bg-emerald-600/20 px-2 py-0.5 text-xs text-emerald-300">
                      {count}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white">Implementation projects</h2>
          <Link href={projectBase} className="text-sm text-emerald-400 hover:underline">
            View all →
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-400">
            No implementation projects yet. Projects are created automatically when a customer
            enters implementation.
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-700/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Health</th>
                  <th className="px-4 py-3">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {projects.slice(0, 8).map((project) => (
                  <tr key={project.id} className="hover:bg-slate-700/20">
                    <td className="px-4 py-3 font-medium text-white">
                      <Link href={`${projectBase}/${project.id}`} className="hover:underline">
                        {project.customerName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{project.referenceCode}</td>
                    <td className="px-4 py-3 text-slate-300">{project.statusLabel}</td>
                    <td className="px-4 py-3 capitalize text-slate-300">{project.health.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-slate-300">{project.progressPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function TaskGroup({
  title,
  tasks,
  projectBase,
  empty,
  tone = "slate",
}: {
  title: string;
  tasks: DeliveryTaskRecord[];
  projectBase: string;
  empty: string;
  tone?: "slate" | "rose";
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        tone === "rose" ? "border-rose-700/40 bg-rose-900/10" : "border-slate-700/60 bg-slate-800/40"
      }`}
    >
      <p className="text-sm font-medium text-white">{title}</p>
      {tasks.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {tasks.slice(0, 5).map((task) => (
            <li key={task.id} className="text-sm text-slate-300">
              <Link href={`${projectBase}/${task.projectId}`} className="hover:text-white">
                {task.title}
              </Link>
              <span className="text-slate-500"> · {task.customerName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
