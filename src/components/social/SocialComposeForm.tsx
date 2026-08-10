"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { usePendingAction } from "@/hooks/usePendingAction";

export function SocialComposeForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const { pending, error, setError, run, startTransition } = usePendingAction();

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      const res = await fetch("/api/v1/social/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (!res.ok) {
        const message = json.error?.message ?? "Could not save draft";
        setError(message);
        throw new Error(message);
      }
      setTitle("");
      setBody("");
      startTransition(() => {
        router.refresh();
      });
    });
  }

  async function aiDraft() {
    await run(async () => {
      const res = await fetch("/api/v1/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "social_post",
          prompt: title.trim() || "Draft a short social post for our business",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: { output?: string };
        error?: { message?: string };
      };
      if (!res.ok) {
        const message = json.error?.message ?? "AI assist unavailable";
        setError(message);
        throw new Error(message);
      }
      if (json.data?.output) {
        setBody(json.data.output);
      }
    });
  }

  return (
    <form onSubmit={saveDraft} className="space-y-4">
      <div>
        <label htmlFor="draft-title" className="block text-sm text-slate-400">
          Title
        </label>
        <input
          id="draft-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          placeholder="Campaign or post title"
        />
      </div>
      <div>
        <label htmlFor="draft-body" className="block text-sm text-slate-400">
          Body
        </label>
        <textarea
          id="draft-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          placeholder="Write your post…"
        />
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void aiDraft()}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-600 hover:text-white disabled:opacity-60"
        >
          AI draft
        </button>
      </div>
    </form>
  );
}
