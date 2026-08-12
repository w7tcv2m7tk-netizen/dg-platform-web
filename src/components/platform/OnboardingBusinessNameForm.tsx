"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OnboardingBusinessNameForm({
  currentName,
}: {
  currentName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a business name");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/org/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: trimmed,
          tradingName: trimmed,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          json?.error?.message ?? "Could not save business name. Try again.",
        );
        setSaving(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — try again");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-sm text-slate-300">
        Business name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={currentName || "Acme Realty"}
          className="mt-1 w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
          autoComplete="organization"
          disabled={saving}
        />
      </label>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save business name"}
      </button>
    </form>
  );
}
