import Link from "next/link";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { currentUser } from "@clerk/nextjs/server";
import { listTasks } from "@dg/platform-core";

import { CreateTaskForm } from "@/components/crm/CreateTaskForm";
import { TasksList } from "@/components/crm/TasksList";

export default async function CrmTasksPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
      })
    : null;

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-sm text-slate-400">CRM Core App</p>
        </header>
        <main className="dg-page-main">
          <div className="dg-card max-w-2xl">
            <p className="text-slate-300">Sign in with DATABASE_URL configured.</p>
          </div>
        </main>
      </>
    );
  }

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

          <div className="dg-card">
            <h2 className="font-semibold text-white">Open</h2>
            <TasksList
              tasks={openResult.items}
              emptyLabel="No open tasks. Create one to track follow-through."
            />
          </div>

          <div className="dg-card lg:col-span-2">
            <h2 className="font-semibold text-white">Completed</h2>
            <TasksList
              tasks={completedResult.items}
              emptyLabel="No completed tasks yet."
            />
          </div>
        </div>
      </main>
    </>
  );
}
