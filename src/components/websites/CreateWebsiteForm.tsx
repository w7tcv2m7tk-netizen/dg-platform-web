"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateWebsiteForm({
  defaultBrief,
}: {
  defaultBrief?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [brief, setBrief] = useState(defaultBrief ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          brief: brief.trim() || undefined,
          generate: true,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: { website?: { id: string } };
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(json.error?.message || "Could not create website");
        setLoading(false);
        return;
      }
      const id = json.data?.website?.id;
      if (id) {
        router.push(`/apps/websites/studio/${id}`);
        router.refresh();
        return;
      }
      setError("Created but missing id");
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 max-w-xl rounded-lg border border-slate-700 bg-slate-900/40 p-5"
    >
      <div>
        <label className="block text-sm text-slate-300 mb-1">Site name (optional)</label>
        <input
          className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Uses Business Profile name if blank"
        />
      </div>
      <div>
        <label className="block text-sm text-slate-300 mb-1">Brief</label>
        <textarea
          className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white min-h-[100px]"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="e.g. Premium Currumbin agency focused on vendor appraisals…"
        />
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-[var(--org-primary,#1e3a5f)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Generating site…" : "Create from Business Profile"}
      </button>
      <p className="text-xs text-slate-500">
        Opens Studio with Home, Services, About, and Contact (form → CRM).{" "}
        <Link href="/dashboard/business" className="text-slate-300 underline">
          Edit Business Profile
        </Link>{" "}
        first for better brand colours and copy.
      </p>
    </form>
  );
}
