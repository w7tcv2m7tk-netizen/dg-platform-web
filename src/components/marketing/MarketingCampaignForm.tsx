"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { usePendingAction } from "@/hooks/usePendingAction";

export function MarketingCampaignForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const { pending, error, setError, run, startTransition } = usePendingAction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      const res = await fetch("/api/v1/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, goal }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (!res.ok) {
        const message = json.error?.message ?? "Could not create campaign brief";
        setError(message);
        throw new Error(message);
      }
      setTitle("");
      setGoal("");
      startTransition(() => {
        router.refresh();
      });
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="campaign-title" className="block text-sm text-slate-400">
          Campaign title
        </label>
        <input
          id="campaign-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          placeholder="Spring vendor drive"
        />
      </div>
      <div>
        <label htmlFor="campaign-goal" className="block text-sm text-slate-400">
          Goal
        </label>
        <textarea
          id="campaign-goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          placeholder="What should this campaign achieve?"
        />
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Create campaign brief"}
      </button>
    </form>
  );
}
