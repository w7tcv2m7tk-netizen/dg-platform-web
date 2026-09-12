"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { zonedDateTimeLocalToUtc } from "@/lib/services-dates";

type JobType = { id: string; label: string };
type Stage = { id: string; label: string };
type ContactOption = { id: string; label: string };
type JobField = { id: string; label: string; type: "text" | "textarea" | "boolean" };
type MemberOption = { clerkUserId: string; label: string };

export function CreateServiceJobForm({
  jobTypes,
  stages,
  contacts,
  jobFields = [],
  members = [],
  templateKey,
  jobLabel = "Job",
  timeZone,
}: {
  jobTypes: JobType[];
  stages: Stage[];
  contacts: ContactOption[];
  jobFields?: JobField[];
  members?: MemberOption[];
  templateKey?: string | null;
  jobLabel?: string;
  timeZone: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    const metadata: Record<string, unknown> = {};
    for (const field of jobFields) {
      if (field.type === "boolean") {
        if (fd.get(field.id) === "on") metadata[field.id] = true;
      } else {
        const value = String(fd.get(field.id) ?? "").trim();
        if (value) metadata[field.id] = value;
      }
    }

    const startRaw = String(fd.get("scheduledStartAt") ?? "");
    const endRaw = String(fd.get("scheduledEndAt") ?? "");
    const assigneeRaw = String(fd.get("assignedUserId") ?? "");
    const start = startRaw ? zonedDateTimeLocalToUtc(startRaw, timeZone) : null;
    const end = endRaw ? zonedDateTimeLocalToUtc(endRaw, timeZone) : null;
    if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
      setPending(false);
      setError("Invalid scheduled date/time");
      return;
    }

    const payload = {
      title: String(fd.get("title") ?? ""),
      jobType: String(fd.get("jobType") ?? "") || undefined,
      stage: String(fd.get("stage") ?? "") || undefined,
      contactId: String(fd.get("contactId") ?? "") || undefined,
      siteAddress: String(fd.get("siteAddress") ?? "") || undefined,
      description: String(fd.get("description") ?? "") || undefined,
      scheduledStartAt: start?.toISOString(),
      scheduledEndAt: end?.toISOString(),
      assignedUserId: assigneeRaw || undefined,
      templateKey: templateKey || undefined,
      metadata: Object.keys(metadata).length ? metadata : undefined,
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
    form.reset();
    const createdId = json.data?.id as string | undefined;
    if (createdId) {
      router.push(`/apps/services/jobs/${createdId}`);
      return;
    }
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
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
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-white">New {jobLabel.toLowerCase()}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex min-h-11 items-center px-2 text-xs text-slate-500 hover:text-slate-300"
        >
          Cancel
        </button>
      </div>
      <input
        name="title"
        required
        placeholder="Title"
        className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          name="jobType"
          className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
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
          className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
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
        className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
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
        className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-slate-500">
          Start ({timeZone.replace(/_/g, " ")})
          <input
            name="scheduledStartAt"
            type="datetime-local"
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-slate-500">
          End ({timeZone.replace(/_/g, " ")})
          <input
            name="scheduledEndAt"
            type="datetime-local"
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>
      {members.length > 0 ? (
        <select
          name="assignedUserId"
          className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="">Assignee (optional)</option>
          {members.map((m) => (
            <option key={m.clerkUserId} value={m.clerkUserId}>
              {m.label}
            </option>
          ))}
        </select>
      ) : null}
      <textarea
        name="description"
        rows={2}
        placeholder="Description"
        className="min-h-20 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
      />
      {jobFields.map((field) => {
        if (field.type === "boolean") {
          return (
            <label key={field.id} className="flex min-h-11 items-center gap-3 text-sm text-slate-300">
              <input type="checkbox" name={field.id} className="h-5 w-5 rounded border-slate-600" />
              {field.label}
            </label>
          );
        }
        if (field.type === "textarea") {
          return (
            <textarea
              key={field.id}
              name={field.id}
              rows={2}
              placeholder={field.label}
              className="min-h-20 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          );
        }
        return (
          <input
            key={field.id}
            name={field.id}
            placeholder={field.label}
            className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
        );
      })}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {pending ? "Creating…" : `Create ${jobLabel.toLowerCase()}`}
      </button>
    </form>
  );
}
