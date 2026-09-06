import Link from "next/link";
import { listCommandCentreOpenTasksDue } from "@dg/platform-core";

import { CompleteCommandTaskButton } from "@/components/command/CompleteCommandTaskButton";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

export const dynamic = "force-dynamic";

export default async function CommandCentreTasksPage() {
  await requirePlatformOperatorContext();
  const data = process.env.DATABASE_URL
    ? await listCommandCentreOpenTasksDue({ limit: 100 })
    : { items: [], total: 0 };

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">DigitalGate CRM tasks due</h1>
        <p className="mt-1 text-sm text-slate-400">
          Open follow-ups on the DigitalGate operator organisation only. Customer workspaces (e.g.
          Currumbin Valley Hideaway) keep their own CRM Tasks list when you switch into that org.
          Delivery implementation tasks live under{" "}
          <Link href="/command/delivery/tasks" className="text-sky-400 hover:underline">
            Delivery → My Tasks
          </Link>
          .
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            DigitalGate operator org · open &amp; due
          </p>
          <p className="mt-1 text-3xl font-semibold text-white">{data.total}</p>
        </div>

        {data.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 px-6 py-14 text-center text-sm text-slate-400">
            No open DigitalGate CRM tasks due today or overdue.
          </div>
        ) : (
          <ul className="space-y-2">
            {data.items.map((task) => (
              <li
                key={task.id}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  task.overdue
                    ? "border-rose-700/40 bg-rose-900/10"
                    : "border-slate-700/60 bg-slate-800/40"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium text-white">{task.title}</p>
                      {task.dueAt ? (
                        <p className={task.overdue ? "text-rose-300" : "text-slate-400"}>
                          {task.overdue ? "Overdue · " : "Due · "}
                          {new Date(task.dueAt).toLocaleDateString("en-AU")}
                        </p>
                      ) : null}
                    </div>
                    <p className="mt-1 text-slate-400">
                      {task.entityType ? `${task.entityType}` : null}
                      {task.priority ? ` · ${task.priority}` : null}
                      {task.sourceApp ? ` · ${task.sourceApp}` : null}
                    </p>
                    {task.description ? (
                      <p className="mt-2 text-slate-500 line-clamp-2">{task.description}</p>
                    ) : null}
                  </div>
                  <CompleteCommandTaskButton taskId={task.id} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {data.total > data.items.length ? (
          <p className="text-xs text-slate-500">
            Showing {data.items.length} of {data.total} — oldest due dates first.
          </p>
        ) : null}
      </main>
    </>
  );
}
