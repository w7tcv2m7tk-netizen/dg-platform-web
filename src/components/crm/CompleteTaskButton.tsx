"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CompleteTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/v1/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, action: "complete" }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not complete task");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={complete}
        disabled={pending}
        className="rounded-full border border-emerald-600/60 px-3 py-1.5 text-sm text-emerald-300 hover:border-emerald-500 disabled:opacity-50"
      >
        {pending ? "Completing…" : "Complete"}
      </button>
      {error ? <p className="mt-1 text-xs text-amber-400">{error}</p> : null}
    </div>
  );
}
