import Link from "next/link";
import { getTask, sessionHasFeature } from "@dg/platform-core";
import { notFound } from "next/navigation";

import { EditTaskForm } from "@/components/crm/EditTaskForm";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function relatedHref(entityType: string | null, entityId: string | null) {
  if (!entityType || !entityId) return null;
  if (entityType === "Contact") return `/apps/crm/contacts/${entityId}`;
  if (entityType === "Company") return `/apps/crm/companies/${entityId}`;
  if (entityType === "Opportunity") return `/apps/crm/opportunities/${entityId}`;
  if (entityType === "ServiceJob") return `/apps/services/jobs/${entityId}`;
  return null;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("en-AU") : "—";
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAuthorisedPlatformPageSession("crm.tasks.read");
  if (!session) notFound();

  const task = await getTask(session.organisationId, id);
  if (!task) notFound();

  const canWrite = sessionHasFeature(session, "crm.tasks.write");
  const href = relatedHref(task.entityType, task.entityId);

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/crm/tasks" className="text-sm text-blue-400 hover:underline">
          ← Tasks
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{task.title}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {task.status} · {task.priority || "normal priority"}
            </p>
          </div>
          {href ? (
            <Link href={href} className="dg-btn dg-btn-secondary">
              Open related {task.entityType}
            </Link>
          ) : null}
        </div>
      </header>

      <main className="dg-page-main space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Due</p>
            <p className="mt-2 text-sm text-white">{formatDate(task.dueAt)}</p>
          </div>
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Created</p>
            <p className="mt-2 text-sm text-white">{formatDate(task.createdAt)}</p>
          </div>
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Updated</p>
            <p className="mt-2 text-sm text-white">{formatDate(task.updatedAt)}</p>
          </div>
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
            <p className="mt-2 text-sm text-white">{formatDate(task.completedAt)}</p>
          </div>
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Task details</h2>
          {canWrite ? (
            <div className="mt-4">
              <EditTaskForm task={task} />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {task.description || "No additional details have been added."}
              </p>
              <p className="text-sm text-slate-500">You have read-only access to Tasks.</p>
            </div>
          )}
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Context</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Assigned user</dt>
              <dd className="mt-1 text-slate-300">{task.assignedUserId || "Unassigned"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Source</dt>
              <dd className="mt-1 text-slate-300">{task.sourceApp || "CRM"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Related record</dt>
              <dd className="mt-1 text-slate-300">
                {task.entityType && task.entityId ? `${task.entityType} · ${task.entityId}` : "None"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Task ID</dt>
              <dd className="mt-1 break-all text-slate-300">{task.id}</dd>
            </div>
          </dl>
        </section>
      </main>
    </>
  );
}
