"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type JobType = { id: string; label: string };
type Stage = { id: string; label: string };
type ContactOption = { id: string; label: string };

export function CreateServiceJobForm({
  jobTypes,
  stages,
  contacts,
  templateKey,
  jobLabel = "Job",
}: {
  jobTypes: JobType[];
  stages: Stage[];
  contacts: ContactOption[];
  templateKey?: string | null;
  jobLabel?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: String(fd.get("title") ?? ""),
      jobType: String(fd.get("jobType") ?? "") || undefined,
      stage: String(fd.get("stage") ?? "") || undefined,
      contactId: String(fd.get("contactId") ?? "") || undefined,
      siteAddress: String(fd.get("siteAddress") ?? "") || undefined,
      description: String(fd.get("description") ?? "") || undefined,
      scheduledStartAt: String(fd.get("scheduledStartAt") ?? "")
        ? new Date(String(fd.get("scheduledStartAt"))).toISOString()
        : undefined,
      templateKey: templateKey || undefined,
    };

    const res = await fetch("/api/v1/services/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not create job");
      return;
    }
    setOpen(false);
    e.currentTarget.reset();
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
      >
        New {jobLabel.toLowerCase()}
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">New {jobLabel.toLowerCase()}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          Cancel
        </button>
      </div>
      <input
        name="title"
        required
        placeholder="Title"
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          name="jobType"
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="">Job type</option>
          {jobTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          name="stage"
          defaultValue={stages[0]?.id}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <select
        name="contactId"
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
      >
        <option value="">Customer (optional)</option>
        {contacts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <input
        name="siteAddress"
        placeholder="Site address"
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
      />
      <input
        name="scheduledStartAt"
        type="datetime-local"
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
      />
      <textarea
        name="description"
        rows={2}
        placeholder="Description"
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
      />
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {pending ? "Creating…" : `Create ${jobLabel.toLowerCase()}`}
      </button>
    </form>
  );
}
