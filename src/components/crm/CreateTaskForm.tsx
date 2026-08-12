"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateTaskForm({
  entityType,
  entityId,
  compact = false,
}: {
  entityType?: string;
  entityId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const dueAtRaw = String(data.get("dueAt") ?? "").trim();

    if (!title) {
      setPending(false);
      setError("Title is required");
      return;
    }

    const res = await fetch("/api/v1/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        dueAt: dueAtRaw ? new Date(dueAtRaw).toISOString() : undefined,
        entityType,
        entityId,
        sourceApp: "crm",
      }),
    });

    const json = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) {
      setError(json?.error?.message ?? "Failed to create task");
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className={compact ? "mt-4 space-y-3 border-t border-slate-800 pt-4" : "space-y-4"}
    >
      <label className="block">
        <span className="text-sm text-slate-400">Title *</span>
        <input
          name="title"
          required
          className="dg-input mt-1"
          placeholder="Follow up call"
        />
      </label>
      {!compact ? (
        <label className="block">
          <span className="text-sm text-slate-400">Description</span>
          <textarea
            name="description"
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            placeholder="Optional context"
          />
        </label>
      ) : null}
      <label className="block">
        <span className="text-sm text-slate-400">Due</span>
        <input name="dueAt" type="datetime-local" className="dg-input mt-1" />
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="dg-btn dg-btn-primary"
      >
        {pending ? "Saving…" : "Create task"}
      </button>
    </form>
  );
}
