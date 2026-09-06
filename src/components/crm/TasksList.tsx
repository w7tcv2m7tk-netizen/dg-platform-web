import type { TaskStatus } from "@dg/platform-core";

import { CompleteTaskButton } from "@/components/crm/CompleteTaskButton";

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
};

function formatDue(dueAt: string | null) {
  if (!dueAt) return "No due date";
  return new Date(dueAt).toLocaleString("en-AU");
}

function isOverdue(task: TaskListItem) {
  if (task.status !== "open" || !task.dueAt) return false;
  return new Date(task.dueAt).getTime() < Date.now();
}

export function TasksList({
  tasks,
  canWrite = false,
  emptyLabel = "No tasks.",
}: {
  tasks: TaskListItem[];
  canWrite?: boolean;
  emptyLabel?: string;
}) {
  if (tasks.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <ul className="mt-4 divide-y divide-slate-800">
      {tasks.map((task) => {
        const overdue = isOverdue(task);
        return (
          <li
            key={task.id}
            className="flex flex-wrap items-start justify-between gap-3 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-white">{task.title}</p>
              {task.description ? (
                <p className="mt-1 text-sm text-slate-400">{task.description}</p>
              ) : null}
              <p className="mt-1 text-sm text-slate-500">
                <span className={overdue ? "text-amber-400" : undefined}>
                  {formatDue(task.dueAt)}
                  {overdue ? " · overdue" : ""}
                </span>
                {task.entityType ? ` · ${task.entityType}` : ""}
                {task.priority ? ` · ${task.priority}` : ""}
                {task.status !== "open" ? ` · ${task.status}` : ""}
              </p>
            </div>
            {canWrite && task.status === "open" ? (
              <CompleteTaskButton taskId={task.id} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
