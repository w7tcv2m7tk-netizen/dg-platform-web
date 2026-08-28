import Link from "next/link";

import type {
  DeliveryDashboardMetrics,
  DeliveryProjectRecord,
  DeliveryTaskRecord,
} from "@dg/platform-core";
import {
  CUSTOMER_SUCCESS_OPERATING,
  DELIVERY_CAPACITY_STATUSES,
  DELIVERY_PARTNER_ECONOMICS,
  DELIVERY_PARTNER_POSITIONING,
  DELIVERY_PARTNER_RESPONSIBILITIES,
  DELIVERY_PARTNER_ROLE_SPLIT,
  DELIVERY_PARTNER_WORKFLOW_STRIP,
  DELIVERY_PIPELINE_STAGES,
  DELIVERY_PROJECT_HEALTH,
  DIGITALGATE_RETAINS,
  IMPLEMENTATION_LIFECYCLE_NAME,
  IMPLEMENTATION_SOP_STAGES,
} from "@dg/platform-core";

function MetricCard({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: string | number;
  href?: string;
  tone?: "amber" | "rose";
}) {
  const valueClass =
    tone === "rose"
      ? "text-rose-300"
      : tone === "amber"
        ? "text-amber-300"
        : "text-white";
  const body = (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
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

function healthEmoji(health: string) {
  return DELIVERY_PROJECT_HEALTH.find((h) => h.id === health)?.emoji ?? "·";
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
  const projectBase =
    scope === "staff" ? "/command/delivery/projects" : "/partner/delivery/projects";
  const tasksHref =
    scope === "staff" ? "/command/delivery/tasks" : "/partner/delivery/tasks";
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
  const showDivisionIdentity = scope === "staff";

  return (
    <div className="space-y-10">
      {showDivisionIdentity ? (
        <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Delivery Partners
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            {DELIVERY_PARTNER_POSITIONING.headline}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            {DELIVERY_PARTNER_POSITIONING.body}
          </p>
          <p className="mt-3 text-sm font-medium text-emerald-200/90">
            {DELIVERY_PARTNER_POSITIONING.principle}
          </p>
        </section>
      ) : null}

      <section>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Delivery Pulse
        </p>
        <h2 className="mt-1 text-base font-semibold text-white">Channel at a glance</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            label="Active implementations"
            value={metrics.activeImplementations}
            href={projectBase}
          />
          <MetricCard label="On track" value={metrics.onTrack} />
          <MetricCard
            label="At risk"
            value={metrics.atRisk}
            href={`${projectBase}?health=at_risk`}
            tone={metrics.atRisk > 0 ? "amber" : undefined}
          />
          <MetricCard
            label="Blocked"
            value={metrics.blocked}
            href={`${projectBase}?health=blocked`}
            tone={metrics.blocked > 0 ? "rose" : undefined}
          />
          <MetricCard label="Go-lives this month" value={metrics.goLivesThisMonth} />
          <MetricCard
            label="Avg implementation time"
            value={
              metrics.averageImplementationDays
                ? `${metrics.averageImplementationDays} days`
                : "—"
            }
          />
          <MetricCard
            label="Overdue tasks"
            value={metrics.overdueTasks}
            href={tasksHref}
            tone={metrics.overdueTasks > 0 ? "rose" : undefined}
          />
          <MetricCard
            label="Awaiting customer info"
            value={metrics.customersAwaitingInformation}
          />
        </div>
      </section>

      {showDivisionIdentity ? (
        <>
          <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              How Delivery Partnering works
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-emerald-300/90">
              {DELIVERY_PARTNER_WORKFLOW_STRIP}
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {DELIVERY_PARTNER_ROLE_SPLIT.map((role) => (
                <article
                  key={role.title}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3"
                >
                  <h3 className="text-sm font-semibold text-white">{role.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{role.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              How Delivery Partners earn
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {DELIVERY_PARTNER_ECONOMICS.streams.map((stream) => (
                <article
                  key={stream.title}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3"
                >
                  <h3 className="text-sm font-semibold text-white">{stream.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{stream.body}</p>
                </article>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-300">{DELIVERY_PARTNER_ECONOMICS.intro}</p>
            <p className="mt-2 text-xs text-slate-500">
              Detailed rates and payment rules live under{" "}
              <Link href="/command/commissions" className="text-sky-400 hover:underline">
                {DELIVERY_PARTNER_ECONOMICS.detailHrefLabel}
              </Link>
              .
            </p>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Delivery Partner responsibilities
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
                {DELIVERY_PARTNER_RESPONSIBILITIES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                DigitalGate retains
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
                {DIGITALGATE_RETAINS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </section>

          <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Implementation Lifecycle
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  {IMPLEMENTATION_LIFECYCLE_NAME}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  15-stage implementation SOP. Customer Success follows as an operating layer.
                </p>
              </div>
              <Link
                href="/command/delivery/plans"
                className="text-xs text-sky-400 hover:underline shrink-0"
              >
                Open plans →
              </Link>
            </div>
            <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {IMPLEMENTATION_SOP_STAGES.map((stage) => (
                <li
                  key={stage.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                >
                  <p className="font-mono text-[11px] text-emerald-400">{stage.n}</p>
                  <p className="mt-0.5 text-sm font-medium text-white">{stage.title}</p>
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-lg border border-violet-700/30 bg-violet-900/10 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">
                {CUSTOMER_SUCCESS_OPERATING.title}
              </p>
              <p className="mt-2 text-sm text-slate-300">{CUSTOMER_SUCCESS_OPERATING.body}</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">
                {CUSTOMER_SUCCESS_OPERATING.activities.join(" → ")}
              </p>
            </div>
          </section>
        </>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-base font-semibold text-white">Today&apos;s work</h2>
          <div className="mt-4 space-y-3">
            <TaskGroup
              title="Tasks due today"
              tasks={dueToday}
              projectBase={projectBase}
              empty="Nothing due today."
            />
            <TaskGroup
              title="Overdue tasks"
              tasks={overdue}
              projectBase={projectBase}
              empty="No overdue tasks."
              tone="rose"
            />
          </div>
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Implementation pipeline</h2>
          <ol className="mt-4 max-h-80 space-y-1 overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-800/30 p-4 text-sm">
            {DELIVERY_PIPELINE_STAGES.map((stage, i) => {
              const count = projects.filter((p) => p.status === stage.id).length;
              const isCs = stage.id === CUSTOMER_SUCCESS_OPERATING.id;
              return (
                <li
                  key={stage.id}
                  className={`flex items-center gap-2 ${
                    isCs ? "mt-2 border-t border-slate-700/60 pt-2 text-violet-200" : "text-slate-300"
                  }`}
                >
                  <span className="font-mono text-xs text-slate-500">
                    {isCs ? "→" : i + 1}
                  </span>
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
                      <Link
                        href={`${projectBase}/${project.id}`}
                        className="hover:underline"
                      >
                        {project.customerName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {project.referenceCode}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{project.statusLabel}</td>
                    <td className="px-4 py-3 capitalize text-slate-300">
                      <span aria-hidden>{healthEmoji(project.health)} </span>
                      {project.health.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{project.progressPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showDivisionIdentity ? (
        <>
          <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Delivery capacity
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Partner capacity</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Once the Delivery network has volume, this surface shows whether partners can absorb
              new implementations — critical when Acquisition Partners generate pipeline faster than
              delivery can land customers.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {DELIVERY_CAPACITY_STATUSES.map((status) => (
                <div
                  key={status.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3"
                >
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    {status.label}
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-600">—</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Scaffold — capacity tracking lands with partner assignment and concurrent project
              limits.
            </p>
          </section>

          <p className="text-xs text-slate-500">
            Two-channel model: Acquisition Partners acquire customers · DigitalGate owns platform
            and customer relationship · Delivery Partners implement and create service revenue ·
            Customer operates on DigitalGate · Customer Success retains, grows and optimises the
            account.
          </p>
        </>
      ) : null}
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
        tone === "rose"
          ? "border-rose-700/40 bg-rose-900/10"
          : "border-slate-700/60 bg-slate-800/40"
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
