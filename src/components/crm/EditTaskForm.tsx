"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function EditTaskForm({
  task,
}: {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    dueAt: string | null;
    priority: string | null;
  };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);

    const form = e.currentTarget;
    const data = new FormData(form);
    const dueAtRaw = String(data.get("dueAt") ?? "").trim();

    const res = await fetch("/api/v1/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: task.id,
        title: String(data.get("title") ?? "").trim(),
        description: String(data.get("description") ?? "").trim() || null,
        status: String(data.get("status") ?? "open"),
        priority: String(data.get("priority") ?? "").trim() || null,
        dueAt: dueAtRaw ? new Date(dueAtRaw).toISOString() : null,
      }),
    });

    const json = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) {
      setError(json?.error?.message ?? "Failed to update task");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block">
        <span className="text-sm text-slate-400">Task title *</span>
        <input name="title" required defaultValue={task.title} className="dg-input mt-1" />
      </label>

      <label className="block">
        <span className="text-sm text-slate-400">Details / notes</span>
        <textarea
          name="description"
          rows={7}
          defaultValue={task.description ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          placeholder="Add the context, desired outcome, next step, phone numbers, links or anything needed to complete this task."
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-sm text-slate-400">Status</span>
          <select name="status" defaultValue={task.status} className="dg-input mt-1">
            <option value="open">Open</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-slate-400">Priority</span>
          <select name="priority" defaultValue={task.priority ?? ""} className="dg-input mt-1">
            <option value="">Normal</option>
            <option value="low">Low</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-slate-400">Due</span>
          <input
            name="dueAt"
            type="datetime-local"
            defaultValue={toLocalDateTime(task.dueAt)}
            className="dg-input mt-1"
          />
        </label>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-400">Task updated.</p> : null}

      <button type="submit" disabled={pending} className="dg-btn dg-btn-primary">
        {pending ? "Saving…" : "Save task"}
      </button>
    </form>
  );
}
