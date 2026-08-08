"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function QueueReviewRequestButton({
  candidateId,
  contactId,
}: {
  candidateId: string;
  contactId?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onQueue() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/reviews/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, contactId, channel: "email" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(json?.error?.message ?? "Could not queue request");
        return;
      }
      setMessage("Queued on timeline");
      router.refresh();
    } catch {
      setMessage("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onQueue}
        disabled={pending}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {pending ? "Queuing…" : "Queue request"}
      </button>
      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
