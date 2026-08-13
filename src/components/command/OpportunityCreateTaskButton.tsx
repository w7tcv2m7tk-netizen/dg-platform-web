"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OpportunityCreateTaskButton({
  organisationId,
  opportunityId,
  title,
  description,
}: {
  organisationId?: string;
  opportunityId: string;
  title: string;
  description?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!organisationId) return null;

  async function onClick() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/command/opportunities/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationId,
          opportunityId,
          title: title.slice(0, 180),
          description,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(json.error?.message || "Could not create task");
        setPending(false);
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Network error");
    }
    setPending(false);
  }

  if (done) {
    return <span className="text-xs text-emerald-400">Task created</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => void onClick()}
        className="rounded-full border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-sky-500/50 hover:text-white disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create task"}
      </button>
      {error ? <span className="text-[11px] text-rose-400">{error}</span> : null}
    </div>
  );
}
