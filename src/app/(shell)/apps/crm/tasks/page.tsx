import Link from "next/link";
import { listTasks, sessionHasFeature } from "@dg/platform-core";

import { CreateTaskForm } from "@/components/crm/CreateTaskForm";
import { TasksList, type TaskListItem } from "@/components/crm/TasksList";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function endOfToday() {
  const value = new Date();
  value.setHours(23, 59, 59, 999);
  return value.getTime();
}

function startOfToday() {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value.getTime();
}

export default async function CrmTasksPage() {
  const session = await getAuthorisedPlatformPageSession("crm.tasks.read");

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-sm text-slate-400">CRM Core App</p>
        </header>
        <main className="dg-page-main">
          <div className="dg-card max-w-2xl">
            <p className="text-slate-300">Sign in to view tasks.</p>
          </div>
        </main>
      </>
    );
  }

  const canWrite = sessionHasFeature(session, "crm.tasks.write");
  const [openResult, completedResult] = await Promise.all([
    listTasks({
      organisationId: session.organisationId,
      status: "open",
      limit: 100,
    }),
    listTasks({
      organisationId: session.organisationId,
      status: "completed",
      limit: 50,
    }),
  ]);

  const now = Date.now();
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const openTasks = openResult.items as TaskListItem[];
  const overdue = openTasks.filter((task) => task.dueAt && new Date(task.dueAt).getTime() < now);
  const today = openTasks.filter((task) => {
    if (!task.dueAt) return false;
    const due = new Date(task.dueAt).getTime();
    return due >= todayStart && due <= todayEnd && due >= now;
  });
  const upcoming = openTasks.filter((task) => task.dueAt && new Date(task.dueAt).getTime() > todayEnd);
  const unscheduled = openTasks.filter((task) => !task.dueAt);

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/crm/contacts" className="text-sm text-blue-400 hover:underline">
          ← CRM
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Tasks</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · {openResult.meta.total} open ·{" "}
          {completedResult.meta.total} completed
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        {canWrite ? (
          <section className="dg-card">
            <h2 className="font-semibold text-white">Create task</h2>
            <p className="mt-1 text-sm text-slate-400">
              Add enough detail that the next action is obvious when you return to it.
            </p>
            <div className="mt-4">
              <CreateTaskForm />
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="dg-card border-amber-900/50">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-white">Overdue</h2>
              <span className="text-sm text-amber-400">{overdue.length}</span>
            </div>
            <TasksList tasks={overdue} canWrite={canWrite} emptyLabel="Nothing overdue." />
          </div>

          <div className="dg-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-white">Today</h2>
              <span className="text-sm text-slate-400">{today.length}</span>
            </div>
            <TasksList tasks={today} canWrite={canWrite} emptyLabel="Nothing else due today." />
          </div>

          <div className="dg-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-white">Upcoming</h2>
              <span className="text-sm text-slate-400">{upcoming.length}</span>
            </div>
            <TasksList tasks={upcoming} canWrite={canWrite} emptyLabel="No upcoming tasks." />
          </div>

          <div className="dg-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-white">No due date</h2>
              <span className="text-sm text-slate-400">{unscheduled.length}</span>
            </div>
            <TasksList
              tasks={unscheduled}
              canWrite={canWrite}
              emptyLabel="Every open task has a due date."
            />
          </div>
        </section>

        <section className="dg-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-white">Completed</h2>
            <span className="text-sm text-slate-400">{completedResult.items.length}</span>
          </div>
          <TasksList
            tasks={completedResult.items as TaskListItem[]}
            canWrite={canWrite}
            emptyLabel="No completed tasks yet."
          />
        </section>
      </main>
    </>
  );
}
