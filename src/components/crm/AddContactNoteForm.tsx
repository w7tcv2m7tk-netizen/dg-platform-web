"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddContactNoteForm({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const body = String(data.get("body") ?? "").trim();

    if (!body) {
      setPending(false);
      setError("Note cannot be empty");
      return;
    }

    const res = await fetch("/api/v1/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: "Contact",
        entityId: contactId,
        activityType: "note",
        title: "Note added",
        body,
        sourceApp: "crm",
      }),
    });

    setPending(false);

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error?.message ?? "Failed to add note");
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3 border-t border-slate-800 pt-4">
      <label className="block">
        <span className="text-sm text-slate-400">Add note</span>
        <textarea
          name="body"
          rows={3}
          required
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          placeholder="Call summary, follow-up reminder…"
        />
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add to timeline"}
      </button>
    </form>
  );
}
