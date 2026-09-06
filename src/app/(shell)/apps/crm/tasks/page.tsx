import Link from "next/link";
import { listTasks, sessionHasFeature } from "@dg/platform-core";

import { CreateTaskForm } from "@/components/crm/CreateTaskForm";
import { TasksList } from "@/components/crm/TasksList";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

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
      limit: 50,
    }),
    listTasks({
      organisationId: session.organisationId,
      status: "completed",
      limit: 25,
    }),
  ]);

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
      <main className="dg-page-main">
        <div className="grid gap-8 lg:grid-cols-2">
          {canWrite ? (
            <div className="dg-card">
              <h2 className="font-semibold text-white">Create task</h2>
              <p className="mt-1 text-sm text-slate-400">
                Follow-ups and reminders. Link to a contact from the contact page for timeline
                activity.
              </p>
              <div className="mt-4">
                <CreateTaskForm />
              </div>
            </div>
          ) : null}

          <div className="dg-card">
            <h2 className="font-semibold text-white">Open</h2>
            <TasksList
              tasks={openResult.items}
              canWrite={canWrite}
              emptyLabel="No open tasks. Create one to track follow-through."
            />
          </div>

          <div className="dg-card lg:col-span-2">
            <h2 className="font-semibold text-white">Completed</h2>
            <TasksList
              tasks={completedResult.items}
              canWrite={canWrite}
              emptyLabel="No completed tasks yet."
            />
          </div>
        </div>
      </main>
    </>
  );
}
