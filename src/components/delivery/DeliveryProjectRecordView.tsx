import Link from "next/link";

import type { DeliveryProjectDetail } from "@dg/platform-core";

const MILESTONE_ICON: Record<string, string> = {
  complete: "✅",
  in_progress: "🔄",
  pending: "🔲",
  skipped: "⬜",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function DeliveryProjectRecordView({
  project,
  scope,
}: {
  project: DeliveryProjectDetail;
  scope: "staff" | "partner" | "customer";
}) {
  const backHref =
    scope === "customer"
      ? "/dashboard"
      : scope === "staff"
        ? "/command/delivery/projects"
        : "/partner/delivery/projects";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {scope !== "customer" ? (
        <Link href={backHref} className="text-sm text-emerald-400 hover:underline">
          ← Back to projects
        </Link>
      ) : null}

      <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/10 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
          {scope === "customer" ? "Your DigitalGate Implementation" : "Implementation Record"}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">{project.customerName}</h1>
        {scope !== "customer" ? (
          <p className="mt-1 font-mono text-sm text-emerald-200">Implementation #{project.referenceCode}</p>
        ) : null}
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <p className="text-slate-300">
            <span className="text-slate-500">Status:</span> {project.statusLabel}
          </p>
          {scope !== "customer" && project.ownerName ? (
            <p className="text-slate-300">
              <span className="text-slate-500">Owner:</span> {project.ownerName}
            </p>
          ) : null}
          <p className="text-slate-300">
            <span className="text-slate-500">Plan:</span> {project.planLabel}
          </p>
          {project.apps.length > 0 ? (
            <p className="text-slate-300">
              <span className="text-slate-500">Apps:</span> {project.apps.join(" · ")}
            </p>
          ) : null}
          {project.targetGoLiveAt ? (
            <p className="text-slate-300">
              <span className="text-slate-500">Target Go-Live:</span> {formatDate(project.targetGoLiveAt)}
            </p>
          ) : null}
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Overall progress</span>
            <span className="font-semibold text-white">{project.progressPercent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${project.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-base font-semibold text-white">Progress</h2>
        <ul className="mt-4 space-y-2">
          {project.milestones.map((milestone) => (
            <li
              key={milestone.id}
              className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/30 px-4 py-2.5 text-sm"
            >
              <span>{MILESTONE_ICON[milestone.status] ?? "🔲"}</span>
              <span className="text-slate-200">{milestone.title}</span>
            </li>
          ))}
        </ul>
      </section>

      {project.blockers.length > 0 ? (
        <section>
          <h2 className="text-base font-semibold text-white">Current blockers</h2>
          <div className="mt-3 space-y-2">
            {project.blockers.map((blocker) => (
              <div
                key={blocker.id}
                className="rounded-lg border border-amber-700/40 bg-amber-900/15 px-4 py-3 text-sm text-amber-100"
              >
                {blocker.description}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {project.nextAction ? (
        <section>
          <h2 className="text-base font-semibold text-white">Next action</h2>
          <div className="mt-3 rounded-lg border border-sky-700/40 bg-sky-900/15 px-4 py-3 text-sm text-slate-200">
            {project.nextAction}
            {project.nextActionDueAt ? (
              <span className="mt-1 block text-xs text-slate-400">
                Due {formatDate(project.nextActionDueAt)}
              </span>
            ) : null}
          </div>
        </section>
      ) : null}

      {scope !== "customer" && project.tasks.length > 0 ? (
        <section>
          <h2 className="text-base font-semibold text-white">Tasks</h2>
          <ul className="mt-3 space-y-2">
            {project.tasks.slice(0, 10).map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-slate-700/50 px-4 py-2.5 text-sm"
              >
                <span className="text-slate-200">{task.title}</span>
                <span className="text-xs text-slate-500 capitalize">{task.status.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
