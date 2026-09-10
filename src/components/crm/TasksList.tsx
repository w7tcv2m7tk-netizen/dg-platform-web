import Link from "next/link";
import type { TaskStatus } from "@dg/platform-core";

import { CompleteTaskButton } from "@/components/crm/CompleteTaskButton";
import { formatDateTimeInTimeZone } from "@/lib/organisation-timezone";

export type TaskListItem = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueAt: string | null;
  completedAt: string | null;
  entityType: string | null;
  entityId: string | null;
  priority: string | null;
  createdAt: string;
  relatedKind?: "Customer" | "Business" | "Opportunity" | null;
  relatedName?: string | null;
  relatedBusiness?: string | null;
  relatedHref?: string | null;
};

function isOverdue(task: TaskListItem) {
  if (task.status !== "open" || !task.dueAt) return false;
  return new Date(task.dueAt).getTime() < Date.now();
}

function priorityLabel(priority: string | null) {
  if (!priority) return "Normal priority";
  return `${priority.charAt(0).toUpperCase()}${priority.slice(1)} priority`;
}

export function TasksList({
  tasks,
  timeZone,
  canWrite = false,
  emptyLabel = "No tasks.",
}: {
  tasks: TaskListItem[];
  timeZone: string;
  canWrite?: boolean;
  emptyLabel?: string;
}) {
  if (tasks.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <ul className="mt-4 space-y-3">
      {tasks.map((task) => {
        const overdue = isOverdue(task);
        const hasRelatedContext = Boolean(task.relatedName || task.relatedBusiness);
        return (
          <li key={task.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/apps/crm/tasks/${task.id}`}
                  className="font-medium text-white hover:text-blue-300 hover:underline"
                >
                  {task.title}
                </Link>
                {task.description ? (
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-400">
                    {task.description}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">No additional details.</p>
                )}
                {hasRelatedContext ? (
                  <p className="mt-2 text-sm text-slate-300">
                    <span className="text-slate-500">{task.relatedKind ?? "Related"}:</span>{" "}
                    {task.relatedName ? (
                      task.relatedHref ? (
                        <Link href={task.relatedHref} className="font-medium text-sky-400 hover:underline">
                          {task.relatedName}
                        </Link>
                      ) : (
                        <span className="font-medium text-white">{task.relatedName}</span>
                      )
                    ) : null}
                    {task.relatedName && task.relatedBusiness ? " · " : null}
                    {task.relatedBusiness ? (
                      <span className="font-medium text-slate-200">{task.relatedBusiness}</span>
                    ) : null}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">
                  <span className={overdue ? "text-amber-400" : undefined}>
                    {task.dueAt ? formatDateTimeInTimeZone(task.dueAt, timeZone) : "No due date"}
                    {overdue ? " · overdue" : ""}
                  </span>
                  {` · ${priorityLabel(task.priority)}`}
                  {task.entityType ? ` · ${task.entityType}` : ""}
                  {task.status !== "open" ? ` · ${task.status}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/apps/crm/tasks/${task.id}`} className="dg-btn dg-btn-secondary text-xs">
                  View
                </Link>
                {canWrite && task.status === "open" ? (
                  <CompleteTaskButton taskId={task.id} />
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
