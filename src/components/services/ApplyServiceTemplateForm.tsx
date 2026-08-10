"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type TemplateOption = {
  key: string;
  label: string;
  description: string;
};

export function ApplyServiceTemplateForm({ templates }: { templates: TemplateOption[] }) {
  const router = useRouter();
  const [key, setKey] = useState(templates[0]?.key ?? "electrician");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/v1/services/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateKey: key }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not apply template");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-sm text-slate-400">
        Service template
        <select
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        >
          {templates.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-slate-500">
        {templates.find((t) => t.key === key)?.description}
      </p>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {pending ? "Applying…" : "Apply template"}
      </button>
    </form>
  );
}
